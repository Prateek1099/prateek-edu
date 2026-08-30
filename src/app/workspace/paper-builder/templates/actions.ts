"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  difficultyFromDatabase,
  difficultyToDatabase,
  getWorkspacePaperTemplateSnapshot,
  listWorkspacePaperTemplateSummaries,
  validateWorkspacePaperTemplateContext,
} from "@/lib/paper-builder/workspace-paper-template-data";
import {
  nextWorkspacePaperTemplateCopyName,
  validateWorkspacePaperTemplateInput,
} from "@/lib/paper-builder/workspace-paper-template-rules";
import type {
  WorkspacePaperTemplateApplyResult,
  WorkspacePaperTemplateInput,
  WorkspacePaperTemplateListResult,
  WorkspacePaperTemplateMutationResult,
  WorkspacePaperTemplateStatus,
} from "@/lib/paper-builder/workspace-paper-template-types";
import { prisma } from "@/lib/prisma";
import { requireActiveWorkspace } from "@/lib/require-role";

function validTemplateId(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.length > 200) {
    throw new Error("Choose a valid paper template.");
  }
  return value;
}

function friendlyError(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "A paper template with this name already exists for the selected subject.";
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return "Paper template not found.";
  }
  if (error instanceof Error && !error.name.startsWith("Prisma")) return error.message;
  return fallback;
}

function revalidateTemplatePaths() {
  revalidatePath("/workspace/paper-builder");
  revalidatePath("/workspace/paper-builder/templates");
}

function parentFields(validated: ReturnType<typeof validateWorkspacePaperTemplateInput>) {
  return {
    name: validated.name,
    nameKey: validated.nameKey,
    description: validated.description,
    version: validated.version,
    subjectId: validated.subjectId,
    targetMarks: validated.targetMarks,
    preferredHeaderTemplateId: validated.preferredHeaderTemplateId,
  };
}

function nestedTopics(validated: ReturnType<typeof validateWorkspacePaperTemplateInput>) {
  return validated.topicIds.map((topicId, sortOrder) => ({ topicId, sortOrder }));
}

function nestedRows(validated: ReturnType<typeof validateWorkspacePaperTemplateInput>) {
  return validated.rows.map((row) => ({
    sectionLabel: row.sectionLabel,
    questionType: row.questionType,
    questionCount: row.questionCount,
    marksPerQuestion: row.marksPerQuestion,
    difficulty: difficultyToDatabase[row.difficulty],
    sortOrder: row.sortOrder,
  }));
}

async function createValidatedTemplate(
  workspaceId: string,
  createdById: string,
  validated: ReturnType<typeof validateWorkspacePaperTemplateInput>,
) {
  await prisma.workspacePaperTemplate.create({
    data: {
      ...parentFields(validated),
      workspaceId,
      createdById,
      topics: { create: nestedTopics(validated) },
      rows: { create: nestedRows(validated) },
    },
  });
}

export async function listWorkspacePaperTemplates(
  status: WorkspacePaperTemplateStatus = "active",
): Promise<WorkspacePaperTemplateListResult> {
  const teacher = await requireActiveWorkspace();
  try {
    if (status !== "active" && status !== "archived") {
      return { success: false, error: "Choose a valid template status." };
    }
    return {
      success: true,
      templates: await listWorkspacePaperTemplateSummaries(teacher.workspaceId, status),
    };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not load paper templates.") };
  }
}

export async function createWorkspacePaperTemplate(
  input: WorkspacePaperTemplateInput,
): Promise<WorkspacePaperTemplateMutationResult> {
  const teacher = await requireActiveWorkspace();
  try {
    const validated = validateWorkspacePaperTemplateInput(input);
    await validateWorkspacePaperTemplateContext(teacher.workspaceId, validated);
    await createValidatedTemplate(teacher.workspaceId, teacher.id, validated);
    revalidateTemplatePaths();
    return { success: true, message: "Paper template saved." };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not save the paper template.") };
  }
}

export async function updateWorkspacePaperTemplate(
  id: string,
  input: WorkspacePaperTemplateInput,
): Promise<WorkspacePaperTemplateMutationResult> {
  const teacher = await requireActiveWorkspace();
  try {
    const templateId = validTemplateId(id);
    const validated = validateWorkspacePaperTemplateInput(input);
    await validateWorkspacePaperTemplateContext(teacher.workspaceId, validated);
    await prisma.$transaction(async (tx) => {
      const existing = await tx.workspacePaperTemplate.findFirst({
        where: { id: templateId, workspaceId: teacher.workspaceId, archivedAt: null },
        select: { id: true },
      });
      if (!existing) throw new Error("Paper template not found.");
      await tx.workspacePaperTemplate.update({
        where: { id: templateId },
        data: {
          ...parentFields(validated),
          topics: {
            deleteMany: {},
            create: nestedTopics(validated),
          },
          rows: {
            deleteMany: {},
            create: nestedRows(validated),
          },
        },
      });
    });
    revalidateTemplatePaths();
    return { success: true, message: "Paper template updated." };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not update the paper template.") };
  }
}

export async function applyWorkspacePaperTemplate(
  id: string,
): Promise<WorkspacePaperTemplateApplyResult> {
  const teacher = await requireActiveWorkspace();
  try {
    return {
      success: true,
      template: await getWorkspacePaperTemplateSnapshot(teacher.workspaceId, id),
    };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not apply the paper template.") };
  }
}

export async function duplicateWorkspacePaperTemplate(
  id: string,
): Promise<WorkspacePaperTemplateMutationResult> {
  const teacher = await requireActiveWorkspace();
  try {
    const templateId = validTemplateId(id);
    const source = await prisma.workspacePaperTemplate.findFirst({
      where: { id: templateId, workspaceId: teacher.workspaceId, archivedAt: null },
      include: {
        topics: { orderBy: { sortOrder: "asc" } },
        rows: { orderBy: { sortOrder: "asc" } },
        preferredHeaderTemplate: {
          select: { id: true, workspaceId: true, archivedAt: true },
        },
      },
    });
    if (!source) throw new Error("Paper template not found.");

    const existingNames = await prisma.workspacePaperTemplate.findMany({
      where: { workspaceId: teacher.workspaceId, subjectId: source.subjectId },
      select: { name: true },
    });
    const validated = validateWorkspacePaperTemplateInput({
      name: nextWorkspacePaperTemplateCopyName(
        source.name,
        existingNames.map((template) => template.name),
      ),
      description: source.description ?? "",
      subjectId: source.subjectId,
      topicIds: source.topics.map((topic) => topic.topicId),
      rows: source.rows.map((row) => ({
        sectionLabel: row.sectionLabel,
        questionType: row.questionType,
        questionCount: row.questionCount,
        marksPerQuestion: row.marksPerQuestion,
        difficulty: difficultyFromDatabase[row.difficulty],
      })),
      targetMarks: source.targetMarks,
      preferredHeaderTemplateId:
        source.preferredHeaderTemplate?.workspaceId === teacher.workspaceId &&
        !source.preferredHeaderTemplate.archivedAt
          ? source.preferredHeaderTemplate.id
          : null,
    });
    await validateWorkspacePaperTemplateContext(teacher.workspaceId, validated);
    await createValidatedTemplate(teacher.workspaceId, teacher.id, validated);
    revalidateTemplatePaths();
    return { success: true, message: "Paper template duplicated." };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not duplicate the paper template.") };
  }
}

export async function archiveWorkspacePaperTemplate(
  id: string,
): Promise<WorkspacePaperTemplateMutationResult> {
  const teacher = await requireActiveWorkspace();
  try {
    const templateId = validTemplateId(id);
    const archived = await prisma.workspacePaperTemplate.updateMany({
      where: { id: templateId, workspaceId: teacher.workspaceId, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    if (archived.count !== 1) throw new Error("Paper template not found.");
    revalidateTemplatePaths();
    return { success: true, message: "Paper template archived." };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not archive the paper template.") };
  }
}

export async function restoreWorkspacePaperTemplate(
  id: string,
): Promise<WorkspacePaperTemplateMutationResult> {
  const teacher = await requireActiveWorkspace();
  try {
    const templateId = validTemplateId(id);
    const template = await prisma.workspacePaperTemplate.findFirst({
      where: { id: templateId, workspaceId: teacher.workspaceId, archivedAt: { not: null } },
      include: { topics: true },
    });
    if (!template) throw new Error("Paper template not found.");
    await validateWorkspacePaperTemplateContext(teacher.workspaceId, {
      subjectId: template.subjectId,
      topicIds: template.topics.map((topic) => topic.topicId),
      preferredHeaderTemplateId: template.preferredHeaderTemplateId,
    });
    const restored = await prisma.workspacePaperTemplate.updateMany({
      where: { id: templateId, workspaceId: teacher.workspaceId, archivedAt: { not: null } },
      data: { archivedAt: null },
    });
    if (restored.count !== 1) throw new Error("Paper template not found.");
    revalidateTemplatePaths();
    return { success: true, message: "Paper template restored." };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not restore the paper template.") };
  }
}
