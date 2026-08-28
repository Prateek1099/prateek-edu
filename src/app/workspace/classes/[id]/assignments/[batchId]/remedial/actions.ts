"use server";

import { createTeacherRemedialPractice } from "@/lib/remedial-practice/service";
import type { CreateRemedialPracticeInput } from "@/lib/remedial-practice/types";

export async function createRemedialPracticeAction(input: CreateRemedialPracticeInput) {
  return createTeacherRemedialPractice(input);
}
