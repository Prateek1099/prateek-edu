"use server";

import {
  BlueprintTemplateDifficulty,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  calculateTemplateSnapshotMarks,
  validateBlueprintTemplateInput,
} from "@/lib/paper-builder/blueprint-template-rules";
import type {
  BlueprintTemplateFilters,
  BlueprintTemplateSnapshot,
  BlueprintTemplateSummary,
  CreateBlueprintTemplateInput,
} from "@/lib/paper-builder/blueprint-template-types";
import type { PaperDifficulty } from "@/lib/paper-builder/types";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-role";

type ListResult =
  | { success: true; templates: BlueprintTemplateSummary[] }
  | { success: false; error: string };

type CreateResult =
  | { success: true; template: BlueprintTemplateSummary }
  | { success: false; error: string };

type ApplyResult =
  | { success: true; template: BlueprintTemplateSnapshot }
  | { success: false; error: string };

const difficultyToDatabase: Record<PaperDifficulty, BlueprintTemplateDifficulty> = {
  any: BlueprintTemplateDifficulty.ANY,
  easy: BlueprintTemplateDifficulty.EASY,
  medium: BlueprintTemplateDifficulty.MEDIUM,
  hard: BlueprintTemplateDifficulty.HARD,
};

const difficultyFromDatabase: Record<BlueprintTemplateDifficulty, PaperDifficulty> = {
  ANY: "any",
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
};

function summary(template: {
  id: string;
  name: string;
  description: string | null;
  boardId: string;
  qualificationId: string;
  subjectId: string;
  totalMarks: number;
  includeHeaderDefaults: boolean;
}): BlueprintTemplateSummary {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    boardId: template.boardId,
    qualificationId: template.qualificationId,
    subjectId: template.subjectId,
    totalMarks: template.totalMarks,
    includeHeaderDefaults: template.includeHeaderDefaults,
  };
}

function optionalFilter(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.length > 200) throw new Error("A template filter is invalid.");
  return value;
}

function friendlyError(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "A blueprint template with this name already exists for the selected subject.";
  }
  return error instanceof Error ? error.message : fallback;
}

export async function listPaperBlueprintTemplates(filters: BlueprintTemplateFilters = {}): Promise<ListResult> {
  await requireSuperAdmin();
  try {
    const boardId = optionalFilter(filters.boardId);
    const qualificationId = optionalFilter(filters.qualificationId);
    const subjectId = optionalFilter(filters.subjectId);
    const templates = await prisma.paperBlueprintTemplate.findMany({
      where: { boardId, qualificationId, subjectId },
      select: {
        id: true,
        name: true,
        description: true,
        boardId: true,
        qualificationId: true,
        subjectId: true,
        totalMarks: true,
        includeHeaderDefaults: true,
      },
      orderBy: [{ name: "asc" }],
    });
    return { success: true, templates: templates.map(summary) };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not load blueprint templates.") };
  }
}

export async function createPaperBlueprintTemplate(input: CreateBlueprintTemplateInput): Promise<CreateResult> {
  const admin = await requireSuperAdmin();
  try {
    const validated = validateBlueprintTemplateInput(input);
    const topicIds = validated.chapters.map((chapter) => chapter.topicId);
    const [subject, topicCount] = await Promise.all([
      prisma.subject.findUnique({
        where: { id: validated.subjectId },
        select: {
          id: true,
          qualification: { select: { id: true, boardId: true } },
        },
      }),
      prisma.topic.count({
        where: { id: { in: topicIds }, subjectId: validated.subjectId },
      }),
    ]);
    if (!subject) return { success: false, error: "The selected subject no longer exists." };
    if (
      subject.qualification.id !== validated.qualificationId ||
      subject.qualification.boardId !== validated.boardId
    ) {
      return { success: false, error: "The selected subject does not belong to that board and qualification." };
    }
    if (topicCount !== topicIds.length) {
      return { success: false, error: "One or more selected chapters do not belong to the subject." };
    }

    const header = validated.headerDefaults;
    const created = await prisma.paperBlueprintTemplate.create({
      data: {
        name: validated.name,
        description: validated.description,
        boardId: validated.boardId,
        qualificationId: validated.qualificationId,
        subjectId: validated.subjectId,
        totalMarks: validated.totalMarks,
        includeHeaderDefaults: validated.includeHeaderDefaults,
        institutionName: header?.institutionName ?? null,
        examLabel: header?.examLabel ?? null,
        courseLine: header?.courseLine ?? null,
        title: header?.title ?? null,
        topicLine: header?.topicLine ?? null,
        durationMinutes: header?.durationMinutes ?? null,
        dateText: header?.dateText ?? null,
        classText: header?.classText ?? null,
        showStudentName: header?.showStudentName ?? null,
        showRollNumber: header?.showRollNumber ?? null,
        instructions: header?.instructions ?? null,
        createdById: admin.id,
        chapters: {
          create: validated.chapters.map((chapter) => ({
            topicId: chapter.topicId,
            sortOrder: chapter.sortOrder,
            rows: {
              create: chapter.rows.map((row) => ({
                sectionLabel: row.sectionLabel,
                questionType: row.questionType,
                questionCount: row.questionCount,
                marksPerQuestion: row.marksPerQuestion,
                difficulty: difficultyToDatabase[row.difficulty],
                sortOrder: row.sortOrder,
              })),
            },
          })),
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        boardId: true,
        qualificationId: true,
        subjectId: true,
        totalMarks: true,
        includeHeaderDefaults: true,
      },
    });
    revalidatePath("/admin/paper-builder/blueprint");
    return { success: true, template: summary(created) };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not save the blueprint template.") };
  }
}

export async function applyPaperBlueprintTemplate(id: string): Promise<ApplyResult> {
  await requireSuperAdmin();
  if (typeof id !== "string" || !id || id.length > 200) {
    return { success: false, error: "Choose a valid blueprint template." };
  }
  try {
    const template = await prisma.paperBlueprintTemplate.findUnique({
      where: { id },
      include: {
        subject: {
          select: {
            id: true,
            qualification: { select: { id: true, boardId: true } },
          },
        },
        chapters: {
          include: {
            topic: { select: { id: true, subjectId: true, topicName: true, sortOrder: true } },
            rows: { orderBy: { sortOrder: "asc" } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    if (!template) return { success: false, error: "Blueprint template not found." };
    if (
      template.subject.qualification.id !== template.qualificationId ||
      template.subject.qualification.boardId !== template.boardId
    ) {
      return { success: false, error: "This template's academic scope is no longer valid." };
    }
    if (template.chapters.some((chapter) => chapter.topic.subjectId !== template.subjectId)) {
      return { success: false, error: "One or more template chapters no longer belong to the subject." };
    }

    const headerDefaults = template.includeHeaderDefaults ? {
      institutionName: template.institutionName ?? "",
      examLabel: template.examLabel ?? "",
      title: template.title ?? "",
      courseLine: template.courseLine ?? "",
      topicLine: template.topicLine ?? "",
      durationMinutes: template.durationMinutes ?? 0,
      dateText: template.dateText ?? "",
      classText: template.classText ?? "",
      showStudentName: template.showStudentName ?? true,
      showRollNumber: template.showRollNumber ?? true,
      instructions: template.instructions ?? "",
    } : null;
    const chapters = template.chapters.map((chapter) => ({
      topicId: chapter.topic.id,
      topicName: chapter.topic.topicName,
      sortOrder: chapter.sortOrder,
      rows: chapter.rows.map((row) => ({
        sectionLabel: row.sectionLabel,
        questionType: row.questionType,
        questionCount: row.questionCount,
        marksPerQuestion: row.marksPerQuestion,
        difficulty: difficultyFromDatabase[row.difficulty],
        sortOrder: row.sortOrder,
      })),
    }));
    if (calculateTemplateSnapshotMarks(chapters) !== template.totalMarks) {
      return { success: false, error: "This template's saved total no longer matches its rows." };
    }

    validateBlueprintTemplateInput({
      name: template.name,
      description: template.description ?? "",
      includeHeaderDefaults: template.includeHeaderDefaults,
      draft: {
        version: 1,
        details: headerDefaults ?? {
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
        },
        boardId: template.boardId,
        qualificationId: template.qualificationId,
        subjectId: template.subjectId,
        targetMarks: template.totalMarks,
        chapters: chapters.map((chapter) => ({
          id: chapter.topicId,
          topicId: chapter.topicId,
          topicName: chapter.topicName,
          sortOrder: chapter.sortOrder,
          rows: chapter.rows.map((row, index) => ({
            id: `${chapter.topicId}-${index}`,
            topicId: chapter.topicId,
            sectionLabel: row.sectionLabel,
            questionType: row.questionType,
            questionCount: row.questionCount,
            marksPerQuestion: row.marksPerQuestion,
            difficulty: row.difficulty,
          })),
        })),
      },
    });

    return {
      success: true,
      template: {
        ...summary(template),
        headerDefaults,
        chapters,
      },
    };
  } catch (error) {
    return { success: false, error: friendlyError(error, "Could not apply the blueprint template.") };
  }
}
