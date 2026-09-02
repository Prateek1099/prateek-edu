import "server-only";

import { prisma } from "@/lib/prisma";
import {
  getStudentProfileAnswerReviewState,
  summarizeStudentProfileAssignments,
  summarizeStudentSnapshotMistakes,
} from "@/lib/teacher-class-student-profile-rules";
import { requireWorkspaceSubjectScope } from "@/lib/workspace-academic-scope";
import { getWorkspaceClassAssignmentTracking } from "@/lib/workspace-assignment-tracking";

export async function getTeacherClassStudentProfile({
  workspaceId,
  classId,
  studentId,
  now = new Date(),
}: {
  workspaceId: string;
  classId: string;
  studentId: string;
  now?: Date;
}) {
  const membership = await prisma.classStudent.findFirst({
    where: {
      classId,
      studentId,
      status: "ACTIVE",
      class: {
        workspaceId,
        workspace: { status: "ACTIVE" },
      },
      student: { role: "STUDENT" },
    },
    select: {
      id: true,
      status: true,
      enrolledAt: true,
      student: {
        select: { id: true, name: true, email: true, image: true },
      },
      class: {
        select: {
          id: true,
          name: true,
          status: true,
          academicYear: true,
          subjectId: true,
          subject: { select: { id: true, name: true } },
          qualification: { select: { id: true, title: true } },
        },
      },
    },
  });

  if (!membership) return null;
  await requireWorkspaceSubjectScope(workspaceId, membership.class.subjectId);

  const trackedAssignments = await getWorkspaceClassAssignmentTracking({
    workspaceId,
    classId,
    now,
  });

  const assignments = trackedAssignments.flatMap((assignment) => {
    const recipient = assignment.recipients.find(
      (candidate) => candidate.studentId === studentId,
    );
    if (!recipient) return [];

    const profileAssignment = { ...assignment, recipient };
    return [
      {
        ...profileAssignment,
        answerReviewState: getStudentProfileAnswerReviewState(profileAssignment),
      },
    ];
  });

  return {
    membership: {
      id: membership.id,
      status: membership.status,
      enrolledAt: membership.enrolledAt,
    },
    class: membership.class,
    student: membership.student,
    assignments,
    summary: summarizeStudentProfileAssignments(assignments),
    mistakes: summarizeStudentSnapshotMistakes(assignments),
  };
}
