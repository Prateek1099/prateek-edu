import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRevisionTasks } from "@/lib/plan-engine";
import { canAccessChallengeOrWorksheet } from "@/lib/challenge-access";
import { isInteractiveChallengeType } from "@/lib/challenge-access-rules";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = session.user as typeof session.user & { id?: string; role?: string };
  const userId = sessionUser.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: challengeId } = await params;

  try {
    const access = await canAccessChallengeOrWorksheet({
      userId,
      role: sessionUser.role || "",
      challengeId,
      action: "attempt",
    });
    if (!access.challenge) {
      return Response.json({ error: "Challenge not found" }, { status: 404 });
    }
    if (!access.allowed) {
      const error = access.reason === "unpublished"
        ? "This challenge is not published"
        : access.reason === "document_not_attemptable"
          ? "Document worksheets cannot be submitted through challenge scoring"
          : "Unauthorized";
      return Response.json({ error }, { status: 403 });
    }

    const body = await request.json();
    const { answers, timeTaken } = body as {
      answers: Record<string, string>;
      timeTaken: number;
    };

    // Fetch challenge with correct answers + topicTag for mistake tracking
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        questions: {
          select: { id: true, correctAnswer: true, topicTag: true },
        },
      },
    });

    if (!challenge) {
      return Response.json({ error: "Challenge not found" }, { status: 404 });
    }

    // Re-check mutable challenge state after authorization and before any write.
    if (!challenge.isPublished) {
      return Response.json({ error: "This challenge is not published" }, { status: 403 });
    }
    if (!isInteractiveChallengeType(challenge.type)) {
      return Response.json(
        { error: "Document worksheets cannot be submitted through challenge scoring" },
        { status: 403 },
      );
    }

    // Score calculation
    let score = 0;
    const totalQuestions = challenge.questions.length;

    for (const question of challenge.questions) {
      if (answers[question.id]?.toUpperCase() === question.correctAnswer.toUpperCase()) {
        score++;
      }
    }

    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 1000) / 10 : 0;

    // Save attempt
    const attempt = await prisma.challengeAttempt.create({
      data: {
        userId,
        challengeId,
        score,
        totalQuestions,
        percentage,
        answers: JSON.stringify(answers),
        timeTaken: timeTaken || null,
      },
    });

    // Update WorksheetAssignment status to COMPLETED if applicable
    if (challenge.workspaceId) {
      await prisma.worksheetAssignment.updateMany({
        where: {
          userId,
          worksheetId: challengeId,
        },
        data: {
          status: "COMPLETED"
        }
      });
    }

    // AUTO-CAPTURE MISTAKES: Upsert a MistakeEntry for every wrong answer.
    // @@unique([userId, questionId]) prevents duplicates — repeated mistakes
    // increment mistakeCount and reset status to "needs_revision".
    const wrongQuestions = challenge.questions.filter(
      (q) => answers[q.id] && answers[q.id].toUpperCase() !== q.correctAnswer.toUpperCase()
    );

    if (wrongQuestions.length > 0) {
      await Promise.all(
        wrongQuestions.map((q) =>
          prisma.mistakeEntry.upsert({
            where: {
              userId_questionId: { userId, questionId: q.id },
            },
            create: {
              userId,
              questionId: q.id,
              challengeId,
              topicTag: q.topicTag,
              studentAnswer: answers[q.id],
              correctAnswer: q.correctAnswer,
              mistakeCount: 1,
              status: "needs_revision",
            },
            update: {
              mistakeCount: { increment: 1 },
              studentAnswer: answers[q.id],
              status: "needs_revision", // Reset if they got it wrong again
            },
          })
        )
      );
    }

    // AUTO-REGENERATE REVISION PLAN: If the student has an active plan,
    // refresh tasks based on the new challenge data.
    try {
      const plan = await prisma.revisionPlan.findUnique({ where: { userId } });
      if (plan) {
        await generateRevisionTasks(
          userId, plan.id, plan.board, plan.qualification,
          plan.examDate, plan.studyDaysPerWeek, plan.studyDuration
        );
      }
    } catch (regenErr) {
      // Non-blocking: don't fail the challenge attempt if regeneration fails
      console.error("Revision plan auto-regeneration failed:", regenErr);
    }

    return Response.json({
      attemptId: attempt.id,
      score,
      totalQuestions,
      percentage,
    });
  } catch (error) {
    console.error("Challenge attempt error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
