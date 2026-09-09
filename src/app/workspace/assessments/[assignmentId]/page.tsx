import { assessmentService } from "@/lib/assessments/service";
import { AssessmentResultsClient } from "./AssessmentResultsClient";

export default async function TeacherAssessmentResultsPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const results = await assessmentService.teacherResults(assignmentId);
  return <AssessmentResultsClient initialResults={results} />;
}
