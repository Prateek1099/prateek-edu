export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import WorkspaceClassesClient from "./WorkspaceClassesClient";

export default async function WorkspaceClassesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user as any;

  const workspace = await prisma.workspace.findUnique({
    where: { ownerId: user.id },
  });
  if (!workspace) redirect("/dashboard");

  const classes = await prisma.class.findMany({
    where: { workspaceId: workspace.id },
    include: {
      subject: { select: { name: true } },
      qualification: { select: { title: true } },
      _count: { select: { students: { where: { status: "ACTIVE" } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const subjects = await prisma.subject.findMany({
    where: { status: "PUBLISHED" },
    include: { qualification: { include: { board: true } } },
    orderBy: [{ qualification: { board: { title: "asc" } } }, { name: "asc" }],
  });

  const qualifications = await prisma.qualification.findMany({
    where: { status: "PUBLISHED" },
    include: { board: true },
    orderBy: [{ board: { title: "asc" } }, { sortOrder: "asc" }],
  });

  return <WorkspaceClassesClient classes={classes} subjects={subjects} qualifications={qualifications} />;
}
