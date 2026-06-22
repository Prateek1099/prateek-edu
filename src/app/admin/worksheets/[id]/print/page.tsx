import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
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

  return (
    <div className="max-w-4xl mx-auto py-8 print:py-0 bg-white text-black min-h-screen">
      
      {/* Controls - Hidden during print */}
      <div className="print-hidden mb-8 flex justify-between items-center bg-muted/20 p-4 rounded-lg border border-border">
        <Link href="/admin/worksheets" className="text-sm text-primary hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Worksheets
        </Link>
        <div className="space-x-4">
          <PrintButton />
        </div>
      </div>

      {/* PDF Document Area */}
      <div className="print-only-block bg-white text-black p-8 sm:p-12 shadow-sm border print:shadow-none print:border-none rounded-xl print:rounded-none">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight uppercase">ExamNest</h1>
            <p className="text-sm font-semibold text-gray-600 mt-1">Intelligent Worksheet Generator</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">{worksheet.title}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {worksheet.subject.name} {worksheet.topic ? `| ${worksheet.topic.topicName}` : ""}
            </p>
            <p className="text-sm text-gray-600">Date: {new Date(worksheet.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Student Name Block */}
        <div className="flex justify-between items-end mb-10">
          <div className="w-1/2 border-b border-black pb-1">
            <span className="font-semibold text-sm">Student Name:</span>
          </div>
          <div className="w-1/4 border-b border-black pb-1 text-right">
            <span className="font-semibold text-sm">Score: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; / {worksheet.questions.length}</span>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-12">
          {worksheet.questions.map((q, i) => (
            <div key={q.id} className="break-inside-avoid">
              <div className="flex gap-4">
                <span className="font-bold text-lg">{i + 1}.</span>
                <div className="flex-1">
                  <p className="text-base font-medium mb-4 whitespace-pre-wrap">{q.questionText}</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full border border-black flex-shrink-0"></div>
                      <span className="text-sm">A. {q.optionA}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full border border-black flex-shrink-0"></div>
                      <span className="text-sm">B. {q.optionB}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full border border-black flex-shrink-0"></div>
                      <span className="text-sm">C. {q.optionC}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full border border-black flex-shrink-0"></div>
                      <span className="text-sm">D. {q.optionD}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Page Break before Answer Key */}
      <div className="break-before-page pt-12 print-only-block bg-white text-black p-8 sm:p-12 print:p-0">
        <h2 className="text-2xl font-bold border-b-2 border-black pb-4 mb-8">Answer Key & Teacher Notes</h2>
        <div className="grid grid-cols-2 gap-x-12 gap-y-4">
          {worksheet.questions.map((q, i) => (
            <div key={q.id} className="text-sm border-b pb-2 border-gray-200">
              <span className="font-bold">{i + 1}.</span> {q.correctAnswer}
              {q.topicTag && <span className="ml-2 text-xs text-gray-500">({q.topicTag})</span>}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
