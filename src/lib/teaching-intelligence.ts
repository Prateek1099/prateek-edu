import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-role";
import {
  INSIGHTS_ALLOWED_CHALLENGE_TYPES,
  buildScopedInsights,
  getInsightsDateWindow,
  type InsightAttemptRecord,
  type InsightReflectionRecord,
  type InsightsScope,
  type ScopedInsights,
} from "@/lib/admin-insights-rules";

export type InsightFilterOptions = {
  boards: { id: string; label: string }[];
  qualifications: { id: string; boardId: string; label: string }[];
  subjects: { id: string; qualificationId: string; label: string }[];
  topics: { id: string; subjectId: string; label: string }[];
  challenges: { id: string; subjectId: string; topicId: string | null; label: string }[];
};

export type ScopedTeachingInsights = ScopedInsights & {
  scope: {
    boardId: string;
    boardLabel: string;
    qualificationId: string;
    qualificationLabel: string;
    subjectId: string;
    subjectLabel: string;
    topicId: string | null;
    topicLabel: string | null;
    challengeId: string | null;
    challengeLabel: string | null;
    dateRange: "7" | "30";
  };
};

export class InsightsScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsightsScopeError";
  }
}

export async function getAdminInsightsFilterOptions(): Promise<InsightFilterOptions> {
  await requireSuperAdmin();

  const boards = await prisma.board.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      qualifications: {
        where: { status: "PUBLISHED" },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        select: {
          id: true,
          title: true,
          subjects: {
            where: { status: "PUBLISHED" },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: {
              id: true,
              name: true,
              code: true,
              topics: {
                where: { status: "PUBLISHED" },
                orderBy: [{ sortOrder: "asc" }, { topicName: "asc" }],
                select: { id: true, topicName: true },
              },
              challenges: {
                where: {
                  workspaceId: null,
                  isPublished: true,
                  type: { in: [...INSIGHTS_ALLOWED_CHALLENGE_TYPES] },
                },
                orderBy: { title: "asc" },
                select: { id: true, title: true, topicId: true },
              },
            },
          },
        },
      },
    },
  });

  const options: InsightFilterOptions = {
    boards: [],
    qualifications: [],
    subjects: [],
    topics: [],
    challenges: [],
  };

  for (const board of boards) {
    options.boards.push({ id: board.id, label: board.title });
    for (const qualification of board.qualifications) {
      options.qualifications.push({ id: qualification.id, boardId: board.id, label: qualification.title });
      for (const subject of qualification.subjects) {
        options.subjects.push({
          id: subject.id,
          qualificationId: qualification.id,
          label: subject.code ? `${subject.name} (${subject.code})` : subject.name,
        });
        for (const topic of subject.topics) {
          options.topics.push({ id: topic.id, subjectId: subject.id, label: topic.topicName });
        }
        for (const challenge of subject.challenges) {
          options.challenges.push({
            id: challenge.id,
            subjectId: subject.id,
            topicId: challenge.topicId,
            label: challenge.title,
          });
        }
      }
    }
  }

  return options;
}

async function validateInsightsScope(scope: InsightsScope) {
  const subject = await prisma.subject.findFirst({
    where: {
      id: scope.subjectId,
      qualificationId: scope.qualificationId,
      status: "PUBLISHED",
      qualification: {
        id: scope.qualificationId,
        boardId: scope.boardId,
        status: "PUBLISHED",
        board: { id: scope.boardId, status: "PUBLISHED" },
      },
    },
    select: {
      id: true,
      name: true,
      code: true,
      qualification: {
        select: {
          id: true,
          title: true,
          board: { select: { id: true, title: true } },
        },
      },
    },
  });

  if (!subject) {
    throw new InsightsScopeError("The selected board, qualification, and subject do not form a valid published academic scope.");
  }

  const [topic, challenge] = await Promise.all([
    scope.topicId
      ? prisma.topic.findFirst({
          where: { id: scope.topicId, subjectId: subject.id, status: "PUBLISHED" },
          select: { id: true, topicName: true },
        })
      : null,
    scope.challengeId
      ? prisma.challenge.findFirst({
          where: {
            id: scope.challengeId,
            subjectId: subject.id,
            workspaceId: null,
            isPublished: true,
            type: { in: [...INSIGHTS_ALLOWED_CHALLENGE_TYPES] },
          },
          select: { id: true, title: true, topicId: true },
        })
      : null,
  ]);

  if (scope.topicId && !topic) {
    throw new InsightsScopeError("The selected topic does not belong to the selected published subject.");
  }
  if (scope.challengeId && !challenge) {
    throw new InsightsScopeError("The selected challenge is not an allowed published global challenge for this subject.");
  }
  if (topic && challenge && challenge.topicId !== topic.id) {
    throw new InsightsScopeError("The selected challenge does not belong to the selected topic.");
  }

  return { subject, topic, challenge };
}

export async function getScopedTeachingInsights(scope: InsightsScope): Promise<ScopedTeachingInsights> {
  await requireSuperAdmin();
  const validated = await validateInsightsScope(scope);
  const now = new Date();
  const { start, end } = getInsightsDateWindow(scope.dateRange, now);

  const [attemptRows, reflectionRows] = await Promise.all([
    prisma.challengeAttempt.findMany({
      where: {
        completedAt: { gte: start, lte: end },
        challenge: {
          subjectId: scope.subjectId,
          workspaceId: null,
          isPublished: true,
          type: { in: [...INSIGHTS_ALLOWED_CHALLENGE_TYPES] },
          ...(scope.topicId ? { topicId: scope.topicId } : {}),
          ...(scope.challengeId ? { id: scope.challengeId } : {}),
        },
      },
      orderBy: { completedAt: "desc" },
      select: {
        id: true,
        userId: true,
        percentage: true,
        answers: true,
        completedAt: true,
        user: { select: { name: true, email: true } },
        challenge: {
          select: {
            id: true,
            title: true,
            type: true,
            workspaceId: true,
            isPublished: true,
            topicId: true,
            topic: { select: { topicName: true } },
            questions: { select: { id: true, correctAnswer: true } },
            subject: {
              select: {
                id: true,
                qualification: { select: { id: true, board: { select: { id: true } } } },
              },
            },
          },
        },
      },
    }),
    scope.challengeId
      ? Promise.resolve([])
      : prisma.studentReflection.findMany({
          where: {
            subjectId: scope.subjectId,
            createdAt: { gte: start, lte: end },
            ...(scope.topicId ? { topicId: scope.topicId } : {}),
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            userId: true,
            topicId: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
            subject: {
              select: {
                id: true,
                qualification: { select: { id: true, board: { select: { id: true } } } },
              },
            },
          },
        }),
  ]);

  const attempts: InsightAttemptRecord[] = attemptRows.map((attempt) => ({
    id: attempt.id,
    userId: attempt.userId,
    userName: attempt.user.name,
    userEmail: attempt.user.email,
    boardId: attempt.challenge.subject.qualification.board.id,
    qualificationId: attempt.challenge.subject.qualification.id,
    subjectId: attempt.challenge.subject.id,
    challengeId: attempt.challenge.id,
    challengeTitle: attempt.challenge.title,
    challengeType: attempt.challenge.type,
    workspaceId: attempt.challenge.workspaceId,
    isPublished: attempt.challenge.isPublished,
    topicId: attempt.challenge.topicId,
    topicName: attempt.challenge.topic?.topicName ?? null,
    percentage: attempt.percentage,
    answers: attempt.answers,
    completedAt: attempt.completedAt.toISOString(),
    questions: attempt.challenge.questions,
  }));

  const reflections: InsightReflectionRecord[] = reflectionRows.flatMap((reflection) =>
    reflection.subject
      ? [{
          id: reflection.id,
          userId: reflection.userId,
          userName: reflection.user.name,
          userEmail: reflection.user.email,
          boardId: reflection.subject.qualification.board.id,
          qualificationId: reflection.subject.qualification.id,
          subjectId: reflection.subject.id,
          topicId: reflection.topicId,
          createdAt: reflection.createdAt.toISOString(),
        }]
      : [],
  );

  const result = buildScopedInsights({ attempts, reflections }, scope, now);

  return {
    ...result,
    scope: {
      boardId: validated.subject.qualification.board.id,
      boardLabel: validated.subject.qualification.board.title,
      qualificationId: validated.subject.qualification.id,
      qualificationLabel: validated.subject.qualification.title,
      subjectId: validated.subject.id,
      subjectLabel: validated.subject.code
        ? `${validated.subject.name} (${validated.subject.code})`
        : validated.subject.name,
      topicId: validated.topic?.id ?? null,
      topicLabel: validated.topic?.topicName ?? null,
      challengeId: validated.challenge?.id ?? null,
      challengeLabel: validated.challenge?.title ?? null,
      dateRange: scope.dateRange,
    },
  };
}
