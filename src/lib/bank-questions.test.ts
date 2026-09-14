import assert from "node:assert/strict";
import test from "node:test";

import { parseBankQuestionCsv } from "./bank-question-csv";
import { normalizeBankQuestionType, validateBankQuestionInput } from "./bank-questions";
import { validateBankQuestionImageFile } from "./question-bank-image";

test("normalizes supported question type aliases without guessing unknown types", () => {
  assert.equal(normalizeBankQuestionType("TRUE/FALSE"), "TRUE_FALSE");
  assert.equal(normalizeBankQuestionType("VSA"), "VERY_SHORT_ANSWER");
  assert.equal(normalizeBankQuestionType("Match the Following"), "MATCH_THE_FOLLOWING");
  assert.equal(normalizeBankQuestionType("case based"), null);
});

test("clears hidden MCQ fields for written questions", () => {
  const result = validateBankQuestionInput({
    subjectId: "subject-1",
    topicId: "topic-1",
    questionType: "SHORT_ANSWER",
    questionText: "Explain normalization.",
    optionA: "untrusted hidden value",
    correctAnswer: "A",
    modelAnswer: "Normalization reduces redundancy.",
    difficulty: "medium",
    marks: 3,
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.optionA, null);
    assert.equal(result.data.correctAnswer, null);
  }
});

test("validates every Phase A question shape without hard-coding marks by type", () => {
  const common = {
    subjectId: "subject-1",
    topicId: "topic-1",
    questionText: "Question text",
    difficulty: "hard",
    marks: 7,
  };
  const cases = [
    { ...common, questionType: "MCQ" as const, optionA: "A", optionB: "B", optionC: "C", optionD: "D", correctAnswer: "B" },
    { ...common, questionType: "TRUE_FALSE" as const, correctAnswer: "false" },
    { ...common, questionType: "FILL_BLANK" as const, questionText: "Question ______", correctAnswer: "canonical value" },
    { ...common, questionType: "ASSERTION_REASON" as const, optionA: "A", optionB: "B", optionC: "C", optionD: "D", correctAnswer: "D" },
    { ...common, questionType: "VERY_SHORT_ANSWER" as const, modelAnswer: "One marking point" },
    { ...common, questionType: "SHORT_ANSWER" as const, modelAnswer: "Several marking points" },
    { ...common, questionType: "LONG_ANSWER" as const, modelAnswer: "Detailed marking rubric" },
  ];
  for (const input of cases) assert.equal(validateBankQuestionInput(input).success, true, input.questionType);
});

test("validates Fill aliases and keeps the first answer canonical", () => {
  const result = validateBankQuestionInput({
    subjectId: "subject-1", topicId: "topic-1", questionType: "FILL_BLANK",
    questionText: "The brain of a computer is ______.", correctAnswer: "CPU",
    gradingData: { version: 1, type: "FILL_BLANK", acceptedAnswers: ["CPU", "Central Processing Unit"], normalization: { unicode: "NFKC", trim: true, caseInsensitive: true, collapseWhitespace: true, punctuation: "EXACT" } },
    difficulty: "easy", marks: 1,
  });
  assert.equal(result.success, true);
  if (result.success) assert.deepEqual((result.data.gradingData as { acceptedAnswers: string[] }).acceptedAnswers, ["CPU", "Central Processing Unit"]);
});

test("rejects duplicate normalized Fill aliases and malformed blanks", () => {
  const base = { subjectId: "subject-1", topicId: "topic-1", questionType: "FILL_BLANK" as const, correctAnswer: "CPU", difficulty: "easy", marks: 1 };
  const duplicate = validateBankQuestionInput({ ...base, questionText: "Answer ______.", gradingData: { version: 1, type: "FILL_BLANK", acceptedAnswers: ["CPU", " cpu "], normalization: { unicode: "NFKC", trim: true, caseInsensitive: true, collapseWhitespace: true, punctuation: "EXACT" } } });
  const malformed = validateBankQuestionInput({ ...base, questionText: "No blank here." });
  assert.equal(duplicate.success, false);
  assert.equal(malformed.success, false);
});

test("creates a valid Match question and enforces pair-count marks", () => {
  const structuredContent = { version: 1, type: "MATCH_THE_FOLLOWING", leftItems: [{ id: "Lhtml", text: "HTML" }, { id: "Lcss", text: "CSS" }], rightItems: [{ id: "Rhtml", text: "Structure" }, { id: "Rcss", text: "Styling" }] };
  const gradingData = { version: 1, type: "MATCH_THE_FOLLOWING", correctPairs: [{ leftId: "Lhtml", rightId: "Rhtml" }, { leftId: "Lcss", rightId: "Rcss" }], scoring: "PER_PAIR_INTEGER" };
  const common = { subjectId: "subject-1", topicId: "topic-1", questionType: "MATCH_THE_FOLLOWING" as const, questionText: "Match the following.", structuredContent, gradingData, difficulty: "medium" };
  assert.equal(validateBankQuestionInput({ ...common, marks: 2 }).success, true);
  assert.equal(validateBankQuestionInput({ ...common, marks: 3 }).success, false);
});

test("keeps canonical Fill CSV compatible and rejects Match CSV explicitly", () => {
  const topics = [{ id: "topic-1", subjectId: "subject-1", name: "Chapter" }];
  const header = "TopicID,QuestionType,Question,Answer,Difficulty,Marks";
  const fill = parseBankQuestionCsv(`${header}\ntopic-1,FILL_BLANK,The brain is ______,CPU,easy,1`, "subject-1", topics);
  const match = parseBankQuestionCsv(`${header}\ntopic-1,MATCH_THE_FOLLOWING,Match items,,easy,2`, "subject-1", topics);
  assert.equal(fill.canImport, true);
  assert.equal(match.canImport, false);
  assert.match(match.rows[0].errors.join(" "), /CSV import is deferred/);
});

test("rejects missing type-specific content and invalid marks", () => {
  const result = validateBankQuestionInput({
    subjectId: "subject-1",
    topicId: "topic-1",
    questionType: "MCQ",
    questionText: "Incomplete MCQ",
    difficulty: "easy",
    marks: 0,
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.errors.join(" "), /Options A, B, C, and D/);
    assert.match(result.errors.join(" "), /positive whole number/);
  }
});

test("blocks the entire CSV preview when any row is invalid and warns about Importance", () => {
  const result = parseBankQuestionCsv(
    [
      "TopicID,QuestionType,Question,OptionA,OptionB,OptionC,OptionD,Answer,ModelAnswer,Explanation,Difficulty,Marks,Source,Importance",
      "topic-1,MCQ,Valid question,A,B,C,D,A,,,easy,1,Book,High",
      "topic-1,CASE_BASED,Unsupported question,,,,,,,,medium,4,Book,",
    ].join("\n"),
    "subject-1",
    [{ id: "topic-1", subjectId: "subject-1", name: "Chapter 1" }],
  );
  assert.equal(result.canImport, false);
  assert.match(result.rows[0].warnings[0], /unsupported/i);
  assert.match(result.rows[1].errors.join(" "), /Unsupported question type/i);
});

test("accepts ChapterID and quoted mixed-type CSV content", () => {
  const result = parseBankQuestionCsv(
    [
      "ChapterID,QuestionType,Question,OptionA,OptionB,OptionC,OptionD,Answer,ModelAnswer,Explanation,Difficulty,Marks,Source",
      'topic-1,TRUE/FALSE,"SQL is a query language, not a database.",,,,,TRUE,,,easy,1,Textbook',
      'topic-1,VSA,"Define a primary key.",,,,,,"A field that uniquely identifies a record.",,medium,2,Teacher',
    ].join("\n"),
    "subject-1",
    [{ id: "topic-1", subjectId: "subject-1", name: "Chapter 1" }],
  );
  assert.equal(result.canImport, true);
  assert.equal(result.rows[0].questionType, "TRUE_FALSE");
  assert.equal(result.rows[1].questionType, "VERY_SHORT_ANSWER");
});

test("resolves preferred ChapterCode and reports the supplied reference", () => {
  const result = parseBankQuestionCsv(
    [
      "ChapterCode,QuestionType,Question,OptionA,OptionB,OptionC,OptionD,Answer,ModelAnswer,Explanation,Difficulty,Marks,Source",
      '101,MCQ,"What does SQL stand for?",A,B,C,D,A,,,easy,1,Textbook',
    ].join("\n"),
    "subject-1",
    [{ id: "topic-internal-id", subjectId: "subject-1", name: "Querying and SQL Functions", importCode: "101" }],
  );

  assert.equal(result.canImport, true);
  assert.equal(result.rows[0].topicId, "topic-internal-id");
  assert.equal(result.rows[0].topicName, "Querying and SQL Functions");
  assert.equal(result.rows[0].suppliedTopicReference, "ChapterCode: 101");
});

test("keeps TopicID support and lets ChapterID fall back to import code", () => {
  const topics = [{ id: "topic-internal-id", subjectId: "subject-1", name: "SQL", importCode: "103" }];
  const header = "QuestionType,Question,OptionA,OptionB,OptionC,OptionD,Answer,ModelAnswer,Explanation,Difficulty,Marks,Source";
  const data = 'MCQ,"What is SQL?",A,B,C,D,A,,,easy,1,Textbook';
  const byId = parseBankQuestionCsv(`TopicID,${header}\ntopic-internal-id,${data}`, "subject-1", topics);
  const byChapterAlias = parseBankQuestionCsv(`ChapterID,${header}\n103,${data}`, "subject-1", topics);

  assert.equal(byId.canImport, true);
  assert.equal(byChapterAlias.canImport, true);
  assert.equal(byChapterAlias.rows[0].topicId, "topic-internal-id");
});

test("gives a row-level error for an unknown ChapterCode", () => {
  const result = parseBankQuestionCsv(
    [
      "ChapterCode,QuestionType,Question,OptionA,OptionB,OptionC,OptionD,Answer,ModelAnswer,Explanation,Difficulty,Marks,Source",
      '999,MCQ,"What is SQL?",A,B,C,D,A,,,easy,1,Textbook',
    ].join("\n"),
    "subject-1",
    [{ id: "topic-1", subjectId: "subject-1", name: "SQL", importCode: "101" }],
  );

  assert.equal(result.canImport, false);
  assert.match(result.rows[0].errors.join(" "), /ChapterCode 999 does not match any topic in the selected subject/);
});

test("accepts only trusted Vexa Blob URLs for optional supporting images", () => {
  const common = {
    subjectId: "subject-1",
    topicId: "topic-1",
    questionType: "SHORT_ANSWER" as const,
    questionText: "Interpret the graph.",
    modelAnswer: "The values increase over time.",
    difficulty: "medium",
    marks: 3,
  };
  const trusted = validateBankQuestionInput({
    ...common,
    imageUrl: "https://example.public.blob.vercel-storage.com/question-bank/graph.png",
    imageAlt: "A line graph with rising values",
    imageCaption: "Figure 1",
  });
  const untrusted = validateBankQuestionInput({
    ...common,
    imageUrl: "https://images.example.com/graph.png",
  });

  assert.equal(trusted.success, true);
  assert.equal(untrusted.success, false);
  if (!untrusted.success) assert.match(untrusted.errors.join(" "), /trusted Vexa storage/i);
});

test("validates image extension, MIME type, size, and binary signature together", () => {
  const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]);
  assert.equal(validateBankQuestionImageFile({
    filename: "graph.png",
    contentType: "image/png",
    size: pngBytes.length,
    bytes: pngBytes,
  }).success, true);
  assert.equal(validateBankQuestionImageFile({
    filename: "graph.jpg",
    contentType: "image/jpeg",
    size: pngBytes.length,
    bytes: pngBytes,
  }).success, false);
  assert.equal(validateBankQuestionImageFile({
    filename: "graph.svg",
    contentType: "image/svg+xml",
    size: 20,
    bytes: new TextEncoder().encode("<svg></svg>"),
  }).success, false);
});

test("warns explicitly and ignores deferred CSV image columns", () => {
  const result = parseBankQuestionCsv(
    [
      "TopicID,QuestionType,Question,OptionA,OptionB,OptionC,OptionD,Answer,Difficulty,Marks,ImageUrl,ImageCaption,ImageAlt",
      "topic-1,MCQ,Visual question,A,B,C,D,A,easy,1,https://example.com/image.png,Figure 1,A chart",
    ].join("\n"),
    "subject-1",
    [{ id: "topic-1", subjectId: "subject-1", name: "Chapter 1" }],
  );

  assert.equal(result.canImport, true);
  assert.match(result.fileWarnings.join(" "), /not imported/i);
  assert.match(result.rows[0].warnings.join(" "), /will not be stored/i);
  assert.equal(result.rows[0].data?.imageUrl, null);
});
