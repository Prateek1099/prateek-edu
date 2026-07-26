import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { WorksheetPaper, WorksheetSolutions } from "@/components/worksheets/WorksheetDocument";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function WorksheetPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const worksheet = await prisma.challenge.findUnique({
    where: { id: id, type: "WORKSHEET" },
    include: {
      questions: { orderBy: { sortOrder: 'asc' } },
      subject: true,
      topic: true
    }
  });

  if (!worksheet) return notFound();

  const worksheetDocument = {
    title: worksheet.title,
    subjectName: worksheet.subject.name,
    topicName: worksheet.topic?.topicName || null,
    createdAt: worksheet.createdAt,
    questions: worksheet.questions.map((question) => ({
      id: question.id,
      questionText: question.questionText,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      topicTag: question.topicTag,
      marks: question.marks,
    })),
  };

  return (
    <div className="mx-auto min-h-screen max-w-4xl py-8 print:py-0">
      <div className="mb-8 flex items-center justify-between rounded-lg border bg-muted/20 p-4 print:hidden">
        <Link href="/admin/worksheets" className="text-sm text-primary hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Worksheets
        </Link>
        <PrintButton label="Print worksheet and solutions" />
      </div>

      <div className="space-y-8">
        <WorksheetPaper worksheet={worksheetDocument} />
        <WorksheetSolutions worksheet={worksheetDocument} />
      </div>
    </div>
  );
}
