import "server-only";

import { prisma } from "@/lib/prisma";
import {
  decideChallengeAccess,
  type ChallengeAccessAction,
  type ChallengeAccessDecision,
} from "@/lib/challenge-access-rules";

type ChallengeAccessInput = {
  userId: string;
  role: string;
  challengeId: string;
  action: ChallengeAccessAction;
};

export type ChallengeAccessResult = ChallengeAccessDecision & {
  challenge: {
    id: string;
    type: string;
    isPublished: boolean;
    workspaceId: string | null;
  } | null;
};

/**
 * Central authorization boundary for Challenge-backed resources.
 * User.workspaceId is intentionally not read here: student access requires an
 * exact assignment and an active class membership in the content workspace.
 */
export async function canAccessChallengeOrWorksheet({
  userId,
  role,
  challengeId,
  action,
}: ChallengeAccessInput): Promise<ChallengeAccessResult> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: {
      id: true,
      type: true,
      isPublished: true,
      workspaceId: true,
      workspace: { select: { ownerId: true, status: true } },
    },
  });

  if (!challenge) {
    return { allowed: false, reason: "unpublished", challenge: null };
  }

  let hasExactAssignment = false;
  let hasActiveWorkspaceMembership = false;

  if (role === "STUDENT" && challenge.workspaceId) {
    const [assignment, membership] = await Promise.all([
      prisma.worksheetAssignment.findUnique({
        where: {
          userId_worksheetId: {
            userId,
            worksheetId: challenge.id,
          },
        },
        select: { id: true },
      }),
      prisma.classStudent.findFirst({
        where: {
          studentId: userId,
          status: "ACTIVE",
          class: {
            workspaceId: challenge.workspaceId,
            status: "ACTIVE",
            workspace: { status: "ACTIVE" },
          },
        },
        select: { id: true },
      }),
    ]);
    hasExactAssignment = Boolean(assignment);
    hasActiveWorkspaceMembership = Boolean(membership);
  }

  const decision = decideChallengeAccess({
    role,
    action,
    isPublished: challenge.isPublished,
    challengeType: challenge.type,
    workspaceId: challenge.workspaceId,
    ownsActiveWorkspace:
      role === "TEACHER" &&
      challenge.workspace?.ownerId === userId &&
      challenge.workspace.status === "ACTIVE",
    hasExactAssignment,
    hasActiveWorkspaceMembership,
  });

  return {
    ...decision,
    challenge: {
      id: challenge.id,
      type: challenge.type,
      isPublished: challenge.isPublished,
      workspaceId: challenge.workspaceId,
    },
  };
}
