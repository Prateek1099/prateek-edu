type ClassCreationFields = {
  name: string;
  academicYear: string;
  maxStudents?: number | null;
};

type ClassAcademicRelationship = {
  subjectId?: string | null;
  qualificationId?: string | null;
  subjectQualificationId?: string | null;
  subjectExists: boolean;
  qualificationExists: boolean;
};

type WorkspaceAssessmentFields = {
  title: string;
  subjectId: string;
  questionIds: string[];
  estimatedTime?: number;
  requestedQuestionCount?: number;
};

export function validateClassCreationFields(input: ClassCreationFields): string | null {
  if (!input.name.trim()) return "Enter a class name.";
  if (!input.academicYear.trim()) return "Enter an academic year.";
  if (
    input.maxStudents != null &&
    (!Number.isInteger(input.maxStudents) || input.maxStudents < 1 || input.maxStudents > 500)
  ) {
    return "Class capacity must be a whole number between 1 and 500.";
  }
  return null;
}

export function validateClassAcademicRelationship(
  input: ClassAcademicRelationship,
): string | null {
  if (input.subjectId && !input.subjectExists) return "Choose a valid published subject.";
  if (input.qualificationId && !input.qualificationExists) {
    return "Choose a valid published qualification or class.";
  }
  if (
    input.subjectId &&
    input.qualificationId &&
    input.subjectQualificationId !== input.qualificationId
  ) {
    return "The selected subject does not belong to the selected qualification or class.";
  }
  return null;
}

export function validateWorkspaceAssessmentFields(
  input: WorkspaceAssessmentFields,
): string | null {
  if (!input.title.trim()) return "Enter a title.";
  if (!input.subjectId.trim()) return "Choose a subject.";
  if (!Array.isArray(input.questionIds) || input.questionIds.length === 0) {
    return "Select at least one eligible MCQ question.";
  }
  if (new Set(input.questionIds).size !== input.questionIds.length) {
    return "Remove duplicate questions before creating this content.";
  }
  if (
    input.requestedQuestionCount != null &&
    (!Number.isInteger(input.requestedQuestionCount) || input.requestedQuestionCount < 1)
  ) {
    return "Question count must be a positive whole number.";
  }
  if (
    input.requestedQuestionCount != null &&
    input.questionIds.length !== input.requestedQuestionCount
  ) {
    return `Not enough eligible questions. Found ${input.questionIds.length}, requested ${input.requestedQuestionCount}.`;
  }
  if (
    input.estimatedTime != null &&
    (!Number.isInteger(input.estimatedTime) || input.estimatedTime < 1 || input.estimatedTime > 600)
  ) {
    return "Estimated time must be a whole number between 1 and 600 minutes.";
  }
  return null;
}
