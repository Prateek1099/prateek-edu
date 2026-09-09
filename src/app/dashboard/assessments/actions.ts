"use server";

import { revalidatePath } from "next/cache";

import { safeAssessmentActionError } from "@/lib/assessments/rules";
import { assessmentService } from "@/lib/assessments/service";

function failure(error:unknown,fallback:string,operation:string) {
  return {success:false as const,error:safeAssessmentActionError(error,fallback,operation)};
}

export async function startOnlineAssessment(recipientId:string) {
  try {
    const attempt=await assessmentService.startOrResume(recipientId);
    revalidatePath("/dashboard");revalidatePath("/dashboard/worksheets");
    return {success:true as const,attempt};
  } catch(error) { return failure(error,"Could not start this online test.","start online test"); }
}

export async function saveOnlineAssessmentResponse(input:{attemptId:string;questionId:string;expectedRevision:number;value:unknown}) {
  try {
    const saved=await assessmentService.saveResponse(input.attemptId,input.questionId,input.expectedRevision,input.value);
    return {success:true as const,saved};
  } catch(error) { return failure(error,"Could not save this answer.","save online-test response"); }
}

export async function submitOnlineAssessment(attemptId:string) {
  try {
    const attempt=await assessmentService.submitObjective(attemptId);
    revalidatePath("/dashboard");revalidatePath("/dashboard/worksheets");
    revalidatePath(`/dashboard/assessments/${attemptId}`);revalidatePath(`/dashboard/assessments/${attemptId}/result`);
    return {success:true as const,attempt};
  } catch(error) { return failure(error,"Could not submit this online test.","submit online test"); }
}
