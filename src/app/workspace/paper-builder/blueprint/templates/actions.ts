"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  getWorkspaceBlueprintTemplateSnapshot,
  listWorkspaceBlueprintTemplateSummaries,
  validateWorkspaceBlueprintTemplateContext,
  workspaceBlueprintDifficultyFromDatabase,
  workspaceBlueprintDifficultyToDatabase,
} from "@/lib/paper-builder/workspace-blueprint-template-data";
import {
  nextWorkspaceBlueprintTemplateCopyName,
  validateWorkspaceBlueprintTemplateInput,
  workspaceBlueprintTemplateDraft,
} from "@/lib/paper-builder/workspace-blueprint-template-rules";
import type {
  WorkspaceBlueprintTemplateApplyResult,
  WorkspaceBlueprintTemplateCreateResult,
  WorkspaceBlueprintTemplateInput,
  WorkspaceBlueprintTemplateListResult,
  WorkspaceBlueprintTemplateMutationResult,
  WorkspaceBlueprintTemplateStatus,
} from "@/lib/paper-builder/workspace-blueprint-template-types";
import { prisma } from "@/lib/prisma";
import { requireActiveWorkspace } from "@/lib/require-role";

const defaultDetails = {
  institutionName: "VEXA",
  examLabel: "Class Test",
  title: "",
  courseLine: "",
  topicLine: "",
  durationMinutes: 30,
  dateText: "",
  classText: "",
  showStudentName: true,
  showRollNumber: true,
  instructions: "Attempt all questions.",
};

function validTemplateId(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.length > 200) {
    throw new Error("Choose a valid blueprint template.");
  }
  return value;
}

function friendlyError(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "A blueprint template with this name already exists for the selected subject.";
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return "Blueprint template not found.";
  }
  if (error instanceof Error && !error.name.startsWith("Prisma")) return error.message;
  return fallback;
}

function revalidateTemplatePaths() {
  revalidatePath("/workspace/paper-builder/blueprint");
  revalidatePath("/workspace/paper-builder/blueprint/templates");
}

function templateFields(
  validated: ReturnType<typeof validateWorkspaceBlueprintTemplateInput>,
) {
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

function nestedTopics(
  validated: ReturnType<typeof validateWorkspaceBlueprintTemplateInput>,
) {
  return validated.chapters.map((chapter) => ({
    topicId: chapter.topicId,
    sortOrder: chapter.sortOrder,
    rows: {
      create: chapter.rows.map((row) => ({
        sectionLabel: row.sectionLabel,
        questionType: row.questionType,
        questionCount: row.questionCount,
        marksPerQuestion: row.marksPerQuestion,
        difficulty: workspaceBlueprintDifficultyToDatabase[row.difficulty],
        sortOrder: row.sortOrder,
      })),
    },
  }));
}

async function validateContext(
  workspaceId: string,
  validated: ReturnType<typeof validateWorkspaceBlueprintTemplateInput>,
  requireActiveHeader = true,
) {
  return validateWorkspaceBlueprintTemplateContext(
    workspaceId,
    {
      subjectId: validated.subjectId,
      boardId: validated.boardId,
      qualificationId: validated.qualificationId,
      topicIds: validated.chapters.map((chapter) => chapter.topicId),
      preferredHeaderTemplateId: validated.preferredHeaderTemplateId,
    },
    { requireActiveHeader },
  );
}

async function createValidatedTemplate(
  workspaceId: string,
  createdById: string,
  validated: ReturnType<typeof validateWorkspaceBlueprintTemplateInput>,
) {
  const created = await prisma.workspaceBlueprintTemplate.create({
    data: {
      ...templateFields(validated),
      workspaceId,
      createdById,
      topics: { create: nestedTopics(validated) },
    },
    select: { id: true },
  });
  return getWorkspaceBlueprintTemplateSnapshot(workspaceId, created.id);
}

export async function listTeacherBlueprintTemplates(
  status: WorkspaceBlueprintTemplateStatus = "active",
): Promise<WorkspaceBlueprintTemplateListResult> {
  const teacher = await requireActiveWorkspace();
  try {
    if (status !== "active" && status !== "archived") {
      return { success: false, error: "Choose a valid template status." };
    }
    return {
      success: true,
      templates: await listWorkspaceBlueprintTemplateSummaries(teacher.workspaceId, status),
    };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not load blueprint templates.") };
  }
}

export async function getTeacherBlueprintTemplate(
  id: string,
): Promise<WorkspaceBlueprintTemplateApplyResult> {
  const teacher = await requireActiveWorkspace();
  try {
    return {
      success: true,
      template: await getWorkspaceBlueprintTemplateSnapshot(teacher.workspaceId, id),
    };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not load the blueprint template.") };
  }
}

export async function createTeacherBlueprintTemplate(
  input: WorkspaceBlueprintTemplateInput,
): Promise<WorkspaceBlueprintTemplateCreateResult> {
  const teacher = await requireActiveWorkspace();
  try {
    const validated = validateWorkspaceBlueprintTemplateInput(input);
    await validateContext(teacher.workspaceId, validated);
    const template = await createValidatedTemplate(teacher.workspaceId, teacher.id, validated);
    revalidateTemplatePaths();
    return { success: true, template, message: "Blueprint template saved." };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not save the blueprint template.") };
  }
}

export async function updateTeacherBlueprintTemplate(
  input: WorkspaceBlueprintTemplateInput & { id: string },
): Promise<WorkspaceBlueprintTemplateMutationResult> {
  const teacher = await requireActiveWorkspace();
  try {
    const templateId = validTemplateId(input?.id);
    const validated = validateWorkspaceBlueprintTemplateInput(input);
    await validateContext(teacher.workspaceId, validated);
    await prisma.$transaction(async (tx) => {
      const existing = await tx.workspaceBlueprintTemplate.findFirst({
        where: { id: templateId, workspaceId: teacher.workspaceId, archivedAt: null },
        select: { id: true },
      });
      if (!existing) throw new Error("Blueprint template not found. Restore archived templates before updating them.");
      await tx.workspaceBlueprintTemplate.update({
        where: { id: templateId },
        data: {
          ...templateFields(validated),
          topics: { deleteMany: {}, create: nestedTopics(validated) },
        },
      });
    });
    const template = await getWorkspaceBlueprintTemplateSnapshot(teacher.workspaceId, templateId);
    revalidateTemplatePaths();
    return { success: true, template, message: "Blueprint template updated." };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not update the blueprint template.") };
  }
}

export async function duplicateTeacherBlueprintTemplate(
  id: string,
): Promise<WorkspaceBlueprintTemplateMutationResult> {
  const teacher = await requireActiveWorkspace();
  try {
    const source = await getWorkspaceBlueprintTemplateSnapshot(
      teacher.workspaceId,
      validTemplateId(id),
    );
    const existingNames = await prisma.workspaceBlueprintTemplate.findMany({
      where: { workspaceId: teacher.workspaceId, subjectId: source.subjectId },
      select: { name: true },
    });
    const validated = validateWorkspaceBlueprintTemplateInput({
      name: nextWorkspaceBlueprintTemplateCopyName(
        source.name,
        existingNames.map((template) => template.name),
      ),
      description: source.description ?? "",
      includeHeaderDefaults: Boolean(source.preferredHeaderTemplateId),
      preferredHeaderTemplateId: source.preferredHeaderTemplateId,
      draft: workspaceBlueprintTemplateDraft(source, source.headerDefaults ?? defaultDetails),
    });
    await validateContext(teacher.workspaceId, validated);
    const template = await createValidatedTemplate(teacher.workspaceId, teacher.id, validated);
    revalidateTemplatePaths();
    return { success: true, template, message: `Created “${template.name}”.` };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not duplicate the blueprint template.") };
  }
}

export async function archiveTeacherBlueprintTemplate(
  id: string,
): Promise<WorkspaceBlueprintTemplateMutationResult> {
  const teacher = await requireActiveWorkspace();
  try {
    const archived = await prisma.workspaceBlueprintTemplate.updateMany({
      where: {
        id: validTemplateId(id),
        workspaceId: teacher.workspaceId,
        archivedAt: null,
      },
      data: { archivedAt: new Date() },
    });
    if (archived.count !== 1) throw new Error("Blueprint template not found.");
    revalidateTemplatePaths();
    return { success: true, message: "Blueprint template archived." };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not archive the blueprint template.") };
  }
}

export async function restoreTeacherBlueprintTemplate(
  id: string,
): Promise<WorkspaceBlueprintTemplateMutationResult> {
  const teacher = await requireActiveWorkspace();
  try {
    const templateId = validTemplateId(id);
    const source = await prisma.workspaceBlueprintTemplate.findFirst({
      where: { id: templateId, workspaceId: teacher.workspaceId, archivedAt: { not: null } },
      include: {
        subject: {
          select: {
            qualification: { select: { id: true, boardId: true } },
          },
        },
        topics: {
          include: {
            topic: { select: { id: true, topicName: true } },
            rows: { orderBy: { sortOrder: "asc" } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    if (!source) throw new Error("Blueprint template not found.");

    const validated = validateWorkspaceBlueprintTemplateInput({
      name: source.name,
      description: source.description ?? "",
      includeHeaderDefaults: Boolean(source.preferredHeaderTemplateId),
      preferredHeaderTemplateId: source.preferredHeaderTemplateId,
      draft: {
        version: 1,
        details: defaultDetails,
        boardId: source.subject.qualification.boardId,
        qualificationId: source.subject.qualification.id,
        subjectId: source.subjectId,
        targetMarks: source.targetMarks,
        chapters: source.topics.map((entry) => ({
          id: entry.id,
          topicId: entry.topicId,
          topicName: entry.topic.topicName,
          sortOrder: entry.sortOrder,
          rows: entry.rows.map((row) => ({
            id: row.id,
            topicId: entry.topicId,
            sectionLabel: row.sectionLabel,
            questionType: row.questionType,
            questionCount: row.questionCount,
            marksPerQuestion: row.marksPerQuestion,
            difficulty: workspaceBlueprintDifficultyFromDatabase[row.difficulty],
          })),
        })),
      },
    });
    await validateContext(teacher.workspaceId, validated, false);
    const restored = await prisma.workspaceBlueprintTemplate.updateMany({
      where: { id: templateId, workspaceId: teacher.workspaceId, archivedAt: { not: null } },
      data: { archivedAt: null },
    });
    if (restored.count !== 1) throw new Error("Blueprint template not found.");
    revalidateTemplatePaths();
    return { success: true, message: "Blueprint template restored." };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not restore the blueprint template.") };
  }
}

export async function applyTeacherBlueprintTemplate(
  id: string,
): Promise<WorkspaceBlueprintTemplateApplyResult> {
  return getTeacherBlueprintTemplate(id);
}
