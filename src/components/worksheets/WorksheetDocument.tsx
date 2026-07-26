export type WorksheetQuestion = {
  id: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string | null;
  topicTag: string | null;
  marks: number;
};

export type WorksheetDocumentData = {
  title: string;
  subjectName: string;
  topicName: string | null;
  createdAt: Date | string;
  questions: WorksheetQuestion[];
};

export function WorksheetPaper({ worksheet }: { worksheet: WorksheetDocumentData }) {
  const totalMarks = worksheet.questions.reduce((sum, question) => sum + question.marks, 0);

  return (
    <article className="worksheet-print-root rounded-2xl border bg-white p-6 text-black shadow-sm sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <header className="mb-8 flex items-start justify-between gap-6 border-b-2 border-black pb-4">
        <div>
          <h2 className="text-3xl font-bold uppercase tracking-tight">Vexa</h2>
          <p className="mt-1 text-sm font-semibold text-gray-600">Student Worksheet</p>
        </div>
        <div className="text-right">
          <h1 className="text-xl font-bold">{worksheet.title}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {worksheet.subjectName}
            {worksheet.topicName ? ` · ${worksheet.topicName}` : ""}
          </p>
          <p className="text-sm text-gray-600">
            Date: {new Date(worksheet.createdAt).toLocaleDateString()}
          </p>
        </div>
      </header>

      <div className="mb-10 flex items-end justify-between gap-6">
        <div className="w-2/3 border-b border-black pb-1">
          <span className="text-sm font-semibold">Student name:</span>
        </div>
        <div className="w-1/3 border-b border-black pb-1 text-right">
          <span className="text-sm font-semibold">Marks: &nbsp;&nbsp;&nbsp;&nbsp; / {totalMarks}</span>
        </div>
      </div>

      <div className="space-y-10">
        {worksheet.questions.map((question, index) => (
          <section key={question.id} className="break-inside-avoid">
            <div className="flex gap-4">
              <span className="text-lg font-bold">{index + 1}.</span>
              <div className="min-w-0 flex-1">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <p className="whitespace-pre-wrap text-base font-medium">{question.questionText}</p>
                  <span className="shrink-0 text-xs text-gray-500">
                    [{question.marks} mark{question.marks === 1 ? "" : "s"}]
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    ["A", question.optionA],
                    ["B", question.optionB],
                    ["C", question.optionC],
                    ["D", question.optionD],
                  ].map(([label, option]) => (
                    <div key={label} className="flex items-start gap-3">
                      <span className="mt-0.5 size-5 shrink-0 rounded-full border border-black" aria-hidden />
                      <span className="text-sm">
                        <strong>{label}.</strong> {option}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

export function WorksheetSolutions({ worksheet }: { worksheet: WorksheetDocumentData }) {
  return (
    <section className="break-before-page rounded-2xl border bg-white p-6 text-black shadow-sm sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <div className="mb-6 border-b-2 border-black pb-4">
        <h2 className="text-2xl font-bold">Solutions and teacher notes</h2>
        <p className="mt-1 text-sm text-gray-600">{worksheet.title}</p>
      </div>

      <div className="space-y-5">
        {worksheet.questions.map((question, index) => (
          <div key={question.id} className="break-inside-avoid border-b border-gray-200 pb-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-bold">{index + 1}.</span>
              <span className="font-semibold">Answer {question.correctAnswer}</span>
              {question.topicTag && <span className="text-xs text-gray-500">({question.topicTag})</span>}
            </div>
            {question.explanation && (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{question.explanation}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
