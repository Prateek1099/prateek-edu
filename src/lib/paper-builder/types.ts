export const PAPER_TEST_TYPES = [
  "Tuesday Test",
  "Friday Test",
  "Class Test",
  "Revision Test",
] as const;

export const PAPER_DIFFICULTIES = ["any", "easy", "medium", "hard"] as const;

export type PaperTestType = (typeof PAPER_TEST_TYPES)[number];
export type PaperDifficulty = (typeof PAPER_DIFFICULTIES)[number];

export type PaperBuilderQuestion = {
  id: string;
  subjectId: string;
  topicId: string | null;
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
  questionCount: number;
  marksPerQuestion: number;
  difficulty: PaperDifficulty;
};

export type PaperDetails = {
  title: string;
  testType: PaperTestType;
  durationMinutes: number;
  targetMarks: number;
  instructions: string;
};

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
  questionCount: number;
  marksPerQuestion: number;
  difficulty: PaperDifficulty;
  questions: PaperBuilderQuestion[];
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
