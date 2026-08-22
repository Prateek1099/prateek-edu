import type { BlueprintPaperDraft, BlueprintSelection } from "./blueprint-types";
import type { FinalPaperOrderMode } from "./final-paper-order";
import type { ValidatedPaper } from "./types";

export type SaveGeneratedPaperInput = {
  name: string;
  description: string;
  draft: BlueprintPaperDraft;
  selections: BlueprintSelection[];
  finalOrderMode: FinalPaperOrderMode;
  orderedQuestionIds: string[];
  questionVersions: Array<{ id: string; updatedAt: string }>;
  sourceBlueprintTemplateId: string | null;
};

export type SavedGeneratedPaperFilters = {
  status?: "active" | "archived";
  search?: string;
  boardId?: string;
  qualificationId?: string;
  subjectId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type SavedGeneratedPaperSummary = {
  id: string;
  name: string;
  description: string | null;
  boardId: string | null;
  boardTitle: string;
  qualificationId: string | null;
  qualificationTitle: string;
  subjectId: string | null;
  subjectName: string;
  totalMarks: number;
  durationMinutes: number;
  finalOrderMode: FinalPaperOrderMode;
  sourceBlueprintTemplateName: string | null;
  createdByName: string | null;
  createdByEmail: string | null;
  createdAt: string;
  archivedAt: string | null;
};

export type SavedGeneratedPaperDetail = SavedGeneratedPaperSummary & {
  paper: ValidatedPaper;
};
