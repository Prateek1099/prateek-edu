import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin, isTeacher } from "@/lib/roles";

type SessionUser = {
  id: string;
  email: string;
  role: string;
  workspaceId?: string | null;
  workspaceStatus?: string | null;
};

async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user?.email || !user?.id) return null;
  return user;
}

/** Require SUPER_ADMIN role. Returns the session user or throws. */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || !isSuperAdmin(user.role)) {
    throw new Error("Unauthorized: Super Admin access required");
  }
  return user;
}

/** Require TEACHER role with an ACTIVE workspace. Returns the session user or throws. */
export async function requireActiveWorkspace(): Promise<SessionUser & { workspaceId: string }> {
  const user = await getSessionUser();
  if (!user || !isTeacher(user.role)) {
    throw new Error("Unauthorized: Teacher access required");
  }
  if (!user.workspaceId) {
    throw new Error("Unauthorized: No workspace found");
  }
  if (user.workspaceStatus !== "ACTIVE") {
    throw new Error("Unauthorized: Workspace is not active");
  }
  return user as SessionUser & { workspaceId: string };
}

/** Require any authenticated user. Returns the session user or throws. */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Unauthorized: Authentication required");
  }
  return user;
}

// Backward compatibility — used by existing admin server actions
export async function rejectIfNotAdmin(): Promise<string | null> {
  const user = await getSessionUser();
  if (!user || !isSuperAdmin(user.role)) {
    return "Unauthorized";
  }
  return null;
}
