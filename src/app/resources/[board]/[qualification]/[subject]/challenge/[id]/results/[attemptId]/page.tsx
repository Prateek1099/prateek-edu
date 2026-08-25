import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import ChallengeResults from "./ChallengeResults";
import { canAccessChallengeOrWorksheet } from "@/lib/challenge-access";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{
    board: string;
    qualification: string;
    subject: string;
    id: string;
    attemptId: string;
  }>;
}) {
  const { board, qualification, subject, id, attemptId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const sessionUser = session.user as typeof session.user & { id?: string; role?: string };
  const userId = sessionUser.id;
  if (!userId) redirect("/login");

  const attempt = await prisma.challengeAttempt.findUnique({
    where: { id: attemptId },
    include: {
      challenge: {
        include: {
          questions: { orderBy: { sortOrder: "asc" } },
          subject: true,
          topic: true,
        },
      },
    },
  });

  if (!attempt || attempt.userId !== userId || attempt.challengeId !== id) {
    notFound();
  }

  const access = await canAccessChallengeOrWorksheet({
    userId,
    role: sessionUser.role || "",
    challengeId: id,
    action: "view",
  });
  if (!access.allowed) notFound();

  if (attempt.challenge.type === "WORKSHEET" || attempt.challenge.type === "PDF_WORKSHEET") {
    redirect(`/resources/${board}/${qualification}/${subject}/worksheet/${id}`);
  }

  let parsedAnswers: Record<string, string> = {};
  try {
    parsedAnswers = JSON.parse(attempt.answers);
  } catch {
    parsedAnswers = {};
  }

  // Fetch which questions are already tracked in mistake book
  const trackedMistakes = await prisma.mistakeEntry.findMany({
    where: {
      userId,
      questionId: { in: attempt.challenge.questions.map((q) => q.id) },
    },
    select: { questionId: true, mistakeCount: true, status: true },
  });

  const trackedMistakeMap: Record<string, { count: number; status: string }> = {};
  trackedMistakes.forEach((m) => {
    trackedMistakeMap[m.questionId] = { count: m.mistakeCount, status: m.status };
  });

  return (
    <ChallengeResults
      attempt={{
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        percentage: attempt.percentage,
        timeTaken: attempt.timeTaken,
        completedAt: attempt.completedAt.toISOString(),
        answers: parsedAnswers,
      }}
      challenge={{
        id: attempt.challenge.id,
        title: attempt.challenge.title,
        difficulty: attempt.challenge.difficulty,
        type: attempt.challenge.type,
        topic: attempt.challenge.topic,
        questions: attempt.challenge.questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          topicTag: q.topicTag,
        })),
      }}
      backUrl={`/resources/${board}/${qualification}/${subject}`}
      retryUrl={`/resources/${board}/${qualification}/${subject}/challenge/${id}/attempt`}
      trackedMistakes={trackedMistakeMap}
    />
  );
}
