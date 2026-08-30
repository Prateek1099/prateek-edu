import "server-only";

import {
  BlueprintTemplateDifficulty,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type { PaperDifficulty, PaperHeaderTemplate } from "./types";
import type {
  ManagedWorkspacePaperTemplate,
  WorkspacePaperTemplateSnapshot,
  WorkspacePaperTemplateStatus,
  WorkspacePaperTemplateSummary,
} from "./workspace-paper-template-types";

export const difficultyFromDatabase: Record<BlueprintTemplateDifficulty, PaperDifficulty> = {
  ANY: "any",
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
};

export const difficultyToDatabase: Record<PaperDifficulty, BlueprintTemplateDifficulty> = {
  any: BlueprintTemplateDifficulty.ANY,
  easy: BlueprintTemplateDifficulty.EASY,
  medium: BlueprintTemplateDifficulty.MEDIUM,
  hard: BlueprintTemplateDifficulty.HARD,
};

const templateInclude = Prisma.validator<Prisma.WorkspacePaperTemplateInclude>()({
  subject: { select: { id: true, name: true } },
  topics: {
    include: { topic: { select: { id: true, subjectId: true, topicName: true } } },
    orderBy: { sortOrder: "asc" },
  },
  rows: { orderBy: { sortOrder: "asc" } },
  preferredHeaderTemplate: true,
});

type TemplateRecord = Prisma.WorkspacePaperTemplateGetPayload<{
  include: typeof templateInclude;
}>;

function validTemplateId(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.length > 200) {
    throw new Error("Choose a valid paper template.");
  }
  return value;
}

function activeHeaderTemplate(
  template: TemplateRecord,
  workspaceId: string,
): PaperHeaderTemplate | null {
  const header = template.preferredHeaderTemplate;
  if (!header || header.workspaceId !== workspaceId || header.archivedAt) return null;
  return {
    id: header.id,
    name: header.name,
    institutionName: header.institutionName,
    examLabel: header.examLabel,
    courseLine: header.courseLine,
    defaultDuration: header.defaultDuration,
    defaultInstructions: header.defaultInstructions,
    showStudentName: header.showStudentName,
    showRollNumber: header.showRollNumber,
    defaultClassLine: header.defaultClassLine,
    defaultTopicLine: header.defaultTopicLine,
  };
}

function staleReason(template: TemplateRecord, activeSubjectIds: Set<string>) {
  if (template.version !== 1) return "This template version is not supported.";
  if (!activeSubjectIds.has(template.subjectId)) {
    return "This subject is not currently assigned to your workspace.";
  }
  if (
    template.topics.length === 0 ||
    template.topics.some((entry) => entry.topic.subjectId !== template.subjectId)
  ) {
    return "One or more saved topics no longer belong to this subject.";
  }
  if (template.rows.length === 0) return "This template has no paper sections.";
  return null;
}

function toSummary(
  template: TemplateRecord,
  activeSubjectIds: Set<string>,
): WorkspacePaperTemplateSummary {
  const header = template.preferredHeaderTemplate;
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    version: template.version,
    subjectId: template.subjectId,
    subjectName: template.subject.name,
    targetMarks: template.targetMarks,
    topicCount: template.topics.length,
    rowCount: template.rows.length,
    preferredHeaderTemplateId: template.preferredHeaderTemplateId,
    preferredHeaderTemplateName:
      header && header.workspaceId === template.workspaceId ? header.name : null,
    archivedAt: template.archivedAt?.toISOString() ?? null,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
    staleReason: staleReason(template, activeSubjectIds),
  };
}

function toSnapshot(
  template: TemplateRecord,
  scopedSubjectIds: Set<string>,
): WorkspacePaperTemplateSnapshot {
  return {
    ...toSummary(template, scopedSubjectIds),
    topics: template.topics.map((entry) => ({
      id: entry.topic.id,
      name: entry.topic.topicName,
      sortOrder: entry.sortOrder,
    })),
    rows: template.rows.map((row) => ({
      sectionLabel: row.sectionLabel,
      questionType: row.questionType,
      questionCount: row.questionCount,
      marksPerQuestion: row.marksPerQuestion,
      difficulty: difficultyFromDatabase[row.difficulty],
      sortOrder: row.sortOrder,
    })),
    preferredHeaderTemplate: activeHeaderTemplate(template, template.workspaceId),
  };
}

async function activeSubjectIds(workspaceId: string) {
  const scopes = await prisma.workspaceAcademicScope.findMany({
    where: {
      workspaceId,
      status: "ACTIVE",
      subject: {
        status: "PUBLISHED",
        qualification: { status: "PUBLISHED", board: { status: "PUBLISHED" } },
      },
    },
    select: { subjectId: true },
  });
  return new Set(scopes.map((scope) => scope.subjectId));
}

export async function listWorkspacePaperTemplateSummaries(
  workspaceId: string,
  status: WorkspacePaperTemplateStatus = "active",
) {
  const [templates, scopedSubjectIds] = await Promise.all([
    prisma.workspacePaperTemplate.findMany({
      where: {
        workspaceId,
        archivedAt: status === "archived" ? { not: null } : null,
      },
      include: templateInclude,
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    }),
    activeSubjectIds(workspaceId),
  ]);
  return templates.map((template) => toSummary(template, scopedSubjectIds));
}

export async function listManagedWorkspacePaperTemplates(
  workspaceId: string,
  status: WorkspacePaperTemplateStatus = "active",
): Promise<ManagedWorkspacePaperTemplate[]> {
  const [templates, scopedSubjectIds] = await Promise.all([
    prisma.workspacePaperTemplate.findMany({
      where: {
        workspaceId,
        archivedAt: status === "archived" ? { not: null } : null,
      },
      include: templateInclude,
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    }),
    activeSubjectIds(workspaceId),
  ]);
  return templates.map((template) => toSnapshot(template, scopedSubjectIds));
}

export async function getWorkspacePaperTemplateSnapshot(
  workspaceId: string,
  templateIdInput: unknown,
): Promise<WorkspacePaperTemplateSnapshot> {
  const templateId = validTemplateId(templateIdInput);
  const template = await prisma.workspacePaperTemplate.findFirst({
    where: { id: templateId, workspaceId, archivedAt: null },
    include: templateInclude,
  });
  if (!template) throw new Error("Paper template not found.");

  const scopedSubjectIds = await activeSubjectIds(workspaceId);
  const unavailableReason = staleReason(template, scopedSubjectIds);
  if (unavailableReason) throw new Error(unavailableReason);

  return toSnapshot(template, scopedSubjectIds);
}

export async function validateWorkspacePaperTemplateContext(
  workspaceId: string,
  input: {
    subjectId: string;
    topicIds: string[];
    preferredHeaderTemplateId: string | null;
  },
) {
  const [scope, topics, header] = await Promise.all([
    prisma.workspaceAcademicScope.findFirst({
      where: {
        workspaceId,
        subjectId: input.subjectId,
        status: "ACTIVE",
        workspace: { status: "ACTIVE" },
        subject: {
          status: "PUBLISHED",
          qualification: { status: "PUBLISHED", board: { status: "PUBLISHED" } },
        },
      },
      select: { id: true },
    }),
    prisma.topic.findMany({
      where: { id: { in: input.topicIds }, subjectId: input.subjectId },
      select: { id: true },
    }),
    input.preferredHeaderTemplateId
      ? prisma.workspacePaperHeaderTemplate.findFirst({
          where: {
            id: input.preferredHeaderTemplateId,
            workspaceId,
            archivedAt: null,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (!scope) throw new Error("This subject is not assigned to your workspace.");
  if (topics.length !== input.topicIds.length) {
    throw new Error("One or more selected topics do not belong to the assigned subject.");
  }
  if (input.preferredHeaderTemplateId && !header) {
    throw new Error("The preferred header template is unavailable in this workspace.");
  }
}
