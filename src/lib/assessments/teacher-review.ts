import "server-only";

import type { BankQuestionType } from "@prisma/client";

import {
  assertObjectiveAnswerKey,
  demand,
  objectiveResponseIsCorrect,
  parseResponse,
} from "./rules";

type ReviewQuestionEvidence = {
  id: string;
  sectionLabel: string;
  questionNumber: number;
  questionType: BankQuestionType;
  questionText: string;
  options: unknown;
  marks: number;
  correctAnswer: string | null;
  explanation: string | null;
};

type ReviewResponseEvidence = {
  questionId: string;
  versionId: string;
  state: string;
  value: unknown;
};

function objectiveOptions(question: ReviewQuestionEvidence) {
  if (question.questionType === "TRUE_FALSE") return [];
  demand(
    question.options !== null &&
      typeof question.options === "object" &&
      !Array.isArray(question.options),
    "INVALID_SOURCE",
    "Assessment answer options are incomplete.",
  );
  const source = question.options as Record<string, unknown>;
  return (["A", "B", "C", "D"] as const).map((key) => {
    demand(
      typeof source[key] === "string" && source[key].trim().length > 0,
      "INVALID_SOURCE",
      "Assessment answer options are incomplete.",
    );
    return { key, text: source[key] as string };
  });
}

function answerLabel(
  questionType: BankQuestionType,
  answer: ReturnType<typeof parseResponse>,
  options: Array<{ key: "A" | "B" | "C" | "D"; text: string }>,
) {
  if (!answer) return null;
  if (questionType === "TRUE_FALSE") {
    demand(answer.kind === "boolean", "INVALID_SOURCE", "Assessment response evidence is invalid.");
    return answer.value ? "True" : "False";
  }
  demand(answer.kind === "choice", "INVALID_SOURCE", "Assessment response evidence is invalid.");
  const option = options.find((item) => item.key === answer.value);
  demand(option, "INVALID_SOURCE", "Assessment answer option is missing.");
  return `${option.key}. ${option.text}`;
}

export function buildTeacherQuestionReview(input: {
  versionId: string;
  totalMarks: number;
  awardedMarks: number;
  questions: ReviewQuestionEvidence[];
  responses: ReviewResponseEvidence[];
}) {
  demand(input.questions.length > 0, "INVALID_SOURCE", "Assessment questions are missing.");
  demand(
    input.responses.length === input.questions.length,
    "INVALID_SOURCE",
    "Assessment response evidence is incomplete.",
  );
  const responseByQuestion = new Map(input.responses.map((response) => [response.questionId, response]));
  const orderedQuestions = [...input.questions].sort((left, right) => left.questionNumber - right.questionNumber);
  demand(
    new Set(orderedQuestions.map((question) => question.questionNumber)).size === orderedQuestions.length,
    "INVALID_SOURCE",
    "Assessment question order is invalid.",
  );

  let calculatedTotalMarks = 0;
  let calculatedAwardedMarks = 0;
  const review = orderedQuestions.map((question, index) => {
    demand(
      question.questionNumber === index + 1 && Number.isInteger(question.marks) && question.marks > 0,
      "INVALID_SOURCE",
      "Assessment question order or marks are invalid.",
    );
    assertObjectiveAnswerKey(question.questionType, question.correctAnswer);
    const response = responseByQuestion.get(question.id);
    demand(
      response && response.versionId === input.versionId,
      "INVALID_SOURCE",
      "Assessment response evidence is incomplete.",
    );
    const options = objectiveOptions(question);
    const studentResponse = response.state === "ANSWERED" ? parseResponse(question.questionType, response.value) : null;
    demand(
      (response.state === "UNANSWERED" && response.value === null) ||
        (response.state === "ANSWERED" && studentResponse !== null),
      "INVALID_SOURCE",
      "Assessment response evidence is invalid.",
    );
    const correctResponse = question.questionType === "TRUE_FALSE"
      ? { kind: "boolean" as const, value: question.correctAnswer === "TRUE" }
      : { kind: "choice" as const, value: question.correctAnswer as "A" | "B" | "C" | "D" };
    const correct = response.state === "ANSWERED" &&
      objectiveResponseIsCorrect(question.questionType, question.correctAnswer, response.value);
    const status = response.state === "UNANSWERED" ? "UNANSWERED" as const : correct ? "CORRECT" as const : "INCORRECT" as const;
    const marksAwarded = correct ? question.marks : 0;
    calculatedTotalMarks += question.marks;
    calculatedAwardedMarks += marksAwarded;
    return {
      id: question.id,
      sectionLabel: question.sectionLabel,
      number: question.questionNumber,
      type: question.questionType,
      text: question.questionText,
      marks: question.marks,
      options,
      studentAnswer: answerLabel(question.questionType, studentResponse, options),
      correctAnswer: answerLabel(question.questionType, correctResponse, options),
      status,
      marksAwarded,
      explanation: question.explanation,
    };
  });

  demand(calculatedTotalMarks === input.totalMarks, "INVALID_SOURCE", "Assessment total marks are inconsistent.");
  demand(
    calculatedAwardedMarks === input.awardedMarks,
    "LOCKED",
    "The objective grade no longer matches its immutable evidence.",
  );
  return review;
}

export type TeacherQuestionReview = ReturnType<typeof buildTeacherQuestionReview>;
