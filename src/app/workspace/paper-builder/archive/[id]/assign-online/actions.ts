"use server";

import { revalidatePath } from "next/cache";

import { assessmentService } from "@/lib/assessments/service";
import { safeAssessmentActionError } from "@/lib/assessments/rules";
import type { CreateAndAssignAssessmentInput } from "@/lib/assessments/engine";

export async function assignSavedPaperOnline(input:CreateAndAssignAssessmentInput) {
  try {
    const result=await assessmentService.createAndAssignFromSavedPaper(input);
    revalidatePath(`/workspace/paper-builder/archive/${input.sourceSavedPaperId}`);
    revalidatePath(`/workspace/assessments/${result.assignmentId}`);
    return {success:true as const,...result};
  } catch(error) {
    return {success:false as const,error:safeAssessmentActionError(error,"Could not assign this online test.","assign saved paper online")};
  }
}
