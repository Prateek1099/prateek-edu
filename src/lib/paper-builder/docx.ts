import {
  AlignmentType,
  BorderStyle,
  Document,
  PageBreak,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

import { BANK_QUESTION_TYPE_LABELS } from "@/lib/bank-questions";
import type {
  PaperBuilderQuestion,
  ValidatedPaper,
  ValidatedPaperSection,
} from "@/lib/paper-builder/types";

export type PaperDocxMode = "questions" | "answers" | "both";

const FONT = "Arial";
const BODY_SIZE = 21;
const PAGE_WIDTH = 11_906;
const PAGE_HEIGHT = 16_838;

function text(value: string, options: { bold?: boolean; size?: number; italics?: boolean } = {}) {
  return new TextRun({
    text: value,
    font: FONT,
    size: options.size ?? BODY_SIZE,
    bold: options.bold,
    italics: options.italics,
  });
}

function centered(value: string, options: { bold?: boolean; size?: number; after?: number } = {}) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: options.after ?? 100 },
    children: [text(value, { bold: options.bold, size: options.size })],
  });
}

function paperHeader(paper: ValidatedPaper, answerKey: boolean) {
  const identityLine = [paper.details.examLabel, paper.details.courseLine]
    .filter((value) => value.trim())
    .join(" · ");
  const blankLine = "__________________";
  const paragraphs = [
    centered(paper.details.institutionName.toUpperCase(), { bold: true, size: 32, after: 80 }),
  ];

  if (identityLine) paragraphs.push(centered(identityLine.toUpperCase(), { bold: true, size: 21, after: 70 }));
  if (answerKey) paragraphs.push(centered("TEACHER ANSWER KEY", { bold: true, size: 19, after: 100 }));
  if (paper.details.title.trim()) paragraphs.push(centered(paper.details.title, { bold: true, size: 27, after: 70 }));
  if (paper.details.topicLine.trim()) paragraphs.push(centered(paper.details.topicLine, { size: 20, after: 120 }));

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 60 },
      children: [
        text(`Duration: ${paper.details.durationMinutes} minutes`, { bold: true }),
        text("     "),
        text(`Maximum marks: ${paper.totalMarks}`, { bold: true }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      border: { bottom: { color: "000000", style: BorderStyle.SINGLE, size: 8, space: 8 } },
      children: [
        text(`Date: ${paper.details.dateText || blankLine}`, { bold: true }),
        text("     "),
        text(`Class: ${paper.details.classText || blankLine}`, { bold: true }),
      ],
    }),
  );

  return paragraphs;
}

function sectionTitle(section: ValidatedPaperSection) {
  const marks = section.marksPerQuestion === 1 ? "MARK" : "MARKS";
  return `${section.label} · ${BANK_QUESTION_TYPE_LABELS[section.questionType]} · ${section.questionCount} × ${section.marksPerQuestion} ${marks}`.toUpperCase();
}

function numberedSections(paper: ValidatedPaper) {
  let number = 1;
  return paper.sections.map((section) => ({
    section,
    questions: section.questions.map((question) => ({ question, number: number++ })),
  }));
}

function optionRows(question: PaperBuilderQuestion) {
  return [
    ["A", question.optionA],
    ["B", question.optionB],
    ["C", question.optionC],
    ["D", question.optionD],
  ] as const;
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

function answerSpace(question: PaperBuilderQuestion) {
  const count = question.questionType === "LONG_ANSWER"
    ? 7
    : question.questionType === "SHORT_ANSWER"
      ? 4
      : question.questionType === "VERY_SHORT_ANSWER"
        ? 2
        : 0;

  return Array.from({ length: count }, () => new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({
      text: "________________________________________________________________________________________",
      font: FONT,
      size: 16,
      color: "B7BCC5",
    })],
  }));
}

function questionPaperChildren(paper: ValidatedPaper) {
  const children = [...paperHeader(paper, false)];
  children.push(new Paragraph({
    spacing: { after: 80 },
    children: [text("Instructions", { bold: true })],
  }));
  for (const line of (paper.details.instructions || "Attempt all questions.").split(/\r?\n/)) {
    children.push(new Paragraph({ spacing: { after: 50 }, children: [text(line)] }));
  }
  if (paper.details.showStudentName || paper.details.showRollNumber) {
    const fields = [
      paper.details.showStudentName ? "Student name: ______________________________" : "",
      paper.details.showRollNumber ? "Roll number: ____________________" : "",
    ].filter(Boolean).join("     ");
    children.push(new Paragraph({ spacing: { before: 140, after: 220 }, children: [text(fields, { bold: true })] }));
  } else {
    children.push(new Paragraph({ spacing: { after: 180 } }));
  }

  for (const { section, questions } of numberedSections(paper)) {
    children.push(new Paragraph({
      keepNext: true,
      spacing: { before: 160, after: 140 },
      border: { bottom: { color: "AEB4BD", style: BorderStyle.SINGLE, size: 4, space: 5 } },
      children: [text(sectionTitle(section), { bold: true, size: 22 })],
    }));
    for (const { question, number } of questions) {
      children.push(new Paragraph({
        keepNext: true,
        spacing: { before: 100, after: 90 },
        children: [
          text(`${number}. `, { bold: true }),
          text(question.questionText),
          text(`  [${question.marks} mark${question.marks === 1 ? "" : "s"}]`, { italics: true, size: 18 }),
        ],
      }));
      if (question.questionType === "MCQ" || question.questionType === "ASSERTION_REASON") {
        for (const [label, option] of optionRows(question)) {
          children.push(new Paragraph({
            indent: { left: 360 },
            spacing: { after: 70 },
            children: [text(`${label}. `, { bold: true }), text(option ?? "")],
          }));
        }
      }
      children.push(...answerSpace(question));
    }
  }
  return children;
}

function answerKeyChildren(paper: ValidatedPaper) {
  const children = [...paperHeader(paper, true)];
  for (const { section, questions } of numberedSections(paper)) {
    children.push(new Paragraph({
      keepNext: true,
      spacing: { before: 160, after: 140 },
      border: { bottom: { color: "AEB4BD", style: BorderStyle.SINGLE, size: 4, space: 5 } },
      children: [text(sectionTitle(section), { bold: true, size: 22 })],
    }));
    for (const { question, number } of questions) {
      children.push(
        new Paragraph({
          keepNext: true,
          spacing: { before: 120, after: 70 },
          children: [
            text(`${number}. ${BANK_QUESTION_TYPE_LABELS[question.questionType]} — `, { bold: true }),
            text(question.questionText),
          ],
        }),
        new Paragraph({
          spacing: { after: question.explanation ? 60 : 140 },
          indent: { left: 240 },
          children: [text("Answer: ", { bold: true }), text(answerFor(question) || "No answer supplied")],
        }),
      );
      if (question.explanation) {
        children.push(new Paragraph({
          spacing: { after: 140 },
          indent: { left: 240 },
          children: [text("Explanation: ", { bold: true }), text(question.explanation)],
        }));
      }
    }
  }
  return children;
}

export function buildPaperDocx(paper: ValidatedPaper, mode: PaperDocxMode) {
  const children = mode === "answers" ? answerKeyChildren(paper) : questionPaperChildren(paper);
  if (mode === "both") {
    children.push(new Paragraph({ children: [new PageBreak()] }), ...answerKeyChildren(paper));
  }
  return new Document({
    creator: "Vexa Paper Builder",
    title: paper.details.title || `${paper.details.examLabel} - ${paper.subjectName}`,
    description: mode === "answers" ? "Teacher answer key" : mode === "both" ? "Question paper and teacher answer key" : "Question paper",
    styles: {
      default: {
        document: { run: { font: FONT, size: BODY_SIZE }, paragraph: { spacing: { line: 276 } } },
      },
    },
    sections: [{
      properties: { page: { size: { width: PAGE_WIDTH, height: PAGE_HEIGHT }, margin: { top: 900, right: 900, bottom: 900, left: 900 } } },
      children,
    }],
  });
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "vexa-paper";
}

export async function downloadPaperDocx(paper: ValidatedPaper, mode: PaperDocxMode) {
  const blob = await Packer.toBlob(buildPaperDocx(paper, mode));
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const suffix = mode === "answers" ? "answer-key" : mode === "both" ? "question-paper-and-answer-key" : "question-paper";
  anchor.href = url;
  anchor.download = `${slug(`${paper.details.institutionName}-${paper.details.examLabel}`)}-${suffix}.docx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
