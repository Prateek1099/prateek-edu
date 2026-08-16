import type { BankQuestionTypeValue } from "@/lib/bank-questions";

import type { BlueprintPaperDraft } from "./blueprint-types";
import type { PaperDetails, PaperDifficulty } from "./types";

export type BlueprintTemplateSummary = {
  id: string;
  name: string;
  description: string | null;
  boardId: string;
  qualificationId: string;
  subjectId: string;
  totalMarks: number;
  includeHeaderDefaults: boolean;
};

export type BlueprintTemplateRowSnapshot = {
  sectionLabel: string;
  questionType: BankQuestionTypeValue;
  questionCount: number;
  marksPerQuestion: number;
  difficulty: PaperDifficulty;
  sortOrder: number;
};

export type BlueprintTemplateChapterSnapshot = {
  topicId: string;
  topicName: string;
  sortOrder: number;
  rows: BlueprintTemplateRowSnapshot[];
};

export type BlueprintTemplateSnapshot = BlueprintTemplateSummary & {
  headerDefaults: PaperDetails | null;
  chapters: BlueprintTemplateChapterSnapshot[];
};

export type BlueprintTemplateFilters = {
  boardId?: string;
  qualificationId?: string;
  subjectId?: string;
};

export type CreateBlueprintTemplateInput = {
  name: string;
  description: string;
  includeHeaderDefaults: boolean;
  draft: BlueprintPaperDraft;
};

export type UpdateBlueprintTemplateInput = CreateBlueprintTemplateInput & {
  id: string;
};

export type ManagedBlueprintTemplate = BlueprintTemplateSnapshot & {
  boardTitle: string;
  qualificationTitle: string;
  subjectName: string;
  chapterCount: number;
  rowCount: number;
  createdAt: string;
  updatedAt: string;
  staleReason: string | null;
};
