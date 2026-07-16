export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import WorkspaceSettingsClient from "./WorkspaceSettingsClient";

export default async function WorkspaceSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user as any;

  const workspace = await prisma.workspace.findUnique({ where: { ownerId: user.id } });
  if (!workspace) redirect("/dashboard");

  return <WorkspaceSettingsClient workspace={workspace} />;
}
