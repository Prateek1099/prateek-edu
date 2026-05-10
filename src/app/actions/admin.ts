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
