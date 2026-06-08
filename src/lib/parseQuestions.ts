export type ParsedQuestion = {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string; // "A" | "B" | "C" | "D"
  explanation?: string;
  topicTag?: string;
};

export type ParseResult = {
  questions: ParsedQuestion[];
  errors: { line: number; message: string }[];
};

/**
 * Parses a bulk-import text block into structured questions.
 *
 * Supported format (separator and EXPLANATION/TOPIC are optional):
 *
 * QUESTION: What is a primary key?
 * A) Field used for calculations
 * B) Unique identifier for a record
 * C) Validation rule
 * D) Data type
 * ANSWER: B
 * EXPLANATION: A primary key uniquely identifies each record.
 * TOPIC: Primary Keys
 * ---
 */
export function parseQuestions(text: string): ParseResult {
  const questions: ParsedQuestion[] = [];
  const errors: { line: number; message: string }[] = [];

  if (!text.trim()) {
    return { questions, errors };
  }

  // Split into question blocks by "---" separator or by double-newline before "QUESTION:"
  const blocks = text
    .split(/(?:^|\n)---+\s*\n/gm)
    .map((b) => b.trim())
    .filter(Boolean);

  // If no separators found, try splitting by "QUESTION:" keyword
  let rawBlocks: string[];
  if (blocks.length <= 1 && text.includes("QUESTION:")) {
    rawBlocks = text
      .split(/(?=^QUESTION:)/gim)
      .map((b) => b.trim())
      .filter(Boolean);
  } else {
    rawBlocks = blocks;
  }

  for (const block of rawBlocks) {
    const lines = block.split("\n").map((l) => l.trimEnd());
    const blockStartLine =
      text.substring(0, text.indexOf(block)).split("\n").length;

    let questionText = "";
    let optionA = "";
    let optionB = "";
    let optionC = "";
    let optionD = "";
    let correctAnswer = "";
    let explanation = "";
    let topicTag = "";

    let currentField = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = blockStartLine + i;
      const trimmed = line.trim();

      if (!trimmed) continue;

      // Detect field starts (case-insensitive)
      const questionMatch = trimmed.match(/^QUESTION:\s*(.*)/i);
      const optAMatch = trimmed.match(/^A\)\s*(.*)/i);
      const optBMatch = trimmed.match(/^B\)\s*(.*)/i);
      const optCMatch = trimmed.match(/^C\)\s*(.*)/i);
      const optDMatch = trimmed.match(/^D\)\s*(.*)/i);
      const answerMatch = trimmed.match(/^ANSWER:\s*(.*)/i);
      const explanationMatch = trimmed.match(/^EXPLANATION:\s*(.*)/i);
      const topicMatch = trimmed.match(/^TOPIC:\s*(.*)/i);

      if (questionMatch) {
        currentField = "question";
        questionText = questionMatch[1].trim();
      } else if (optAMatch) {
        currentField = "optionA";
        optionA = optAMatch[1].trim();
      } else if (optBMatch) {
        currentField = "optionB";
        optionB = optBMatch[1].trim();
      } else if (optCMatch) {
        currentField = "optionC";
        optionC = optCMatch[1].trim();
      } else if (optDMatch) {
        currentField = "optionD";
        optionD = optDMatch[1].trim();
      } else if (answerMatch) {
        currentField = "answer";
        correctAnswer = answerMatch[1].trim().toUpperCase();
      } else if (explanationMatch) {
        currentField = "explanation";
        explanation = explanationMatch[1].trim();
      } else if (topicMatch) {
        currentField = "topic";
        topicTag = topicMatch[1].trim();
      } else if (trimmed === "---") {
        // Separator, skip
        continue;
      } else {
        // Continuation line — append to current field
        switch (currentField) {
          case "question":
            questionText += " " + trimmed;
            break;
          case "explanation":
            explanation += " " + trimmed;
            break;
          case "optionA":
            optionA += " " + trimmed;
            break;
          case "optionB":
            optionB += " " + trimmed;
            break;
          case "optionC":
            optionC += " " + trimmed;
            break;
          case "optionD":
            optionD += " " + trimmed;
            break;
        }
      }
    }

    // Validate the parsed block
    const blockErrors: string[] = [];

    if (!questionText) blockErrors.push("Missing QUESTION");
    if (!optionA) blockErrors.push("Missing option A");
    if (!optionB) blockErrors.push("Missing option B");
    if (!optionC) blockErrors.push("Missing option C");
    if (!optionD) blockErrors.push("Missing option D");
    if (!correctAnswer) {
      blockErrors.push("Missing ANSWER");
    } else if (!["A", "B", "C", "D"].includes(correctAnswer)) {
      blockErrors.push(
        `Invalid ANSWER "${correctAnswer}" — must be A, B, C, or D`
      );
    }

    if (blockErrors.length > 0) {
      errors.push({
        line: blockStartLine,
        message: blockErrors.join("; "),
      });
    } else {
      questions.push({
        questionText,
        optionA,
        optionB,
        optionC,
        optionD,
        correctAnswer,
        ...(explanation ? { explanation } : {}),
        ...(topicTag ? { topicTag } : {}),
      });
    }
  }

  return { questions, errors };
}
