export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import WorkspaceContentClient from "./WorkspaceContentClient";

export default async function WorkspaceContentPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user as any;

  const workspace = await prisma.workspace.findUnique({ where: { ownerId: user.id } });
  if (!workspace) redirect("/dashboard");

  const content = await prisma.workspaceContent.findMany({
    where: { workspaceId: workspace.id },
    include: {
      subject: { select: { name: true } },
      topic: { select: { topicName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const subjects = await prisma.subject.findMany({
    where: { status: "PUBLISHED" },
    include: { qualification: { include: { board: true } } },
    orderBy: [{ qualification: { board: { title: "asc" } } }, { name: "asc" }],
  });

  return <WorkspaceContentClient content={content} subjects={subjects} />;
}
