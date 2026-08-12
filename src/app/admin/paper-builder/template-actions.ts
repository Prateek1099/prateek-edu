"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import type { PaperHeaderTemplateInput } from "@/lib/paper-builder/types";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-role";

type TemplateActionResult =
  | { success: true }
  | { success: false; error: string };

function clean(value: unknown, label: string, maxLength: number, required = true) {
  if (typeof value !== "string") throw new Error(`${label} is invalid.`);
  const normalized = value.trim();
  if (required && !normalized) throw new Error(`${label} is required.`);
  if (normalized.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  return normalized;
}

function validateTemplate(input: PaperHeaderTemplateInput) {
  const duration = Number(input.defaultDuration);
  if (!Number.isInteger(duration) || duration < 1 || duration > 300) {
    throw new Error("Default duration must be a whole number from 1 to 300 minutes.");
  }
  return {
    name: clean(input.name, "Template name", 200),
    institutionName: clean(input.institutionName, "Institution name", 200),
    examLabel: clean(input.examLabel, "Exam label", 200),
    courseLine: clean(input.courseLine, "Course / class / board line", 500, false),
    defaultDuration: duration,
    defaultInstructions: clean(input.defaultInstructions, "Instructions", 3000, false),
    showStudentName: input.showStudentName === true,
    showRollNumber: input.showRollNumber === true,
    defaultClassLine: clean(input.defaultClassLine ?? "", "Class line", 200, false) || null,
    defaultTopicLine: clean(input.defaultTopicLine ?? "", "Topic line", 1000, false) || null,
  };
}

function friendlyTemplateError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "A header template with this name already exists.";
  }
  return error instanceof Error ? error.message : "Could not save the header template.";
}

export async function createPaperHeaderTemplate(input: PaperHeaderTemplateInput): Promise<TemplateActionResult> {
  const admin = await requireSuperAdmin();
  try {
    const data = validateTemplate(input);
    await prisma.paperHeaderTemplate.create({ data: { ...data, createdById: admin.id } });
    revalidatePath("/admin/paper-builder");
    return { success: true };
  } catch (error) {
    return { success: false, error: friendlyTemplateError(error) };
  }
}

export async function updatePaperHeaderTemplate(id: string, input: PaperHeaderTemplateInput): Promise<TemplateActionResult> {
  await requireSuperAdmin();
  if (!id) return { success: false, error: "Choose a template to update." };
  try {
    const existing = await prisma.paperHeaderTemplate.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { success: false, error: "Header template not found." };
    await prisma.paperHeaderTemplate.update({ where: { id }, data: validateTemplate(input) });
    revalidatePath("/admin/paper-builder");
    return { success: true };
  } catch (error) {
    return { success: false, error: friendlyTemplateError(error) };
  }
}

export async function deletePaperHeaderTemplate(id: string): Promise<TemplateActionResult> {
  await requireSuperAdmin();
  if (!id) return { success: false, error: "Choose a template to delete." };
  try {
    const result = await prisma.paperHeaderTemplate.deleteMany({ where: { id } });
    if (result.count === 0) return { success: false, error: "Header template not found." };
    revalidatePath("/admin/paper-builder");
    return { success: true };
  } catch (error) {
    return { success: false, error: friendlyTemplateError(error) };
  }
}
