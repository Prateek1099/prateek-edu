"use server";

import { revalidatePath } from "next/cache";

import { parseBankQuestionCsv } from "@/lib/bank-question-csv";
import { validateBankQuestionInput, type BankQuestionInput } from "@/lib/bank-questions";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-role";

type ActionResult = { success: true; count?: number } | { success: false; error: string };

async function validateAcademicScope(subjectId: string, topicId: string | null) {
  const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true } });
  if (!subject) return "Selected subject was not found.";
  if (!topicId) return "Topic is required for new Question Bank records.";
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, subjectId },
    select: { id: true },
  });
  return topic ? null : "Selected topic does not belong to the subject.";
}

export async function createAdminBankQuestion(input: BankQuestionInput): Promise<ActionResult> {
  await requireSuperAdmin();
  const validation = validateBankQuestionInput(input);
  if (!validation.success) return { success: false, error: validation.errors.join(" ") };
  const scopeError = await validateAcademicScope(validation.data.subjectId, validation.data.topicId);
  if (scopeError) return { success: false, error: scopeError };

  await prisma.bankQuestion.create({
    data: { ...validation.data, workspaceId: null },
  });
  revalidatePath("/admin/question-bank");
  return { success: true };
}

export async function updateAdminBankQuestion(
  questionId: string,
  input: BankQuestionInput,
): Promise<ActionResult> {
  await requireSuperAdmin();
  if (typeof questionId !== "string" || !questionId) {
    return { success: false, error: "Question ID is required." };
  }
  const existing = await prisma.bankQuestion.findUnique({
    where: { id: questionId },
    select: { workspaceId: true },
  });
  if (!existing || existing.workspaceId !== null) {
    return { success: false, error: "Only global Vexa Question Bank records can be edited here." };
  }

  const validation = validateBankQuestionInput(input);
  if (!validation.success) return { success: false, error: validation.errors.join(" ") };
  const scopeError = await validateAcademicScope(validation.data.subjectId, validation.data.topicId);
  if (scopeError) return { success: false, error: scopeError };

  await prisma.bankQuestion.update({
    where: { id: questionId },
    data: validation.data,
  });
  revalidatePath("/admin/question-bank");
  return { success: true };
}

export async function importAdminBankQuestionCsv(
  subjectId: string,
  csvText: string,
): Promise<ActionResult> {
  await requireSuperAdmin();
  if (typeof subjectId !== "string" || !subjectId) {
    return { success: false, error: "Choose a subject before importing CSV." };
  }
  if (typeof csvText !== "string" || !csvText.trim()) {
    return { success: false, error: "Paste CSV data before importing." };
  }

  const topics = await prisma.topic.findMany({
    where: { subjectId },
    select: { id: true, subjectId: true, topicName: true, importCode: true },
  });
  const parsed = parseBankQuestionCsv(
    csvText,
    subjectId,
    topics.map((topic) => ({ id: topic.id, subjectId: topic.subjectId, name: topic.topicName, importCode: topic.importCode })),
  );
  if (!parsed.canImport) {
    const errors = [
      ...parsed.fileErrors,
      ...parsed.rows.flatMap((row) => row.errors.map((error) => `Row ${row.rowNumber}: ${error}`)),
    ];
    return { success: false, error: errors.slice(0, 8).join(" ") || "CSV validation failed." };
  }

  const rows = parsed.rows.map((row) => row.data!);
  await prisma.bankQuestion.createMany({
    data: rows.map((row) => ({ ...row, workspaceId: null })),
  });
  revalidatePath("/admin/question-bank");
  return { success: true, count: rows.length };
}
