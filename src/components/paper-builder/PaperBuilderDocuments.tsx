/* eslint-disable @next/next/no-img-element */

import { BANK_QUESTION_TYPE_LABELS } from "@/lib/bank-questions";
import type {
  PaperBuilderQuestion,
  ValidatedPaper,
  ValidatedPaperSection,
} from "@/lib/paper-builder/types";

function PaperHeader({ paper, answerKey = false }: { paper: ValidatedPaper; answerKey?: boolean }) {
  const blankLine = "__________________";
  const identityLine = [paper.details.examLabel, paper.details.courseLine]
    .filter((value) => value.trim())
    .join(" · ");

  return (
    <header className="mb-8 border-b-2 border-black pb-5">
      <div className="text-center">
        <p className="text-2xl font-black uppercase tracking-tight">{paper.details.institutionName}</p>
        <p className="mt-2 text-sm font-bold uppercase tracking-wide text-gray-700">
          {identityLine}
        </p>
        {answerKey && <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Teacher answer key</p>}
        {paper.details.title && <h1 className="mt-3 text-xl font-bold">{paper.details.title}</h1>}
        {paper.details.topicLine && <p className="mt-1 text-sm text-gray-600">{paper.details.topicLine}</p>}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><span className="font-semibold">Duration:</span> {paper.details.durationMinutes} minutes</div>
        <div><span className="font-semibold">Maximum marks:</span> {paper.totalMarks}</div>
        <div><span className="font-semibold">Date:</span> {paper.details.dateText || blankLine}</div>
        <div><span className="font-semibold">Class:</span> {paper.details.classText || blankLine}</div>
      </div>
    </header>
  );
}

function sectionTitle(section: ValidatedPaperSection) {
  if (section.isMixedOutput) {
    const marks = section.questions.reduce((total, question) => total + question.marks, 0);
    return `${section.label} · ${section.questionCount} questions · ${marks} marks`;
  }
  return `${section.label} · ${BANK_QUESTION_TYPE_LABELS[section.questionType]} · ${section.questionCount} × ${section.marksPerQuestion} mark${section.marksPerQuestion === 1 ? "" : "s"}`;
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

function optionRows(question: PaperBuilderQuestion) {
  return [
    ["A", question.optionA],
    ["B", question.optionB],
    ["C", question.optionC],
    ["D", question.optionD],
  ] as const;
}

function WrittenAnswerSpace({ question }: { question: PaperBuilderQuestion }) {
  const lineCount = question.questionType === "LONG_ANSWER"
    ? 7
    : question.questionType === "SHORT_ANSWER"
      ? 4
      : question.questionType === "VERY_SHORT_ANSWER"
        ? 2
        : 0;

  if (lineCount === 0) return null;
  return (
    <div className="mt-4 space-y-5" aria-label="Answer space">
      {Array.from({ length: lineCount }, (_, index) => <div key={index} className="border-b border-gray-300" />)}
    </div>
  );
}

function QuestionVisual({ question }: { question: PaperBuilderQuestion }) {
  if (!question.imageUrl) return null;

  return (
    <figure className="mt-4 break-inside-avoid text-center">
      <img
        src={question.imageUrl}
        alt={question.imageAlt || question.imageCaption || "Supporting visual for this question"}
        className="mx-auto max-h-[28rem] w-auto max-w-full object-contain print:max-h-[22rem]"
      />
      {question.imageCaption && (
        <figcaption className="mt-2 text-xs leading-5 text-gray-600">
          {question.imageCaption}
        </figcaption>
      )}
    </figure>
  );
}

function answerFor(question: PaperBuilderQuestion) {
  if (question.questionType === "MCQ" || question.questionType === "ASSERTION_REASON") {
    const option = optionRows(question).find(([label]) => label === question.correctAnswer)?.[1];
    return option ? `${question.correctAnswer}. ${option}` : question.correctAnswer;
  }
  if (question.questionType === "TRUE_FALSE" || question.questionType === "FILL_BLANK") {
    return question.correctAnswer;
  }
  return question.modelAnswer;
}

export function PaperQuestionDocument({ paper }: { paper: ValidatedPaper }) {
  const sections = numberedSections(paper);
  const showStudentDetails = paper.details.showStudentName || paper.details.showRollNumber;

  return (
    <article className="paper-print-question paper-builder-print-root rounded-2xl border bg-white p-6 text-black shadow-sm sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <PaperHeader paper={paper} />

      <div className={showStudentDetails ? "mb-8 grid gap-4 sm:grid-cols-[minmax(0,1fr)_15rem]" : "mb-8"}>
        <div>
          <p className="text-sm font-bold">Instructions</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
            {paper.details.instructions || "Attempt all questions."}
          </p>
        </div>
        {showStudentDetails && (
          <div className="space-y-4 text-sm">
            {paper.details.showStudentName && <div className="border-b border-black pb-1"><span className="font-semibold">Student name:</span></div>}
            {paper.details.showRollNumber && <div className="border-b border-black pb-1"><span className="font-semibold">Roll number:</span></div>}
          </div>
        )}
      </div>

      <div className="space-y-9">
        {sections.map(({ section, questions }) => (
          <section key={section.patternId}>
            <h2 className="mb-5 border-b border-gray-300 pb-2 text-sm font-bold uppercase tracking-wide">
              {sectionTitle(section)}
            </h2>
            <div className="space-y-8">
              {questions.map(({ question, number }) => {
                const showsOptions = question.questionType === "MCQ" || question.questionType === "ASSERTION_REASON";
                return (
                  <div key={question.id} className="break-inside-avoid">
                    <div className="flex items-start gap-3">
                      <span className="w-7 shrink-0 font-bold">{number}.</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <p className="whitespace-pre-wrap text-sm font-medium leading-6 sm:text-base">{question.questionText}</p>
                          <span className="shrink-0 text-xs text-gray-500">[{question.marks} mark{question.marks === 1 ? "" : "s"}]</span>
                        </div>
                        <QuestionVisual question={question} />
                        {showsOptions && (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {optionRows(question).map(([label, option]) => (
                              <div key={label} className="flex items-start gap-2 text-sm">
                                <span className="mt-0.5 size-5 shrink-0 rounded-full border border-black" aria-hidden />
                                <span><strong>{label}.</strong> {option}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <WrittenAnswerSpace question={question} />
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
        {sections.map(({ section, questions }) => (
          <section key={section.patternId}>
            <h2 className="mb-4 border-b border-gray-300 pb-2 text-sm font-bold uppercase tracking-wide">
              {sectionTitle(section)}
            </h2>
            <div className="space-y-4">
              {questions.map(({ question, number }) => (
                <div key={question.id} className="break-inside-avoid rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{number}. {BANK_QUESTION_TYPE_LABELS[question.questionType]}</p>
                    <p className="text-xs text-gray-500">{question.topicName ?? question.topicTag ?? "Selected topic"} · {question.marks} mark{question.marks === 1 ? "" : "s"}</p>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{question.questionText}</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-800">
                    <span className="font-semibold">Answer:</span> {answerFor(question)}
                  </p>
                  {question.explanation && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                      <span className="font-semibold text-gray-800">Explanation:</span> {question.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
