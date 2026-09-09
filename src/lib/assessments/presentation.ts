export type StudentAssessmentWorkItem={
  recipientId:string;assignmentId:string;classId:string;className:string;subjectName:string;title:string;
  totalMarks:number;questionCount:number;durationMinutes:number;opensAt:string;closesAt:string;assignedAt:string;
  attemptLimit:number;attemptsUsed:number;
  latestAttempt:null|{id:string;attemptNumber:number;status:string;startedAt:string;expiresAt:string;submittedAt:string|null;releasedScore:number|null};
};

export type AssessmentWorkState="SCHEDULED"|"AVAILABLE"|"IN_PROGRESS"|"SUBMITTED"|"AWAITING_RELEASE"|"RELEASED"|"CLOSED";

export function getAssessmentWorkState(item:StudentAssessmentWorkItem,serverNow:string):AssessmentWorkState {
  const now=new Date(serverNow).getTime();
  const latest=item.latestAttempt;
  if(latest?.status==="IN_PROGRESS") return "IN_PROGRESS";
  if(latest?.status==="SUBMITTED") return "SUBMITTED";
  if(latest?.status==="GRADED") return "AWAITING_RELEASE";
  if(latest?.status==="RELEASED") return "RELEASED";
  if(now<new Date(item.opensAt).getTime()) return "SCHEDULED";
  if(now>=new Date(item.closesAt).getTime()) return "CLOSED";
  return "AVAILABLE";
}

export const ASSESSMENT_WORK_LABELS:Record<AssessmentWorkState,string>={
  SCHEDULED:"Scheduled",AVAILABLE:"Ready to start",IN_PROGRESS:"In progress",SUBMITTED:"Submitted",
  AWAITING_RELEASE:"Result awaiting release",RELEASED:"Result released",CLOSED:"Closed",
};

export function assessmentWorkIsComplete(state: AssessmentWorkState) {
  return state === "SUBMITTED" || state === "AWAITING_RELEASE" || state === "RELEASED";
}
