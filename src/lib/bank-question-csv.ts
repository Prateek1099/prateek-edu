import {
  normalizeBankQuestionType,
  validateBankQuestionInput,
  type BankQuestionInput,
  type BankQuestionTypeValue,
  type ValidatedBankQuestion,
} from "./bank-questions";

export type CsvTopicOption = {
  id: string;
  subjectId: string;
  name: string;
  importCode?: string | null;
};

export type BankQuestionCsvRow = {
  rowNumber: number;
  questionType: BankQuestionTypeValue | null;
  questionText: string;
  topicId: string;
  suppliedTopicReference: string;
  topicName: string;
  difficulty: string;
  marks: number | null;
  warnings: string[];
  errors: string[];
  data: ValidatedBankQuestion | null;
};

export type BankQuestionCsvResult = {
  rows: BankQuestionCsvRow[];
  fileErrors: string[];
  canImport: boolean;
};

const HEADER_ALIASES: Record<string, string> = {
  TOPICID: "topicId",
  CHAPTERID: "chapterId",
  TOPICCODE: "topicCode",
  CHAPTERCODE: "chapterCode",
  QUESTIONTYPE: "questionType",
  TYPE: "questionType",
  QUESTION: "questionText",
  OPTIONA: "optionA",
  A: "optionA",
  OPTIONB: "optionB",
  B: "optionB",
  OPTIONC: "optionC",
  C: "optionC",
  OPTIOND: "optionD",
  D: "optionD",
  ANSWER: "correctAnswer",
  CORRECTANSWER: "correctAnswer",
  MODELANSWER: "modelAnswer",
  EXPLANATION: "explanation",
  DIFFICULTY: "difficulty",
  MARKS: "marks",
  SOURCE: "source",
  IMPORTANCE: "importance",
};

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function parseCsvRecords(text: string): { records: string[][]; error: string | null } {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n") {
      record.push(field.replace(/\r$/, ""));
      if (record.some((value) => value.trim())) records.push(record);
      record = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) return { records: [], error: "CSV contains an unclosed quoted field." };
  record.push(field.replace(/\r$/, ""));
  if (record.some((value) => value.trim())) records.push(record);
  return { records, error: null };
}

export function parseBankQuestionCsv(
  text: string,
  subjectId: string,
  topics: CsvTopicOption[],
): BankQuestionCsvResult {
  const fileErrors: string[] = [];
  if (!text.trim()) return { rows: [], fileErrors: ["Paste CSV data first."], canImport: false };

  const parsed = parseCsvRecords(text);
  if (parsed.error) return { rows: [], fileErrors: [parsed.error], canImport: false };
  if (parsed.records.length < 2) {
    return { rows: [], fileErrors: ["CSV needs a header and at least one data row."], canImport: false };
  }

  const headers = parsed.records[0].map(normalizeHeader);
  const fields = headers.map((header) => HEADER_ALIASES[header] ?? null);
  const hasTopicId = fields.includes("topicId");
  const hasChapterId = fields.includes("chapterId");
  const hasTopicCode = fields.includes("topicCode");
  const hasChapterCode = fields.includes("chapterCode");
  if (!hasTopicId && !hasChapterId && !hasTopicCode && !hasChapterCode) {
    fileErrors.push("CSV needs a ChapterCode, TopicCode, TopicID, or ChapterID column.");
  }
  for (const required of ["questionType", "questionText", "difficulty", "marks"]) {
    if (!fields.includes(required)) fileErrors.push(`CSV is missing the ${required} column.`);
  }
  if (parsed.records.length > 1_001) fileErrors.push("CSV imports are limited to 1,000 questions at a time.");

  const scopedTopics = topics.filter((topic) => topic.subjectId === subjectId);
  const topicById = new Map(scopedTopics.map((topic) => [topic.id, topic]));
  const topicByCode = new Map<string, CsvTopicOption>();
  const duplicateCodes = new Set<string>();
  for (const topic of scopedTopics) {
    const code = topic.importCode?.trim();
    if (!code) continue;
    if (topicByCode.has(code)) duplicateCodes.add(code);
    else topicByCode.set(code, topic);
  }
  const rows = parsed.records.slice(1, 1_001).map((values, rowIndex): BankQuestionCsvRow => {
    const raw: Record<string, string> = {};
    fields.forEach((fieldName, columnIndex) => {
      if (fieldName) raw[fieldName] = values[columnIndex]?.trim() ?? "";
    });

    const warnings: string[] = [];
    const errors: string[] = [];
    const references = [
      { label: "TopicID", value: raw.topicId, mode: "id" as const },
      { label: "ChapterID", value: raw.chapterId, mode: "id-or-code" as const },
      { label: "TopicCode", value: raw.topicCode, mode: "code" as const },
      { label: "ChapterCode", value: raw.chapterCode, mode: "code" as const },
    ].filter((reference) => Boolean(reference.value));
    const suppliedTopicReference = references
      .map((reference) => `${reference.label}: ${reference.value}`)
      .join(" · ");
    const resolvedTopics: CsvTopicOption[] = [];
    for (const reference of references) {
      let resolved: CsvTopicOption | undefined;
      if (reference.mode === "id") {
        resolved = topicById.get(reference.value);
      } else if (reference.mode === "code") {
        if (duplicateCodes.has(reference.value)) {
          errors.push(`${reference.label} ${reference.value} is duplicated within the selected subject.`);
          continue;
        }
        resolved = topicByCode.get(reference.value);
      } else {
        resolved = topicById.get(reference.value);
        if (!resolved) {
          if (duplicateCodes.has(reference.value)) {
            errors.push(`${reference.label} ${reference.value} matches a duplicated topic code in the selected subject.`);
            continue;
          }
          resolved = topicByCode.get(reference.value);
        }
      }
      if (!resolved) {
        errors.push(`${reference.label} ${reference.value} does not match any topic in the selected subject.`);
      } else {
        resolvedTopics.push(resolved);
      }
    }
    const resolvedTopicIds = new Set(resolvedTopics.map((topic) => topic.id));
    if (resolvedTopicIds.size > 1) errors.push("Topic/chapter identifier columns resolve to different topics.");
    const topic = resolvedTopics[0];
    if (references.length === 0) errors.push("A ChapterCode, TopicCode, TopicID, or ChapterID value is required.");

    if (raw.importance) {
      warnings.push(`Importance “${raw.importance}” is unsupported and will not be stored.`);
    }

    const questionType = normalizeBankQuestionType(raw.questionType);
    if (!questionType) errors.push(`Unsupported question type “${raw.questionType || "blank"}”.`);

    const parsedMarks = Number(raw.marks);
    const input: BankQuestionInput = {
      subjectId,
      topicId: topic?.id ?? null,
      questionType: questionType ?? (raw.questionType as BankQuestionTypeValue),
      questionText: raw.questionText ?? "",
      optionA: raw.optionA,
      optionB: raw.optionB,
      optionC: raw.optionC,
      optionD: raw.optionD,
      correctAnswer: raw.correctAnswer,
      modelAnswer: raw.modelAnswer,
      explanation: raw.explanation,
      source: raw.source,
      difficulty: raw.difficulty ?? "",
      marks: parsedMarks,
    };
    const validation = validateBankQuestionInput(input);
    if (!validation.success) errors.push(...validation.errors);

    return {
      rowNumber: rowIndex + 2,
      questionType,
      questionText: raw.questionText ?? "",
      topicId: topic?.id ?? "",
      suppliedTopicReference,
      topicName: topic?.name ?? "Unknown topic",
      difficulty: raw.difficulty ?? "",
      marks: Number.isFinite(parsedMarks) ? parsedMarks : null,
      warnings,
      errors: [...new Set(errors)],
      data: validation.success && topic ? { ...validation.data, topicId: topic.id } : null,
    };
  });

  return {
    rows,
    fileErrors,
    canImport: fileErrors.length === 0 && rows.length > 0 && rows.every((row) => row.errors.length === 0),
  };
}
