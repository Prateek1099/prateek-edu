export const REMEDIAL_DIFFICULTIES = ["all", "easy", "medium", "hard"] as const;

export type RemedialDifficulty = (typeof REMEDIAL_DIFFICULTIES)[number];

export type RemedialScopeInput = {
  boardId: string;
  qualificationId: string;
  subjectId: string;
  topicId: string;
  dateRange: "7" | "30";
};

export type RemedialScopeContext = RemedialScopeInput & {
  boardLabel: string;
  qualificationLabel: string;
  subjectLabel: string;
  topicLabel: string;
};

export type RemedialEvidence = {
  attempts: number;
  averageScore: number | null;
  wrongOrUnanswered: number;
  affectedStudents: number;
  sufficientData: boolean;
};

export type RemedialQuestionCandidate = {
  id: string;
  updatedAt: string;
  subjectId: string;
  topicId: string | null;
  workspaceId: string | null;
  questionType: string;
  questionText: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  correctAnswer: string | null;
  explanation: string | null;
  imageUrl: string | null;
  topicTag: string | null;
  difficulty: string;
  marks: number;
};

export type RemedialDraftQuestion = {
  id: string;
  sourceUpdatedAt: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string | null;
  topicTag: string | null;
  difficulty: string;
  marks: number;
};

export type RemedialAvailability = {
  scope: RemedialScopeContext;
  evidence: RemedialEvidence;
  counts: Record<RemedialDifficulty, number>;
};

export type RemedialDraft = RemedialAvailability & {
  difficulty: RemedialDifficulty;
  requestedCount: number;
  questions: RemedialDraftQuestion[];
};

export type RemedialSaveInput = {
  scope: RemedialScopeInput;
  title: string;
  difficulty: RemedialDifficulty;
  questions: Array<{ id: string; sourceUpdatedAt: string }>;
};

export type RemedialActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
