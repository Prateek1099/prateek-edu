import {
  BANK_QUESTION_TYPES,
  type BankQuestionTypeValue,
} from "@/lib/bank-questions";

export const PAPER_QUESTION_TYPES = BANK_QUESTION_TYPES;
export const PAPER_DIFFICULTIES = ["any", "easy", "medium", "hard"] as const;

export type PaperDifficulty = (typeof PAPER_DIFFICULTIES)[number];

export type PaperBuilderQuestion = {
  id: string;
  subjectId: string;
  topicId: string | null;
  questionType: BankQuestionTypeValue;
  questionText: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  correctAnswer: string | null;
  modelAnswer: string | null;
  explanation: string | null;
  source?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageCaption?: string | null;
  topicTag: string | null;
  difficulty: string;
  marks: number;
  topicName: string | null;
};

export type PaperBuilderSubject = {
  id: string;
  name: string;
  code: string | null;
  boardId: string;
  boardName: string;
  boardTitle: string;
  qualificationId: string;
  qualificationName: string;
  qualificationTitle: string;
};

export type PaperBuilderTopic = {
  id: string;
  subjectId: string;
  name: string;
  sortOrder: number;
};

export type PaperPatternRow = {
  id: string;
  label: string;
  questionType: BankQuestionTypeValue;
  questionCount: number;
  marksPerQuestion: number;
  difficulty: PaperDifficulty;
};

export type PaperDetails = {
  institutionName: string;
  examLabel: string;
  title: string;
  courseLine: string;
  topicLine: string;
  durationMinutes: number;
  dateText: string;
  classText: string;
  showStudentName: boolean;
  showRollNumber: boolean;
  instructions: string;
};

export type PaperHeaderTemplate = {
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
};

export type PaperHeaderTemplateInput = Omit<PaperHeaderTemplate, "id">;

export type PaperSectionSelection = {
  patternId: string;
  questionIds: string[];
};

export type PaperValidationInput = {
  details: PaperDetails;
  subjectId: string;
  topicIds: string[];
  patterns: PaperPatternRow[];
  sections: PaperSectionSelection[];
};

export type ValidatedPaperSection = {
  patternId: string;
  label: string;
  questionType: BankQuestionTypeValue;
  questionCount: number;
  marksPerQuestion: number;
  difficulty: PaperDifficulty;
  questions: PaperBuilderQuestion[];
  isMixedOutput?: boolean;
};

export type ValidatedPaper = {
  details: PaperDetails;
  boardTitle: string;
  qualificationTitle: string;
  subjectName: string;
  topicNames: string[];
  totalMarks: number;
  sections: ValidatedPaperSection[];
};
