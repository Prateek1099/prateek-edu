import type { BankQuestionTypeValue } from "@/lib/bank-questions";

import type {
  PaperDifficulty,
  PaperHeaderTemplate,
} from "./types";

export type WorkspacePaperTemplateRowInput = {
  sectionLabel: string;
  questionType: BankQuestionTypeValue;
  questionCount: number;
  marksPerQuestion: number;
  difficulty: PaperDifficulty;
};

export type WorkspacePaperTemplateInput = {
  name: string;
  description: string;
  subjectId: string;
  topicIds: string[];
  rows: WorkspacePaperTemplateRowInput[];
  targetMarks: number;
  preferredHeaderTemplateId: string | null;
};

export type WorkspacePaperTemplateSummary = {
  id: string;
  name: string;
  description: string | null;
  version: number;
  subjectId: string;
  subjectName: string;
  targetMarks: number;
  topicCount: number;
  rowCount: number;
  preferredHeaderTemplateId: string | null;
  preferredHeaderTemplateName: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  staleReason: string | null;
};

export type WorkspacePaperTemplateTopicSnapshot = {
  id: string;
  name: string;
  sortOrder: number;
};

export type WorkspacePaperTemplateRowSnapshot = WorkspacePaperTemplateRowInput & {
  sortOrder: number;
};

export type WorkspacePaperTemplateSnapshot = WorkspacePaperTemplateSummary & {
  topics: WorkspacePaperTemplateTopicSnapshot[];
  rows: WorkspacePaperTemplateRowSnapshot[];
  preferredHeaderTemplate: PaperHeaderTemplate | null;
};

export type WorkspacePaperTemplateStatus = "active" | "archived";

export type WorkspacePaperTemplateListResult =
  | { success: true; templates: WorkspacePaperTemplateSummary[] }
  | { success: false; error: string };

export type WorkspacePaperTemplateApplyResult =
  | { success: true; template: WorkspacePaperTemplateSnapshot }
  | { success: false; error: string };

export type WorkspacePaperTemplateMutationResult =
  | { success: true; template?: WorkspacePaperTemplateSummary; message: string }
  | { success: false; error: string };

export type ManagedWorkspacePaperTemplate = WorkspacePaperTemplateSnapshot;
