"use server";

import { prisma } from "@/lib/prisma";
import { validateBankQuestionInput } from "@/lib/bank-questions";
import { rejectIfNotAdmin } from "@/lib/require-admin";
import { requireSuperAdmin } from "@/lib/require-role";
import { revalidatePath } from "next/cache";

async function forbidIfNeeded(): Promise<string | null> {
  return rejectIfNotAdmin();
}

function revalidateNoteRelated() {
  revalidatePath("/admin/notes");
  revalidatePath("/resources", "layout");
}

// --- SUBJECTS & SYLLABUS ---

export async function updateSubjectSyllabus(id: string, data: { syllabusPdfUrl: string | null }) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    await prisma.subject.update({ where: { id }, data });
    revalidatePath("/admin/syllabus");
    revalidatePath("/resources", "layout");
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed" };
  }
}

// --- COURSES ---

export async function createCourse(data: {
  title: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  imageUrl: string | null;
  price: number;
  isPublished: boolean;
  level: string | null;
  language: string | null;
  instructorName: string | null;
  learningOutcomes: string | null;
  requirements: string | null;
  targetAudience: string | null;
  subjectId: string;
}) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    await prisma.course.create({ data });
    revalidatePath("/admin/courses");
    revalidatePath("/courses");
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed" };
  }
}

export async function updateCourse(id: string, data: {
  title: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  imageUrl: string | null;
  price: number;
  isPublished: boolean;
  level: string | null;
  language: string | null;
  instructorName: string | null;
  learningOutcomes: string | null;
  requirements: string | null;
  targetAudience: string | null;
  subjectId: string;
}) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    await prisma.course.update({ where: { id }, data });
    revalidatePath("/admin/courses");
    revalidatePath("/courses");
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed" };
  }
}

export async function toggleCoursePublished(id: string) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return { success: false as const, error: "Course not found" };
    await prisma.course.update({
      where: { id },
      data: { isPublished: !course.isPublished },
    });
    revalidatePath("/admin/courses");
    revalidatePath("/courses");
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed" };
  }
}

export async function deleteCourse(id: string) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    await requireSuperAdmin();
    const result = await prisma.$transaction(async (tx) => {
      const course = await tx.course.findUnique({
        where: { id },
        select: {
          isPublished: true,
          _count: {
            select: {
              enrollments: true,
              payments: true,
            },
          },
        },
      });

      if (!course) {
        return { success: false as const, error: "Course not found" };
      }
      if (course.isPublished) {
        return {
          success: false as const,
          error: "Unpublish this course before deleting it.",
        };
      }
      if (course._count.enrollments > 0 || course._count.payments > 0) {
        return {
          success: false as const,
          error: `This course cannot be deleted because it has ${course._count.enrollments} enrollment(s) and ${course._count.payments} attributed payment record(s). Unpublish it to preserve purchase and access history.`,
        };
      }

      await tx.course.delete({ where: { id } });
      return { success: true as const };
    });

    if (!result.success) return result;
    revalidatePath("/admin/courses");
    revalidatePath("/courses");
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed" };
  }
}

// --- NOTES ---

type AdminNoteType = "NOTEBOOK_WORK" | "STUDY_NOTES";

function normalizeNoteData(data: {
  subjectId: string;
  title: string;
  content: string | null;
  pdfUrl: string | null;
  topicId: string | null;
  noteType: AdminNoteType;
}) {
  const content = data.content?.trim() || null;
  const pdfUrl = data.pdfUrl?.trim() || null;

  if (!content && !pdfUrl) {
    return {
      success: false as const,
      error: "Add text content or attach a PDF before saving this note.",
    };
  }
  if (
    data.noteType !== "NOTEBOOK_WORK" &&
    data.noteType !== "STUDY_NOTES"
  ) {
    return { success: false as const, error: "Choose a valid note type." };
  }

  return {
    success: true as const,
    data: {
      ...data,
      title: data.title.trim(),
      content,
      pdfUrl,
      topicId: data.topicId || null,
    },
  };
}

export async function createNote(data: {
  subjectId: string;
  title: string;
  content: string | null;
  pdfUrl: string | null;
  topicId: string | null;
  noteType: AdminNoteType;
}) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    const normalized = normalizeNoteData(data);
    if (!normalized.success) return normalized;
    if (!normalized.data.title) {
      return { success: false as const, error: "Add a note title." };
    }

    await prisma.note.create({ data: normalized.data });
    revalidateNoteRelated();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed" };
  }
}

export async function updateNote(id: string, data: {
  subjectId: string;
  title: string;
  content: string | null;
  pdfUrl: string | null;
  topicId: string | null;
  noteType: AdminNoteType;
}) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    const normalized = normalizeNoteData(data);
    if (!normalized.success) return normalized;
    if (!normalized.data.title) {
      return { success: false as const, error: "Add a note title." };
    }

    await prisma.note.update({ where: { id }, data: normalized.data });
    revalidateNoteRelated();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed" };
  }
}

export async function deleteNote(id: string) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    await prisma.note.delete({ where: { id } });
    revalidateNoteRelated();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed" };
  }
}

export async function toggleNotePublished(id: string) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    const note = await prisma.note.findUnique({ where: { id } });
    if (!note) return { success: false as const, error: "Note not found" };
    await prisma.note.update({
      where: { id },
      data: { isPublished: !note.isPublished },
    });
    revalidateNoteRelated();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed" };
  }
}

// --- CHALLENGES ---

function revalidateChallengeRelated() {
  revalidatePath("/admin/challenges");
  revalidatePath("/resources", "layout");
}

function revalidateWorksheetRelated() {
  revalidatePath("/admin/worksheets");
  revalidatePath("/resources", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/worksheets");
}

function isValidWorksheetDocumentUrl(value: string | null) {
  if (!value) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function createChallenge(data: {
  title: string;
  subjectId: string;
  topicId: string | null;
  difficulty: string;
  estimatedTime: number;
  questions: {
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    explanation?: string;
    topicTag?: string;
  }[];
}) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    await prisma.challenge.create({
      data: {
        title: data.title,
        subjectId: data.subjectId,
        topicId: data.topicId || undefined,
        difficulty: data.difficulty,
        estimatedTime: data.estimatedTime,
        questions: {
          create: data.questions.map((q, i) => ({
            questionText: q.questionText,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || null,
            topicTag: q.topicTag || null,
            sortOrder: i,
          })),
        },
      },
    });
    revalidateChallengeRelated();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed" };
  }
}

export async function createChallengeFromBank(data: {
  title: string;
  subjectId: string;
  topicId: string | null;
  difficulty: string;
  questionDifficulty: string;
  estimatedTime: number;
  isPublished: boolean;
  questionIds: string[];
}) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };

  const title = typeof data.title === "string" ? data.title.trim() : "";
  const allowedDifficulties = new Set(["easy", "medium", "hard", "mixed"]);
  const allowedQuestionDifficulties = new Set(["all", "easy", "medium", "hard"]);
  const questionIds = [
    ...new Set(
      (Array.isArray(data.questionIds) ? data.questionIds : []).filter(
        (id): id is string => typeof id === "string" && Boolean(id),
      ),
    ),
  ];

  if (!title) return { success: false as const, error: "Challenge title is required." };
  if (title.length > 200) return { success: false as const, error: "Challenge title is too long." };
  if (typeof data.subjectId !== "string" || !data.subjectId) {
    return { success: false as const, error: "Subject is required." };
  }
  if (data.topicId !== null && typeof data.topicId !== "string") {
    return { success: false as const, error: "Choose a valid topic." };
  }
  if (typeof data.isPublished !== "boolean") {
    return { success: false as const, error: "Choose a valid visibility." };
  }
  if (!allowedDifficulties.has(data.difficulty)) {
    return { success: false as const, error: "Choose a valid challenge difficulty." };
  }
  if (!allowedQuestionDifficulties.has(data.questionDifficulty)) {
    return { success: false as const, error: "Choose a valid Question Bank difficulty filter." };
  }
  if (!Number.isInteger(data.estimatedTime) || data.estimatedTime < 1 || data.estimatedTime > 300) {
    return { success: false as const, error: "Duration must be between 1 and 300 minutes." };
  }
  if (questionIds.length === 0) {
    return { success: false as const, error: "Select at least one Question Bank question." };
  }
  if (questionIds.length > 100) {
    return { success: false as const, error: "A challenge can contain at most 100 questions." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const subject = await tx.subject.findUnique({
        where: { id: data.subjectId },
        select: { id: true },
      });
      if (!subject) {
        return { success: false as const, error: "Selected subject was not found." };
      }

      if (data.topicId) {
        const topic = await tx.topic.findFirst({
          where: { id: data.topicId, subjectId: data.subjectId },
          select: { id: true },
        });
        if (!topic) {
          return {
            success: false as const,
            error: "Selected topic does not belong to the chosen subject.",
          };
        }
      }

      const questions = await tx.bankQuestion.findMany({
        where: {
          id: { in: questionIds },
          subjectId: data.subjectId,
          workspaceId: null,
          questionType: "MCQ",
          ...(data.topicId ? { topicId: data.topicId } : {}),
          ...(data.questionDifficulty !== "all"
            ? { difficulty: data.questionDifficulty }
            : {}),
        },
      });

      if (questions.length !== questionIds.length) {
        return {
          success: false as const,
          error:
            "One or more selected questions are missing, workspace-owned, or outside the chosen subject, topic, or difficulty filter.",
        };
      }

      const questionById = new Map(questions.map((question) => [question.id, question]));
      const orderedQuestions = questionIds.map((id) => questionById.get(id)!);
      const invalidQuestion = orderedQuestions.find(
        (question) =>
          !question.questionText.trim() ||
          !question.optionA?.trim() ||
          !question.optionB?.trim() ||
          !question.optionC?.trim() ||
          !question.optionD?.trim() ||
          !question.correctAnswer ||
          !["A", "B", "C", "D"].includes(question.correctAnswer.trim().toUpperCase()) ||
          question.marks < 1,
      );
      if (invalidQuestion) {
        return {
          success: false as const,
          error: "A selected Question Bank question is incomplete or invalid.",
        };
      }

      const challenge = await tx.challenge.create({
        data: {
          title,
          subjectId: data.subjectId,
          topicId: data.topicId,
          difficulty: data.difficulty,
          estimatedTime: data.estimatedTime,
          isPublished: data.isPublished,
          type: "CHALLENGE",
          workspaceId: null,
          questions: {
            create: orderedQuestions.map((question, index) => ({
              questionText: question.questionText,
              optionA: question.optionA!,
              optionB: question.optionB!,
              optionC: question.optionC!,
              optionD: question.optionD!,
              correctAnswer: question.correctAnswer!.trim().toUpperCase(),
              explanation: question.explanation,
              topicTag: question.topicTag,
              difficulty: question.difficulty,
              marks: question.marks,
              sortOrder: index,
            })),
          },
        },
        select: { id: true },
      });

      return { success: true as const, challengeId: challenge.id };
    });

    if (!result.success) return result;
    revalidateChallengeRelated();
    return result;
  } catch (error: unknown) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create challenge from Question Bank.",
    };
  }
}

export async function updateChallenge(id: string, data: {
  title: string;
  subjectId: string;
  topicId: string | null;
  difficulty: string;
  estimatedTime: number;
}) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    await prisma.challenge.update({ where: { id }, data: { ...data, topicId: data.topicId || null } });
    revalidateChallengeRelated();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed" };
  }
}

export async function deleteChallenge(id: string) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    await requireSuperAdmin();
    const result = await prisma.$transaction(async (tx) => {
      const challenge = await tx.challenge.findUnique({
        where: { id },
        select: {
          type: true,
          workspaceId: true,
          isPublished: true,
          _count: {
            select: {
              attempts: true,
              mistakes: true,
            },
          },
        },
      });
      if (!challenge) {
        return { success: false as const, error: "Challenge not found" };
      }
      if (challenge.workspaceId) {
        return {
          success: false as const,
          error: "Teacher workspace content must be managed from Teacher Workspace.",
        };
      }
      if (challenge.type === "WORKSHEET" || challenge.type === "PDF_WORKSHEET") {
        return {
          success: false as const,
          error: "Manage worksheet deletion from Admin Worksheets.",
        };
      }
      if (challenge.isPublished) {
        return {
          success: false as const,
          error: "Unpublish this challenge before deleting it.",
        };
      }
      if (challenge._count.attempts > 0 || challenge._count.mistakes > 0) {
        return {
          success: false as const,
          error: `This challenge cannot be deleted because it has ${challenge._count.attempts} attempt(s) and ${challenge._count.mistakes} mistake record(s). Unpublish it to preserve student history.`,
        };
      }

      await tx.challenge.delete({ where: { id } });
      return { success: true as const };
    });

    if (!result.success) return result;
    revalidateChallengeRelated();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed" };
  }
}

export async function toggleChallengePublished(id: string) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    const challenge = await prisma.challenge.findUnique({ where: { id } });
    if (!challenge) return { success: false as const, error: "Challenge not found" };
    if (challenge.workspaceId) {
      return {
        success: false as const,
        error: "Teacher workspace content must be managed from Teacher Workspace.",
      };
    }
    if (challenge.type === "WORKSHEET" || challenge.type === "PDF_WORKSHEET") {
      return {
        success: false as const,
        error: "Manage worksheet publishing from Admin Worksheets.",
      };
    }
    await prisma.challenge.update({
      where: { id },
      data: { isPublished: !challenge.isPublished },
    });
    revalidateChallengeRelated();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed" };
  }
}

export async function setWorksheetPublished(id: string, isPublished: boolean) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };

  try {
    const worksheet = await prisma.challenge.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        type: true,
        workspaceId: true,
        pdfUrl: true,
        subject: { select: { id: true } },
        _count: { select: { questions: true } },
      },
    });

    if (!worksheet) {
      return { success: false as const, error: "Worksheet not found." };
    }
    if (worksheet.workspaceId) {
      return {
        success: false as const,
        error: "Teacher workspace worksheets must be managed from Teacher Workspace.",
      };
    }
    if (worksheet.type !== "WORKSHEET" && worksheet.type !== "PDF_WORKSHEET") {
      return { success: false as const, error: "This record is not a worksheet." };
    }

    if (isPublished) {
      if (!worksheet.title.trim()) {
        return { success: false as const, error: "Add a worksheet title before publishing." };
      }
      if (!worksheet.subject) {
        return { success: false as const, error: "Choose a subject before publishing." };
      }
      if (worksheet.type === "WORKSHEET" && worksheet._count.questions === 0) {
        return {
          success: false as const,
          error: "Generated worksheets need at least one question before publishing.",
        };
      }
      if (
        worksheet.type === "PDF_WORKSHEET" &&
        !isValidWorksheetDocumentUrl(worksheet.pdfUrl)
      ) {
        return {
          success: false as const,
          error: "Add a valid Questions PDF before publishing.",
        };
      }
    }

    await prisma.challenge.update({
      where: { id },
      data: { isPublished },
    });
    revalidateWorksheetRelated();

    return { success: true as const, isPublished };
  } catch (error: unknown) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to update worksheet status.",
    };
  }
}

export async function deleteWorksheet(id: string) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };

  try {
    const worksheet = await prisma.challenge.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        workspaceId: true,
        _count: {
          select: {
            attempts: true,
            assignments: true,
            mistakes: true,
          },
        },
      },
    });

    if (!worksheet) {
      return { success: false as const, error: "Worksheet not found." };
    }
    if (worksheet.workspaceId) {
      return {
        success: false as const,
        error: "Teacher workspace worksheets must be managed from Teacher Workspace.",
      };
    }
    if (worksheet.type !== "WORKSHEET" && worksheet.type !== "PDF_WORKSHEET") {
      return { success: false as const, error: "This record is not a worksheet." };
    }

    const hasStudentHistory =
      worksheet._count.attempts > 0 ||
      worksheet._count.assignments > 0 ||
      worksheet._count.mistakes > 0;

    if (hasStudentHistory) {
      return {
        success: false as const,
        blocked: true as const,
        error:
          "This worksheet has student activity or assignments. Archive it instead of deleting.",
        counts: worksheet._count,
      };
    }

    await prisma.challenge.delete({ where: { id } });
    revalidateWorksheetRelated();

    return {
      success: true as const,
      storageFilesPreserved: true as const,
    };
  } catch (error: unknown) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to delete worksheet.",
    };
  }
}

export async function appendQuestions(challengeId: string, questions: {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation?: string;
  topicTag?: string;
}[]) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    const existing = await prisma.question.count({ where: { challengeId } });
    await prisma.question.createMany({
      data: questions.map((q, i) => ({
        challengeId,
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || null,
        topicTag: q.topicTag || null,
        sortOrder: existing + i,
      })),
    });
    revalidateChallengeRelated();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed" };
  }
}

export async function deleteQuestion(questionId: string) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    await prisma.question.delete({ where: { id: questionId } });
    revalidateChallengeRelated();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed" };
  }
}

export async function appendBankQuestions(subjectId: string, topicId: string | null, questions: {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation?: string;
  topicTag?: string;
  difficulty?: string;
  marks?: number;
}[]) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true } });
    if (!subject) return { success: false as const, error: "Selected subject was not found." };
    if (topicId) {
      const topic = await prisma.topic.findFirst({
        where: { id: topicId, subjectId },
        select: { id: true },
      });
      if (!topic) return { success: false as const, error: "Selected topic does not belong to the subject." };
    }

    const validated = questions.map((question) =>
      validateBankQuestionInput({
        ...question,
        subjectId,
        topicId,
        questionType: "MCQ",
        difficulty: question.difficulty || "medium",
        marks: question.marks ?? 1,
      }),
    );
    const invalid = validated.find((result) => !result.success);
    if (invalid && !invalid.success) {
      return { success: false as const, error: invalid.errors.join(" ") };
    }

    await prisma.bankQuestion.createMany({
      data: validated.map((result) => {
        if (!result.success) throw new Error("Question validation failed.");
        return { ...result.data, workspaceId: null };
      }),
    });
    revalidatePath("/admin/question-bank");
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed" };
  }
}

export async function deleteBankQuestion(questionId: string) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    await prisma.bankQuestion.delete({ where: { id: questionId } });
    revalidatePath("/admin/question-bank");
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed" };
  }
}
