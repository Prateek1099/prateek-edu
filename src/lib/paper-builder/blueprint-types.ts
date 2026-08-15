import type { BankQuestionTypeValue } from "@/lib/bank-questions";

import type {
  PaperBuilderQuestion,
  PaperDetails,
  PaperDifficulty,
  ValidatedPaper,
} from "./types";

export type BlueprintPaperDraft = {
  version: 1;
  details: PaperDetails;
  boardId: string;
  qualificationId: string;
  subjectId: string;
  targetMarks: number | null;
  chapters: BlueprintChapterDraft[];
};

export type BlueprintChapterDraft = {
  id: string;
  topicId: string;
  topicName: string;
  sortOrder: number;
  rows: BlueprintRowDraft[];
};

export type BlueprintRowDraft = {
  id: string;
  topicId: string;
  sectionLabel: string;
  questionType: BankQuestionTypeValue;
  questionCount: number;
  marksPerQuestion: number;
  difficulty: PaperDifficulty;
};

export type BlueprintAvailability = {
  rowId: string;
  requiredCount: number;
  matchingCount: number;
  uniqueTextCount: number;
  usableCount: number;
  status: "ready" | "low_reserve" | "insufficient";
  warnings: string[];
  errors: string[];
};

export type BlueprintSelection = {
  rowId: string;
  questionIds: string[];
};

export type BlueprintGeneratedRow = BlueprintRowDraft & {
  topicName: string;
  questions: PaperBuilderQuestion[];
};

export type BlueprintGenerationResult = {
  paper: ValidatedPaper;
  rows: BlueprintGeneratedRow[];
  selections: BlueprintSelection[];
};
