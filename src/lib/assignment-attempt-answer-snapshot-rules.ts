export const MCQ_OPTION_KEYS = ["A", "B", "C", "D"] as const;

export type McqOptionKey = (typeof MCQ_OPTION_KEYS)[number];

export type SnapshotQuestion = {
  id: string;
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

export type AnswerSnapshotDraft = {
  questionId: string;
  questionType: "MCQ";
  questionText: string;
  options: Record<McqOptionKey, string>;
  selectedOptionKey: McqOptionKey;
  selectedOptionText: string;
  correctOptionKey: McqOptionKey;
  correctOptionText: string;
  explanation: string | null;
  topicId: string | null;
  subjectId: string;
  topicLabel: string | null;
  difficulty: string;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
};

type SnapshotResult =
  | { success: true; answers: Record<string, McqOptionKey>; snapshots: AnswerSnapshotDraft[] }
  | { success: false; error: string };

function normalizeOptionKey(value: unknown): McqOptionKey | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return MCQ_OPTION_KEYS.includes(normalized as McqOptionKey)
    ? (normalized as McqOptionKey)
    : null;
}

export function validateAnswersAndBuildSnapshots({
  submittedAnswers,
  questions,
  subjectId,
  topicId,
  topicName,
}: {
  submittedAnswers: unknown;
  questions: SnapshotQuestion[];
  subjectId: string;
  topicId: string | null;
  topicName: string | null;
}): SnapshotResult {
  if (!submittedAnswers || typeof submittedAnswers !== "object" || Array.isArray(submittedAnswers)) {
    return { success: false, error: "Answers must be submitted as a question-to-option map." };
  }

  const rawAnswers = submittedAnswers as Record<string, unknown>;
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const answers: Record<string, McqOptionKey> = {};
  const snapshots: AnswerSnapshotDraft[] = [];

  for (const [questionId, rawAnswer] of Object.entries(rawAnswers)) {
    if (rawAnswer === "" || rawAnswer === null || rawAnswer === undefined) continue;

    const question = questionById.get(questionId);
    if (!question) {
      return { success: false, error: "An answer was submitted for a question outside this practice." };
    }

    const selectedOptionKey = normalizeOptionKey(rawAnswer);
    if (!selectedOptionKey) {
      return { success: false, error: `Question ${questionId} has an invalid selected option.` };
    }

    const correctOptionKey = normalizeOptionKey(question.correctAnswer);
    if (!correctOptionKey) {
      return { success: false, error: "This practice contains a question with an invalid correct answer." };
    }

    const options: Record<McqOptionKey, string> = {
      A: question.optionA,
      B: question.optionB,
      C: question.optionC,
      D: question.optionD,
    };
    const maxMarks = Number.isInteger(question.marks) && question.marks > 0 ? question.marks : 1;
    const isCorrect = selectedOptionKey === correctOptionKey;

    answers[questionId] = selectedOptionKey;
    snapshots.push({
      questionId,
      questionType: "MCQ",
      questionText: question.questionText,
      options,
      selectedOptionKey,
      selectedOptionText: options[selectedOptionKey],
      correctOptionKey,
      correctOptionText: options[correctOptionKey],
      explanation: question.explanation,
      topicId,
      subjectId,
      topicLabel: question.topicTag || topicName,
      difficulty: question.difficulty,
      isCorrect,
      marksAwarded: isCorrect ? maxMarks : 0,
      maxMarks,
    });
  }

  return { success: true, answers, snapshots };
}

export function readOptionSnapshot(value: unknown): Record<McqOptionKey, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (!MCQ_OPTION_KEYS.every((key) => typeof candidate[key] === "string")) return null;
  return {
    A: candidate.A as string,
    B: candidate.B as string,
    C: candidate.C as string,
    D: candidate.D as string,
  };
}
