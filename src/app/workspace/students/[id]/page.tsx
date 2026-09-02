export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireActiveWorkspace } from "@/lib/require-role";
import { listActiveWorkspaceSubjectIds } from "@/lib/workspace-academic-scope";

export default async function LegacyWorkspaceStudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: studentId } = await params;
  const user = await requireActiveWorkspace();
  const subjectIds = await listActiveWorkspaceSubjectIds(user.workspaceId);

  const membership = await prisma.classStudent.findFirst({
    where: {
      studentId,
      status: "ACTIVE",
      student: { role: "STUDENT" },
      class: {
        workspaceId: user.workspaceId,
        status: "ACTIVE",
        subjectId: { in: subjectIds },
        workspace: { status: "ACTIVE" },
      },
    },
    select: { classId: true },
    orderBy: { enrolledAt: "desc" },
  });

  if (!membership) notFound();
  redirect(`/workspace/classes/${membership.classId}/students/${studentId}`);
}
