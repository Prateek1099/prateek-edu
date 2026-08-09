import type { ValidatedPaper } from "@/lib/paper-builder/types";

function PaperHeader({ paper, answerKey = false }: { paper: ValidatedPaper; answerKey?: boolean }) {
  return (
    <header className="mb-8 border-b-2 border-black pb-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-2xl font-black uppercase tracking-tight">Vexa</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-gray-600">
            {answerKey ? "Teacher answer key" : paper.details.testType}
          </p>
        </div>
        <div className="text-right">
          <h1 className="text-xl font-bold">{paper.details.title}</h1>
          <p className="mt-1 text-sm text-gray-700">
            {paper.subjectName} · {paper.qualificationTitle} · {paper.boardTitle}
          </p>
          <p className="mt-1 text-xs text-gray-500">{paper.topicNames.join(" · ")}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><span className="font-semibold">Duration:</span> {paper.details.durationMinutes} minutes</div>
        <div><span className="font-semibold">Maximum marks:</span> {paper.totalMarks}</div>
        <div><span className="font-semibold">Date:</span> __________________</div>
        <div><span className="font-semibold">Class:</span> __________________</div>
      </div>
    </header>
  );
}

function sectionTitle(index: number, count: number, marks: number, difficulty: string) {
  const difficultyLabel = difficulty === "any" ? "Mixed difficulty" : `${difficulty[0].toUpperCase()}${difficulty.slice(1)}`;
  return `Section ${String.fromCharCode(65 + index)} · ${count} × ${marks} mark${marks === 1 ? "" : "s"} · ${difficultyLabel}`;
}

function numberedSections(paper: ValidatedPaper) {
  return paper.sections.map((section, sectionIndex) => {
    const offset = paper.sections
      .slice(0, sectionIndex)
      .reduce((total, previous) => total + previous.questions.length, 0);

    return {
      section,
      questions: section.questions.map((question, index) => ({
        question,
        number: offset + index + 1,
      })),
    };
  });
}

export function PaperQuestionDocument({ paper }: { paper: ValidatedPaper }) {
  const sections = numberedSections(paper);

  return (
    <article className="paper-print-question paper-builder-print-root rounded-2xl border bg-white p-6 text-black shadow-sm sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <PaperHeader paper={paper} />

      <div className="mb-8 grid gap-4 sm:grid-cols-[minmax(0,1fr)_15rem]">
        <div>
          <p className="text-sm font-bold">Instructions</p>
          {paper.details.instructions ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
              {paper.details.instructions}
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-gray-700">
              Attempt all questions. Select the single best answer for each question.
            </p>
          )}
        </div>
        <div className="space-y-4 text-sm">
          <div className="border-b border-black pb-1"><span className="font-semibold">Student name:</span></div>
          <div className="border-b border-black pb-1"><span className="font-semibold">Roll number:</span></div>
        </div>
      </div>

      <div className="space-y-9">
        {sections.map(({ section, questions }, sectionIndex) => (
          <section key={section.patternId}>
            <h2 className="mb-5 border-b border-gray-300 pb-2 text-sm font-bold uppercase tracking-wide">
              {sectionTitle(sectionIndex, section.questionCount, section.marksPerQuestion, section.difficulty)}
            </h2>
            <div className="space-y-8">
              {questions.map(({ question, number }) => {
                return (
                  <div key={question.id} className="break-inside-avoid">
                    <div className="flex items-start gap-3">
                      <span className="w-7 shrink-0 font-bold">{number}.</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <p className="whitespace-pre-wrap text-sm font-medium leading-6 sm:text-base">
                            {question.questionText}
                          </p>
                          <span className="shrink-0 text-xs text-gray-500">
                            [{question.marks} mark{question.marks === 1 ? "" : "s"}]
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {[
                            ["A", question.optionA],
                            ["B", question.optionB],
                            ["C", question.optionC],
                            ["D", question.optionD],
                          ].map(([label, option]) => (
                            <div key={label} className="flex items-start gap-2 text-sm">
                              <span className="mt-0.5 size-5 shrink-0 rounded-full border border-black" aria-hidden />
                              <span><strong>{label}.</strong> {option}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

export function PaperAnswerKeyDocument({ paper }: { paper: ValidatedPaper }) {
  const sections = numberedSections(paper);

  return (
    <article className="paper-print-answer paper-builder-print-root rounded-2xl border bg-white p-6 text-black shadow-sm sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <PaperHeader paper={paper} answerKey />
      <div className="space-y-7">
        {sections.map(({ section, questions }, sectionIndex) => (
          <section key={section.patternId}>
            <h2 className="mb-4 border-b border-gray-300 pb-2 text-sm font-bold uppercase tracking-wide">
              {sectionTitle(sectionIndex, section.questionCount, section.marksPerQuestion, section.difficulty)}
            </h2>
            <div className="space-y-4">
              {questions.map(({ question, number }) => {
                return (
                  <div key={question.id} className="break-inside-avoid rounded-lg border border-gray-200 p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold">
                        {number}. Answer {question.correctAnswer}
                      </p>
                      <p className="text-xs text-gray-500">
                        {question.topicName ?? question.topicTag ?? "Selected topic"} · {question.marks} mark{question.marks === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{question.questionText}</p>
                    {question.explanation && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                        <span className="font-semibold text-gray-800">Explanation:</span> {question.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
