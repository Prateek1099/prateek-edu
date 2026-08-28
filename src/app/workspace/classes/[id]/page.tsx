export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireActiveWorkspace } from "@/lib/require-role";
import { requireWorkspaceSubjectScope } from "@/lib/workspace-academic-scope";
import { getWorkspaceClassAssignmentTracking } from "@/lib/workspace-assignment-tracking";

import ClassDetailClient from "./ClassDetailClient";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireActiveWorkspace();

  const cls = await prisma.class.findFirst({
    where: { id, workspaceId: user.workspaceId },
    include: {
      subject: true,
      qualification: true,
      students: {
        where: { status: "ACTIVE" },
        include: {
          student: { select: { id: true, name: true, email: true, createdAt: true } },
        },
        orderBy: { enrolledAt: "desc" },
      },
    },
  });

  if (!cls) notFound();
  await requireWorkspaceSubjectScope(user.workspaceId, cls.subjectId);

  const [availableChallenges, assignments] = await Promise.all([
    prisma.challenge.findMany({
      where: {
        workspaceId: user.workspaceId,
        isPublished: true,
        type: { in: ["WORKSHEET", "PDF_WORKSHEET", "QUICK_PRACTICE"] },
        subjectId: cls.subjectId!,
      },
      select: { id: true, title: true, type: true },
      orderBy: { createdAt: "desc" },
    }),
    getWorkspaceClassAssignmentTracking({
      workspaceId: user.workspaceId,
      classId: cls.id,
    }),
  ]);

  const activeChallengeIds = new Set(
    assignments
      .filter((assignment) => assignment.status === "ACTIVE")
      .map((assignment) => assignment.challenge.id),
  );

  return (
    <ClassDetailClient
      classData={cls}
      availableChallenges={availableChallenges.filter(
        (challenge) => !activeChallengeIds.has(challenge.id),
      )}
      assignments={assignments}
    />
  );
}
