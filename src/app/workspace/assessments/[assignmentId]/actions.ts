"use server";

import { revalidatePath } from "next/cache";
import { safeAssessmentActionError } from "@/lib/assessments/rules";
import { assessmentService } from "@/lib/assessments/service";

export async function releaseOnlineAssessmentResult(assignmentId:string,attemptId:string) {
  try {
    const attempt=await assessmentService.release(assignmentId,attemptId);
    revalidatePath(`/workspace/assessments/${assignmentId}`);
    revalidatePath(`/workspace/assessments/${assignmentId}/attempts/${attemptId}`);
    return {success:true as const,attempt};
  } catch(error) {
    return {success:false as const,error:safeAssessmentActionError(error,"Could not release this result.","release online-test result")};
  }
}
