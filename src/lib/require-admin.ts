import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";

/** Returns error message string if forbidden, otherwise null */
export async function rejectIfNotAdmin(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string | null; role?: string } | undefined;
  const role = user?.role;
  if (!user?.email || !isAdminRole(role)) {
    return "Unauthorized";
  }
  return null;
}
