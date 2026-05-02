"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- COURSES ---

export async function createCourse(data: {
  title: string;
  description: string | null;
  price: number;
  level: string;
  subject: string;
}) {
  try {
    await prisma.course.create({ data });
    revalidatePath("/admin/courses");
    revalidatePath("/courses");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateCourse(id: string, data: {
  title: string;
  description: string | null;
  price: number;
  level: string;
  subject: string;
}) {
  try {
    await prisma.course.update({ where: { id }, data });
    revalidatePath("/admin/courses");
    revalidatePath("/courses");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteCourse(id: string) {
  try {
    await prisma.course.delete({ where: { id } });
    revalidatePath("/admin/courses");
    revalidatePath("/courses");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- PAPERS ---

export async function createPaper(data: {
  subject: string;
  level: string;
  year: number;
  paperNumber: number;
  variant: number | null;
  questionPdfUrl: string | null;
  msPdfUrl: string | null;
}) {
  try {
    await prisma.paper.create({ data });
    revalidatePath("/admin/papers");
    revalidatePath("/papers");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePaper(id: string, data: {
  subject: string;
  level: string;
  year: number;
  paperNumber: number;
  variant: number | null;
  questionPdfUrl: string | null;
  msPdfUrl: string | null;
}) {
  try {
    await prisma.paper.update({ where: { id }, data });
    revalidatePath("/admin/papers");
    revalidatePath("/papers");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deletePaper(id: string) {
  try {
    await prisma.paper.delete({ where: { id } });
    revalidatePath("/admin/papers");
    revalidatePath("/papers");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
