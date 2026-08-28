export type RemedialPracticeWeakTopic = {
  id: string;
  name: string;
  mistakeCount: number;
  affectedStudentCount: number;
};

export type RemedialPracticeStudent = {
  id: string;
  name: string | null;
  email: string | null;
  sourceRecipient: boolean;
  mistakeCount: number;
};

export type RemedialPracticeCandidate = {
  id: string;
  topicId: string;
  topicName: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  difficulty: string;
  marks: number;
  usedInSourceAssignment: boolean;
};

export type RemedialPracticeContext = {
  classId: string;
  className: string;
  batchId: string;
  sourceChallengeId: string;
  sourceChallengeTitle: string;
  subjectId: string;
  subjectName: string;
  weakTopics: RemedialPracticeWeakTopic[];
  students: RemedialPracticeStudent[];
  candidates: RemedialPracticeCandidate[];
  suggestedQuestionIds: string[];
  suggestedStudentIds: string[];
  freshCandidateCount: number;
  reusedCandidateCount: number;
};

export type CreateRemedialPracticeInput = {
  classId: string;
  batchId: string;
  title: string;
  questionIds: string[];
  studentIds: string[];
  dueDate?: string | null;
};

export type RemedialPracticeActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
