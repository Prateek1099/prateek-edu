import type { BankQuestionTypeValue } from "@/lib/bank-questions";

export const TEACHER_GLOBAL_PAPER_QUESTION_TYPES = [
  "MCQ",
  "TRUE_FALSE",
  "FILL_BLANK",
  "ASSERTION_REASON",
  "VERY_SHORT_ANSWER",
  "SHORT_ANSWER",
  "LONG_ANSWER",
] as const satisfies readonly BankQuestionTypeValue[];

export const TEACHER_WORKSPACE_PAPER_QUESTION_TYPES = [
  "MCQ",
] as const satisfies readonly BankQuestionTypeValue[];
