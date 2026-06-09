"use server";

import { prisma } from "@/lib/prisma";
import { rejectIfNotAdmin } from "@/lib/require-admin";
import { revalidatePath } from "next/cache";

async function forbidIfNeeded(): Promise<string | null> {
  return rejectIfNotAdmin();
}

function revalidatePaperRelated() {
  revalidatePath("/admin/papers");
  revalidatePath("/papers");
  revalidatePath("/board", "layout");
}

function revalidateNoteRelated() {
  revalidatePath("/admin/notes");
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
  description: string | null;
  price: number;
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
  description: string | null;
  price: number;
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

// --- PAPERS ---

export async function createPaper(data: {
  subjectId: string;
  year: number;
  paperNumber: number;
  variant: number | null;
  season?: string | null;
  questionPdfUrl: string | null;
  msPdfUrl: string | null;
  sourceFilesUrl: string | null;
}) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    await prisma.paper.create({ data });
    revalidatePaperRelated();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed" };
  }
}

export async function updatePaper(id: string, data: {
  subjectId: string;
  year: number;
  paperNumber: number;
  variant: number | null;
  season?: string | null;
  questionPdfUrl: string | null;
  msPdfUrl: string | null;
  sourceFilesUrl: string | null;
}) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    await prisma.paper.update({ where: { id }, data });
    revalidatePaperRelated();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed" };
  }
}

export async function deletePaper(id: string) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    await prisma.paper.delete({ where: { id } });
    revalidatePaperRelated();
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed" };
  }
}

// --- NOTES ---

export async function createNote(data: {
  subjectId: string;
  title: string;
  content: string | null;
  pdfUrl: string | null;
  topicId: string | null;
}) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    await prisma.note.create({ data });
    revalidateNoteRelated();
    revalidatePath("/board", "layout");
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
}) {
  const denied = await forbidIfNeeded();
  if (denied) return { success: false as const, error: denied };
  try {
    await prisma.note.update({ where: { id }, data });
    revalidateNoteRelated();
    revalidatePath("/board", "layout");
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
    revalidatePath("/board", "layout");
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

