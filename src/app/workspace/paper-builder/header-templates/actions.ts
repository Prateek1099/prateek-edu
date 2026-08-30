"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import type {
  PaperHeaderTemplateInput,
  WorkspacePaperHeaderTemplate,
} from "@/lib/paper-builder/types";
import { validateWorkspaceHeaderTemplateInput } from "@/lib/paper-builder/workspace-header-template-rules";
import { prisma } from "@/lib/prisma";
import { requireActiveWorkspace } from "@/lib/require-role";

type TemplateStatus = "active" | "archived";
type ListResult =
  | { success: true; templates: WorkspacePaperHeaderTemplate[] }
  | { success: false; error: string };
type MutationResult = { success: true } | { success: false; error: string };

function validTemplateId(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.length > 200) {
    throw new Error("Choose a valid header template.");
  }
  return value;
}

function friendlyError(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "A header template with this name already exists in your workspace.";
  }
  return error instanceof Error ? error.message : fallback;
}

function revalidateHeaderTemplatePaths() {
  revalidatePath("/workspace/paper-builder");
  revalidatePath("/workspace/paper-builder/header-templates");
}

function toTemplate(record: {
  id: string;
  name: string;
  institutionName: string;
  examLabel: string;
  courseLine: string;
  defaultDuration: number;
  defaultInstructions: string;
  showStudentName: boolean;
  showRollNumber: boolean;
  defaultClassLine: string | null;
  defaultTopicLine: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): WorkspacePaperHeaderTemplate {
  return {
    id: record.id,
    name: record.name,
    institutionName: record.institutionName,
    examLabel: record.examLabel,
    courseLine: record.courseLine,
    defaultDuration: record.defaultDuration,
    defaultInstructions: record.defaultInstructions,
    showStudentName: record.showStudentName,
    showRollNumber: record.showRollNumber,
    defaultClassLine: record.defaultClassLine,
    defaultTopicLine: record.defaultTopicLine,
    archivedAt: record.archivedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function listWorkspacePaperHeaderTemplates(
  status: TemplateStatus = "active",
): Promise<ListResult> {
  const teacher = await requireActiveWorkspace();
  try {
    if (status !== "active" && status !== "archived") {
      return { success: false, error: "Choose a valid template status." };
    }
    const records = await prisma.workspacePaperHeaderTemplate.findMany({
      where: {
        workspaceId: teacher.workspaceId,
        archivedAt: status === "archived" ? { not: null } : null,
      },
      orderBy: [{ name: "asc" }],
    });
    return { success: true, templates: records.map(toTemplate) };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not load header templates.") };
  }
}

export async function createWorkspacePaperHeaderTemplate(
  input: PaperHeaderTemplateInput,
): Promise<MutationResult> {
  const teacher = await requireActiveWorkspace();
  try {
    const data = validateWorkspaceHeaderTemplateInput(input);
    await prisma.workspacePaperHeaderTemplate.create({
      data: {
        ...data,
        workspaceId: teacher.workspaceId,
        createdById: teacher.id,
      },
    });
    revalidateHeaderTemplatePaths();
    return { success: true };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not create the header template.") };
  }
}

export async function updateWorkspacePaperHeaderTemplate(
  id: string,
  input: PaperHeaderTemplateInput,
): Promise<MutationResult> {
  const teacher = await requireActiveWorkspace();
  try {
    const templateId = validTemplateId(id);
    const data = validateWorkspaceHeaderTemplateInput(input);
    const updated = await prisma.workspacePaperHeaderTemplate.updateMany({
      where: {
        id: templateId,
        workspaceId: teacher.workspaceId,
        archivedAt: null,
      },
      data,
    });
    if (updated.count !== 1) {
      return { success: false, error: "Header template not found." };
    }
    revalidateHeaderTemplatePaths();
    return { success: true };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not update the header template.") };
  }
}

export async function archiveWorkspacePaperHeaderTemplate(id: string): Promise<MutationResult> {
  const teacher = await requireActiveWorkspace();
  try {
    const templateId = validTemplateId(id);
    const archived = await prisma.workspacePaperHeaderTemplate.updateMany({
      where: {
        id: templateId,
        workspaceId: teacher.workspaceId,
        archivedAt: null,
      },
      data: { archivedAt: new Date() },
    });
    if (archived.count !== 1) {
      return { success: false, error: "Header template not found." };
    }
    revalidateHeaderTemplatePaths();
    return { success: true };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not archive the header template.") };
  }
}

export async function restoreWorkspacePaperHeaderTemplate(id: string): Promise<MutationResult> {
  const teacher = await requireActiveWorkspace();
  try {
    const templateId = validTemplateId(id);
    const restored = await prisma.workspacePaperHeaderTemplate.updateMany({
      where: {
        id: templateId,
        workspaceId: teacher.workspaceId,
        archivedAt: { not: null },
      },
      data: { archivedAt: null },
    });
    if (restored.count !== 1) {
      return { success: false, error: "Header template not found." };
    }
    revalidateHeaderTemplatePaths();
    return { success: true };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not restore the header template.") };
  }
}
