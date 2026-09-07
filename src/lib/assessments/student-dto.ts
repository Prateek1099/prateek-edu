import type { AssessmentQuestion, AssessmentVersion, AssessmentSection } from "@prisma/client";
import { demand } from "./rules";

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
