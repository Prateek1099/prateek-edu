import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRevisionTasks } from "@/lib/plan-engine";
import { canAccessChallengeOrWorksheet } from "@/lib/challenge-access";
import { isInteractiveChallengeType } from "@/lib/challenge-access-rules";
import { validateAnswersAndBuildSnapshots } from "@/lib/assignment-attempt-answer-snapshot-rules";

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
    const { answers: submittedAnswers, timeTaken } = body as {
      answers: unknown;
      timeTaken: number;
    };

    // Fetch challenge with correct answers + topicTag for mistake tracking
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        questions: {
          select: {
            id: true,
            questionText: true,
            optionA: true,
            optionB: true,
            optionC: true,
            optionD: true,
            correctAnswer: true,
            explanation: true,
            topicTag: true,
            difficulty: true,
            marks: true,
          },
        },
        topic: { select: { topicName: true } },
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

    const validated = validateAnswersAndBuildSnapshots({
      submittedAnswers,
      questions: challenge.questions,
      subjectId: challenge.subjectId,
      topicId: challenge.topicId,
      topicName: challenge.topic?.topicName ?? null,
    });
    if (!validated.success) {
      return Response.json({ error: validated.error }, { status: 400 });
    }
    const answers = validated.answers;

    // Score calculation
    let score = 0;
    const totalQuestions = challenge.questions.length;

    for (const question of challenge.questions) {
      if (answers[question.id]?.toUpperCase() === question.correctAnswer.toUpperCase()) {
        score++;
      }
    }

    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 1000) / 10 : 0;

    // Save the attempt and assignment completion atomically. Document worksheets
    // never reach this branch because the access boundary rejects them above.
    const attempt = await prisma.$transaction(async (tx) => {
      const savedAttempt = await tx.challengeAttempt.create({
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

      if (
        sessionUser.role === "STUDENT" &&
        challenge.workspaceId &&
        challenge.type === "QUICK_PRACTICE" &&
        validated.snapshots.length > 0
      ) {
        await tx.assignmentAttemptAnswerSnapshot.createMany({
          data: validated.snapshots.map((snapshot) => ({
            attemptId: savedAttempt.id,
            studentId: userId,
            questionId: snapshot.questionId,
            questionType: snapshot.questionType,
            questionText: snapshot.questionText,
            options: snapshot.options,
            selectedOptionKey: snapshot.selectedOptionKey,
            selectedOptionText: snapshot.selectedOptionText,
            correctOptionKey: snapshot.correctOptionKey,
            correctOptionText: snapshot.correctOptionText,
            explanation: snapshot.explanation,
            topicId: snapshot.topicId,
            subjectId: snapshot.subjectId,
            topicLabel: snapshot.topicLabel,
            difficulty: snapshot.difficulty,
            isCorrect: snapshot.isCorrect,
            marksAwarded: snapshot.marksAwarded,
            maxMarks: snapshot.maxMarks,
          })),
        });
      }

      if (challenge.workspaceId) {
        await tx.workspaceAssignmentRecipient.updateMany({
          where: {
            studentId: userId,
            revokedAt: null,
            batch: {
              challengeId,
              workspaceId: challenge.workspaceId,
              status: "ACTIVE",
              workspace: { status: "ACTIVE" },
              class: {
                status: "ACTIVE",
                workspaceId: challenge.workspaceId,
                students: { some: { studentId: userId, status: "ACTIVE" } },
              },
            },
          },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });

        // Legacy compatibility only. New teacher assignments are never written here.
        await tx.worksheetAssignment.updateMany({
          where: { userId, worksheetId: challengeId },
          data: { status: "COMPLETED" },
        });
      }

      return savedAttempt;
    });

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
