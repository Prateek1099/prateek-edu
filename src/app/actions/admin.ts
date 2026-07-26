"use server";

import { prisma } from "@/lib/prisma";
import { rejectIfNotAdmin } from "@/lib/require-admin";
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
    await prisma.course.delete({ where: { id } });
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
    const challenge = await prisma.challenge.findUnique({
      where: { id },
      select: { type: true, workspaceId: true },
    });
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
        error: "Manage worksheet deletion from Admin Worksheets.",
      };
    }
    await prisma.challenge.delete({ where: { id } });
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
    await prisma.bankQuestion.createMany({
      data: questions.map((q) => ({
        subjectId,
        topicId: topicId || null,
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || null,
        topicTag: q.topicTag || null,
        difficulty: q.difficulty || "medium",
        marks: q.marks || 1,
      })),
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
