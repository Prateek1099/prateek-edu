import "server-only";

import { BlueprintTemplateDifficulty, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireWorkspaceSubjectScope } from "@/lib/workspace-academic-scope";

import { calculateTemplateSnapshotMarks } from "./blueprint-template-rules";
import type {
  ManagedWorkspaceBlueprintTemplate,
  WorkspaceBlueprintTemplateSnapshot,
  WorkspaceBlueprintTemplateStatus,
  WorkspaceBlueprintTemplateSummary,
} from "./workspace-blueprint-template-types";
import type { PaperDifficulty, PaperHeaderTemplate, PaperDetails } from "./types";

export const workspaceBlueprintDifficultyFromDatabase: Record<
  BlueprintTemplateDifficulty,
  PaperDifficulty
> = {
  ANY: "any",
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
};

export const workspaceBlueprintDifficultyToDatabase: Record<
  PaperDifficulty,
  BlueprintTemplateDifficulty
> = {
  any: BlueprintTemplateDifficulty.ANY,
  easy: BlueprintTemplateDifficulty.EASY,
  medium: BlueprintTemplateDifficulty.MEDIUM,
  hard: BlueprintTemplateDifficulty.HARD,
};

const templateInclude = Prisma.validator<Prisma.WorkspaceBlueprintTemplateInclude>()({
  subject: {
    select: {
      id: true,
      name: true,
      status: true,
      qualification: {
        select: {
          id: true,
          title: true,
          status: true,
          board: { select: { id: true, title: true, status: true } },
        },
      },
    },
  },
  topics: {
    include: {
      topic: {
        select: { id: true, subjectId: true, topicName: true, status: true, sortOrder: true },
      },
      rows: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { sortOrder: "asc" },
  },
  preferredHeaderTemplate: true,
});

type TemplateRecord = Prisma.WorkspaceBlueprintTemplateGetPayload<{
  include: typeof templateInclude;
}>;

function validTemplateId(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.length > 200) {
    throw new Error("Choose a valid blueprint template.");
  }
  return value;
}

function activeHeader(template: TemplateRecord, workspaceId: string): PaperHeaderTemplate | null {
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

function headerDetails(header: PaperHeaderTemplate | null): PaperDetails | null {
  if (!header) return null;
  return {
    institutionName: header.institutionName,
    examLabel: header.examLabel,
    title: "",
    courseLine: header.courseLine,
    topicLine: header.defaultTopicLine ?? "",
    durationMinutes: header.defaultDuration,
    dateText: "",
    classText: header.defaultClassLine ?? "",
    showStudentName: header.showStudentName,
    showRollNumber: header.showRollNumber,
    instructions: header.defaultInstructions,
  };
}

function templateChapters(template: TemplateRecord) {
  return template.topics.map((entry) => ({
    topicId: entry.topic.id,
    topicName: entry.topic.topicName,
    sortOrder: entry.sortOrder,
    rows: entry.rows.map((row) => ({
      sectionLabel: row.sectionLabel,
      questionType: row.questionType,
      questionCount: row.questionCount,
      marksPerQuestion: row.marksPerQuestion,
      difficulty: workspaceBlueprintDifficultyFromDatabase[row.difficulty],
      sortOrder: row.sortOrder,
    })),
  }));
}

function staleReason(template: TemplateRecord, activeSubjectIds: Set<string>) {
  if (template.version !== 1) return "This template version is not supported.";
  if (!activeSubjectIds.has(template.subjectId)) {
    return "This subject is no longer available to your workspace.";
  }
  if (
    template.subject.status !== "PUBLISHED" ||
    template.subject.qualification.status !== "PUBLISHED" ||
    template.subject.qualification.board.status !== "PUBLISHED"
  ) {
    return "This template subject is no longer published.";
  }
  if (
    template.topics.length === 0 ||
    template.topics.some((entry) =>
      entry.topic.subjectId !== template.subjectId || entry.topic.status !== "PUBLISHED"
    )
  ) {
    return "One or more template topics are no longer available to your workspace.";
  }
  if (template.topics.some((entry) => entry.rows.length === 0)) {
    return "One or more template topics have no blueprint rows.";
  }
  if (calculateTemplateSnapshotMarks(templateChapters(template)) !== template.targetMarks) {
    return "This template's saved marks no longer match its blueprint rows.";
  }
  return null;
}

function toSummary(
  template: TemplateRecord,
  activeSubjectIds: Set<string>,
): WorkspaceBlueprintTemplateSummary {
  const header = activeHeader(template, template.workspaceId);
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    boardId: template.subject.qualification.board.id,
    qualificationId: template.subject.qualification.id,
    subjectId: template.subjectId,
    totalMarks: template.targetMarks,
    includeHeaderDefaults: Boolean(header),
    preferredHeaderTemplateId: header?.id ?? null,
    preferredHeaderTemplateName: header?.name ?? null,
    subjectName: template.subject.name,
    boardTitle: template.subject.qualification.board.title,
    qualificationTitle: template.subject.qualification.title,
    chapterCount: template.topics.length,
    rowCount: template.topics.reduce((total, entry) => total + entry.rows.length, 0),
    archivedAt: template.archivedAt?.toISOString() ?? null,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
    staleReason: staleReason(template, activeSubjectIds),
  };
}

async function activeSubjectIds(workspaceId: string) {
  const records = await prisma.workspaceAcademicScope.findMany({
    where: {
      workspaceId,
      status: "ACTIVE",
      workspace: { status: "ACTIVE" },
      subject: {
        status: "PUBLISHED",
        qualification: { status: "PUBLISHED", board: { status: "PUBLISHED" } },
      },
    },
    select: { subjectId: true },
  });
  return new Set(records.map((record) => record.subjectId));
}

function toSnapshot(
  template: TemplateRecord,
  scopedSubjectIds: Set<string>,
): WorkspaceBlueprintTemplateSnapshot {
  const header = activeHeader(template, template.workspaceId);
  const warnings = template.preferredHeaderTemplateId && !header
    ? ["The preferred header template is archived or unavailable. The blueprint was applied without it."]
    : [];
  return {
    ...toSummary(template, scopedSubjectIds),
    preferredHeaderTemplateId: header?.id ?? null,
    preferredHeaderTemplateName: header?.name ?? null,
    headerDefaults: headerDetails(header),
    chapters: templateChapters(template),
    applyWarnings: warnings,
  };
}

export async function validateWorkspaceBlueprintTemplateContext(
  workspaceId: string,
  input: {
    subjectId: string;
    boardId: string;
    qualificationId: string;
    topicIds: string[];
    preferredHeaderTemplateId: string | null;
  },
  options: { requireActiveHeader?: boolean } = {},
) {
  await requireWorkspaceSubjectScope(workspaceId, input.subjectId);
  const [subject, topics, header] = await Promise.all([
    prisma.subject.findFirst({
      where: {
        id: input.subjectId,
        status: "PUBLISHED",
        qualification: {
          id: input.qualificationId,
          status: "PUBLISHED",
          board: { id: input.boardId, status: "PUBLISHED" },
        },
      },
      select: { id: true },
    }),
    prisma.topic.findMany({
      where: {
        id: { in: input.topicIds },
        subjectId: input.subjectId,
        status: "PUBLISHED",
      },
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

  if (!subject || topics.length !== input.topicIds.length) {
    throw new Error("This template uses a subject/topic no longer available to your workspace.");
  }
  if (options.requireActiveHeader && input.preferredHeaderTemplateId && !header) {
    throw new Error("The preferred header template is unavailable in this workspace.");
  }
  return { headerAvailable: !input.preferredHeaderTemplateId || Boolean(header) };
}

export async function listWorkspaceBlueprintTemplateSummaries(
  workspaceId: string,
  status: WorkspaceBlueprintTemplateStatus = "active",
) {
  const [templates, scopedSubjectIds] = await Promise.all([
    prisma.workspaceBlueprintTemplate.findMany({
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

export async function listManagedWorkspaceBlueprintTemplates(
  workspaceId: string,
  status: WorkspaceBlueprintTemplateStatus = "active",
): Promise<ManagedWorkspaceBlueprintTemplate[]> {
  const [templates, scopedSubjectIds] = await Promise.all([
    prisma.workspaceBlueprintTemplate.findMany({
      where: {
        workspaceId,
        archivedAt: status === "archived" ? { not: null } : null,
      },
      include: templateInclude,
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    }),
    activeSubjectIds(workspaceId),
  ]);
  return templates.map((template) => ({
    ...toSummary(template, scopedSubjectIds),
    chapters: templateChapters(template),
  }));
}

export async function getWorkspaceBlueprintTemplateSnapshot(
  workspaceId: string,
  templateIdInput: unknown,
): Promise<WorkspaceBlueprintTemplateSnapshot> {
  const templateId = validTemplateId(templateIdInput);
  const template = await prisma.workspaceBlueprintTemplate.findFirst({
    where: { id: templateId, workspaceId, archivedAt: null },
    include: templateInclude,
  });
  if (!template) throw new Error("Blueprint template not found.");

  const scopedSubjectIds = await activeSubjectIds(workspaceId);
  const unavailableReason = staleReason(template, scopedSubjectIds);
  if (unavailableReason) {
    throw new Error("This template uses a subject/topic no longer available to your workspace.");
  }
  return toSnapshot(template, scopedSubjectIds);
}
