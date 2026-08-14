import { normalizeTrustedQuestionImageUrl } from "./question-bank-image";

export const BANK_QUESTION_TYPES = [
  "MCQ",
  "TRUE_FALSE",
  "FILL_BLANK",
  "ASSERTION_REASON",
  "VERY_SHORT_ANSWER",
  "SHORT_ANSWER",
  "LONG_ANSWER",
] as const;

export type BankQuestionTypeValue = (typeof BANK_QUESTION_TYPES)[number];

export const BANK_QUESTION_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type BankQuestionDifficulty = (typeof BANK_QUESTION_DIFFICULTIES)[number];

export const BANK_QUESTION_TYPE_LABELS: Record<BankQuestionTypeValue, string> = {
  MCQ: "MCQ",
  TRUE_FALSE: "True / False",
  FILL_BLANK: "Fill in the Blank",
  ASSERTION_REASON: "Assertion & Reasoning",
  VERY_SHORT_ANSWER: "Very Short Answer",
  SHORT_ANSWER: "Short Answer",
  LONG_ANSWER: "Long Answer",
};

export type BankQuestionInput = {
  subjectId: string;
  topicId: string | null;
  questionType: BankQuestionTypeValue;
  questionText: string;
  optionA?: string | null;
  optionB?: string | null;
  optionC?: string | null;
  optionD?: string | null;
  correctAnswer?: string | null;
  modelAnswer?: string | null;
  explanation?: string | null;
  source?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageCaption?: string | null;
  topicTag?: string | null;
  difficulty: string;
  marks: number;
};

export type ValidatedBankQuestion = {
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
  source: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  imageCaption: string | null;
  topicTag: string | null;
  difficulty: BankQuestionDifficulty;
  marks: number;
};

export type BankQuestionValidationResult =
  | { success: true; data: ValidatedBankQuestion }
  | { success: false; errors: string[] };

const TYPE_ALIASES = new Map<string, BankQuestionTypeValue>([
  ["MCQ", "MCQ"],
  ["TRUE/FALSE", "TRUE_FALSE"],
  ["TRUE FALSE", "TRUE_FALSE"],
  ["TRUE_FALSE", "TRUE_FALSE"],
  ["FILL_BLANK", "FILL_BLANK"],
  ["FILL IN THE BLANK", "FILL_BLANK"],
  ["FILL IN THE BLANKS", "FILL_BLANK"],
  ["ASSERTION_REASON", "ASSERTION_REASON"],
  ["ASSERTION & REASONING", "ASSERTION_REASON"],
  ["ASSERTION AND REASONING", "ASSERTION_REASON"],
  ["VERY_SHORT_ANSWER", "VERY_SHORT_ANSWER"],
  ["VERY SHORT", "VERY_SHORT_ANSWER"],
  ["VERY SHORT ANSWER", "VERY_SHORT_ANSWER"],
  ["VSA", "VERY_SHORT_ANSWER"],
  ["SHORT_ANSWER", "SHORT_ANSWER"],
  ["SHORT", "SHORT_ANSWER"],
  ["SHORT ANSWER", "SHORT_ANSWER"],
  ["SA", "SHORT_ANSWER"],
  ["LONG_ANSWER", "LONG_ANSWER"],
  ["LONG", "LONG_ANSWER"],
  ["LONG ANSWER", "LONG_ANSWER"],
  ["LA", "LONG_ANSWER"],
]);

function optionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export function normalizeBankQuestionType(value: unknown): BankQuestionTypeValue | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase().replace(/\s+/g, " ");
  return TYPE_ALIASES.get(normalized) ?? null;
}

export function validateBankQuestionInput(input: BankQuestionInput): BankQuestionValidationResult {
  const errors: string[] = [];
  const subjectId = typeof input?.subjectId === "string" ? input.subjectId.trim() : "";
  const topicId = typeof input?.topicId === "string" && input.topicId.trim() ? input.topicId.trim() : null;
  const questionType = normalizeBankQuestionType(input?.questionType);
  const questionText = typeof input?.questionText === "string" ? input.questionText.trim() : "";
  const difficulty = typeof input?.difficulty === "string" ? input.difficulty.trim().toLowerCase() : "";
  const marks = input?.marks;

  if (!subjectId) errors.push("Subject is required.");
  if (!questionType) errors.push("Choose a supported question type.");
  if (!questionText) errors.push("Question text is required.");
  if (questionText.length > 20_000) errors.push("Question text must be 20,000 characters or fewer.");
  if (!BANK_QUESTION_DIFFICULTIES.includes(difficulty as BankQuestionDifficulty)) {
    errors.push("Difficulty must be easy, medium, or hard.");
  }
  if (!Number.isInteger(marks) || marks < 1 || marks > 1_000) {
    errors.push("Marks must be a positive whole number no greater than 1,000.");
  }

  let optionA = optionalText(input?.optionA, 10_000);
  let optionB = optionalText(input?.optionB, 10_000);
  let optionC = optionalText(input?.optionC, 10_000);
  let optionD = optionalText(input?.optionD, 10_000);
  let correctAnswer = optionalText(input?.correctAnswer, 10_000);
  let modelAnswer = optionalText(input?.modelAnswer, 50_000);
  const suppliedImageUrl = optionalText(input?.imageUrl, 5_000);
  const imageUrl = normalizeTrustedQuestionImageUrl(suppliedImageUrl);

  if (suppliedImageUrl && !imageUrl) {
    errors.push("Supporting image must be an uploaded PNG, JPG, or WebP file from trusted Vexa storage.");
  }

  if (questionType === "MCQ" || questionType === "ASSERTION_REASON") {
    if (!optionA || !optionB || !optionC || !optionD) {
      errors.push("Options A, B, C, and D are required for this question type.");
    }
    correctAnswer = correctAnswer?.toUpperCase() ?? null;
    if (!correctAnswer || !["A", "B", "C", "D"].includes(correctAnswer)) {
      errors.push("Correct answer must be A, B, C, or D.");
    }
    modelAnswer = null;
  } else if (questionType === "TRUE_FALSE") {
    correctAnswer = correctAnswer?.toUpperCase() ?? null;
    if (!correctAnswer || !["TRUE", "FALSE"].includes(correctAnswer)) {
      errors.push("Correct answer must be TRUE or FALSE.");
    }
    optionA = null;
    optionB = null;
    optionC = null;
    optionD = null;
    modelAnswer = null;
  } else if (questionType === "FILL_BLANK") {
    if (!correctAnswer) errors.push("A canonical answer is required for a fill-in-the-blank question.");
    optionA = null;
    optionB = null;
    optionC = null;
    optionD = null;
    modelAnswer = null;
  } else if (
    questionType === "VERY_SHORT_ANSWER" ||
    questionType === "SHORT_ANSWER" ||
    questionType === "LONG_ANSWER"
  ) {
    if (!modelAnswer) errors.push("A model answer or marking guidance is required.");
    optionA = null;
    optionB = null;
    optionC = null;
    optionD = null;
    correctAnswer = null;
  }

  if (errors.length > 0 || !questionType) return { success: false, errors };

  return {
    success: true,
    data: {
      subjectId,
      topicId,
      questionType,
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      modelAnswer,
      explanation: optionalText(input?.explanation, 50_000),
      source: optionalText(input?.source, 2_000),
      imageUrl,
      imageAlt: imageUrl ? optionalText(input?.imageAlt, 500) : null,
      imageCaption: imageUrl ? optionalText(input?.imageCaption, 1_000) : null,
      topicTag: optionalText(input?.topicTag, 500),
      difficulty: difficulty as BankQuestionDifficulty,
      marks,
    },
  };
}

export function isMcqCompatibleQuestion(question: {
  questionType: BankQuestionTypeValue;
  questionText: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  correctAnswer: string | null;
  marks: number;
}) {
  return (
    question.questionType === "MCQ" &&
    Boolean(question.questionText.trim()) &&
    Boolean(question.optionA?.trim()) &&
    Boolean(question.optionB?.trim()) &&
    Boolean(question.optionC?.trim()) &&
    Boolean(question.optionD?.trim()) &&
    Boolean(question.correctAnswer && ["A", "B", "C", "D"].includes(question.correctAnswer.trim().toUpperCase())) &&
    Number.isInteger(question.marks) &&
    question.marks > 0
  );
}
