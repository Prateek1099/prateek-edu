import type { AssessmentAttempt, AssessmentQuestion, AssessmentResponse, AssessmentVersion, AssessmentSection } from "@prisma/client";
import { demand, objectiveResponseIsCorrect, parseResponse } from "./rules";

// A whitelist, not Omit<T>. Never return a raw paper/version or spread its fields.
export function studentAssessmentDto(version: AssessmentVersion & {sections: Array<AssessmentSection & {questions: AssessmentQuestion[]}>}) {
  const h = version.header as Record<string,unknown>;
  const text = (key:string) => typeof h[key] === "string" ? h[key] as string : "";
  const header = {
    institutionName:text("institutionName"), examLabel:text("examLabel"), title:text("title"),
    courseLine:text("courseLine"), topicLine:text("topicLine"), dateText:text("dateText"), classText:text("classText"),
    instructions:text("instructions"), boardTitle:text("boardTitle"), qualificationTitle:text("qualificationTitle"),
    subjectName:text("subjectName"), showStudentName:h.showStudentName === true, showRollNumber:h.showRollNumber === true,
  };
  const dto = {id:version.id, title:version.title, totalMarks:version.totalMarks, header,
    sections:[...version.sections].sort((a,b) => a.sortOrder-b.sortOrder).map(s => ({
      id:s.id, label:s.label, questions:[...s.questions].sort((a,b) => a.questionNumber-b.questionNumber).map(q => {
        const raw = q.options as Record<string,unknown>;
        const options = q.questionType === "MCQ" || q.questionType === "ASSERTION_REASON"
          ? ["A","B","C","D"].map(key => ({key, text:typeof raw[key] === "string" ? raw[key] as string : ""})) : [];
        return {id:q.id, number:q.questionNumber, type:q.questionType, text:q.questionText, marks:q.marks, options};
      }),
    })),
  };
  demand(!/public\.blob\.vercel-storage\.com|data:(?:image|audio|video)\//i.test(JSON.stringify(dto)),
    "MEDIA_UNSUPPORTED","Assessment media is not supported.");
  return dto;
}
export type StudentAssessmentDto = ReturnType<typeof studentAssessmentDto>;

type VersionWithQuestions = AssessmentVersion & {
  sections: Array<AssessmentSection & {questions: AssessmentQuestion[]}>;
};

// A released-result whitelist. The unreleased branch deliberately has no marks,
// paper, responses, answer keys, explanations, or marking configuration fields.
export function studentResultDto(
  version: VersionWithQuestions,
  attempt: AssessmentAttempt,
  responses: AssessmentResponse[],
) {
  const submittedAt=attempt.submittedAt?.toISOString()??null;
  if(attempt.status!=="RELEASED") {
    return {released:false as const,status:attempt.status,title:version.title,submittedAt};
  }
  demand(attempt.awardedMarks!==null&&attempt.releasedAt,"LOCKED","The released result is incomplete.");
  const responseByQuestion=new Map(responses.map(response=>[response.questionId,response]));
  const sourceByQuestion=new Map(
    version.sections.flatMap(section=>section.questions).map(question=>[question.id,question]),
  );
  const base=studentAssessmentDto(version);
  return {
    released:true as const,
    status:attempt.status,
    title:version.title,
    submittedAt,
    releasedAt:attempt.releasedAt.toISOString(),
    awardedMarks:Number(attempt.awardedMarks),
    totalMarks:version.totalMarks,
    percentage:Math.round(Number(attempt.awardedMarks)/version.totalMarks*10000)/100,
    paper:{...base,sections:base.sections.map(section=>({
      ...section,
      questions:section.questions.map(question=>{
        const source=sourceByQuestion.get(question.id)!;
        const response=responseByQuestion.get(question.id);
        const value=response?.state==="ANSWERED"?parseResponse(source.questionType,response.value):null;
        const correctResponse=source.questionType==="TRUE_FALSE"
          ? {kind:"boolean" as const,value:source.correctAnswer==="TRUE"}
          : {kind:"choice" as const,value:source.correctAnswer as "A"|"B"|"C"|"D"};
        return {...question,response:value,correctResponse,
          correct:response?.state==="ANSWERED"&&objectiveResponseIsCorrect(source.questionType,source.correctAnswer,response.value),
          explanation:source.explanation};
      }),
    }))},
  };
}
export type StudentAssessmentResultDto = ReturnType<typeof studentResultDto>;
