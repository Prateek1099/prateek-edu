import assert from "node:assert/strict";
import test from "node:test";

import {
  analyseAttemptAnswers,
  buildScopedInsights,
  displayStudentName,
  type InsightAttemptRecord,
  type InsightReflectionRecord,
  type InsightsScope,
} from "./admin-insights-rules";

const NOW = new Date("2026-08-23T12:00:00.000Z");
const BASE_SCOPE: InsightsScope = {
  boardId: "board-cbse",
  qualificationId: "class-12",
  subjectId: "subject-ip",
  dateRange: "7",
};

function attempt(overrides: Partial<InsightAttemptRecord> = {}): InsightAttemptRecord {
  return {
    id: "attempt-1",
    userId: "student-1",
    userName: "Aarav",
    userEmail: "aarav@example.com",
    boardId: "board-cbse",
    qualificationId: "class-12",
    subjectId: "subject-ip",
    challengeId: "challenge-1",
    challengeTitle: "SQL Practice",
    challengeType: "CHALLENGE",
    workspaceId: null,
    isPublished: true,
    topicId: "topic-sql",
    topicName: "SQL",
    percentage: 50,
    answers: JSON.stringify({ q1: "A", q2: "B" }),
    completedAt: "2026-08-22T12:00:00.000Z",
    questions: [
      { id: "q1", correctAnswer: "A" },
      { id: "q2", correctAnswer: "C" },
      { id: "q3", correctAnswer: "D" },
    ],
    ...overrides,
  };
}

function reflection(overrides: Partial<InsightReflectionRecord> = {}): InsightReflectionRecord {
  return {
    id: "reflection-1",
    userId: "student-1",
    userName: "Aarav",
    userEmail: "aarav@example.com",
    boardId: "board-cbse",
    qualificationId: "class-12",
    subjectId: "subject-ip",
    subjectName: "Informatics Practices (065)",
    topicId: "topic-sql",
    topicName: "SQL",
    message: "Please explain nested SQL queries.",
    createdAt: "2026-08-22T13:00:00.000Z",
    ...overrides,
  };
}

function insights(
  attempts: InsightAttemptRecord[],
  reflections: InsightReflectionRecord[] = [],
  scope: InsightsScope = BASE_SCOPE,
) {
  return buildScopedInsights({ attempts, reflections }, scope, NOW);
}

test("isolates CBSE attempts from Cambridge attempts", () => {
  const result = insights([
    attempt(),
    attempt({ id: "cambridge", boardId: "board-cambridge" }),
  ]);
  assert.equal(result.overview.totalAttempts, 1);
});

test("isolates qualifications within one board", () => {
  const result = insights([
    attempt(),
    attempt({ id: "class-10", qualificationId: "class-10" }),
  ]);
  assert.equal(result.overview.totalAttempts, 1);
});

test("isolates subjects within one qualification", () => {
  const result = insights([
    attempt(),
    attempt({ id: "computer-science", subjectId: "subject-cs" }),
  ]);
  assert.equal(result.overview.totalAttempts, 1);
});

test("applies exact relational topic filtering", () => {
  const result = insights(
    [attempt(), attempt({ id: "pandas", topicId: "topic-pandas", topicName: "Pandas" })],
    [],
    { ...BASE_SCOPE, topicId: "topic-sql" },
  );
  assert.equal(result.overview.totalAttempts, 1);
  assert.equal(result.topics[0].topicName, "SQL");
});

test("applies exact challenge filtering and excludes unlinked reflections", () => {
  const result = insights(
    [attempt(), attempt({ id: "other-attempt", challengeId: "challenge-2" })],
    [reflection()],
    { ...BASE_SCOPE, challengeId: "challenge-1" },
  );
  assert.equal(result.overview.totalAttempts, 1);
  assert.equal(result.overview.helpRequests, 0);
  assert.match(result.warnings.join(" "), /not challenge-linked/);
});

test("filters attempts and help requests by the selected date range", () => {
  const oldDate = "2026-08-01T12:00:00.000Z";
  const result = insights(
    [attempt(), attempt({ id: "old", completedAt: oldDate })],
    [reflection(), reflection({ id: "old-reflection", createdAt: oldDate })],
  );
  assert.equal(result.overview.totalAttempts, 1);
  assert.equal(result.overview.helpRequests, 1);
  assert.equal(result.helpRequests.length, 1);
});

test("returns actionable scoped help-request details and matching overview count", () => {
  const result = insights([], [
    reflection({ id: "older", createdAt: "2026-08-21T13:00:00.000Z" }),
    reflection({
      id: "newer",
      userName: null,
      userEmail: "student@example.com",
      message: "How do I use GROUP BY?",
      createdAt: "2026-08-22T14:00:00.000Z",
    }),
  ]);

  assert.equal(result.overview.helpRequests, result.helpRequests.length);
  assert.equal(result.helpRequests[0].id, "newer");
  assert.equal(result.helpRequests[0].studentName, "student@example.com");
  assert.equal(result.helpRequests[0].subjectName, "Informatics Practices (065)");
  assert.equal(result.helpRequests[0].topicName, "SQL");
  assert.equal(result.helpRequests[0].message, "How do I use GROUP BY?");
});

test("does not infer a topic or message for incomplete help requests", () => {
  const result = insights([], [
    reflection({
      userName: null,
      userEmail: null,
      topicId: null,
      topicName: null,
      message: null,
    }),
  ]);

  assert.equal(result.helpRequests[0].studentName, "Unnamed student");
  assert.equal(result.helpRequests[0].topicName, "No topic selected");
  assert.equal(result.helpRequests[0].message, "No message provided");
});

test("excludes workspace challenges", () => {
  const result = insights([
    attempt(),
    attempt({ id: "workspace", workspaceId: "workspace-1" }),
  ]);
  assert.equal(result.overview.totalAttempts, 1);
});

test("excludes worksheets and unpublished challenges", () => {
  const result = insights([
    attempt(),
    attempt({ id: "worksheet", challengeType: "WORKSHEET" }),
    attempt({ id: "unpublished", isPublished: false }),
  ]);
  assert.equal(result.overview.totalAttempts, 1);
});

test("counts unique active students across attempts and help requests", () => {
  const result = insights(
    [attempt(), attempt({ id: "attempt-2", challengeId: "challenge-2" })],
    [reflection(), reflection({ id: "student-2-reflection", userId: "student-2" })],
  );
  assert.equal(result.overview.activeParticipants, 2);
});

test("calculates average score from scoped completed attempts", () => {
  const result = insights([
    attempt({ percentage: 40 }),
    attempt({ id: "attempt-2", percentage: 80 }),
  ]);
  assert.equal(result.overview.averageScore, 60);
});

test("counts both wrong and unanswered answers", () => {
  const result = analyseAttemptAnswers(attempt());
  assert.equal(result.analyzable, true);
  assert.equal(result.wrongOrUnanswered, 2);
  assert.deepEqual(result.missedQuestionIds, ["q2", "q3"]);
});

test("uses insufficient-data labels for one topic attempt", () => {
  const result = insights([attempt()]);
  assert.equal(result.students[0].bestTopic, "Insufficient data");
  assert.equal(result.students[0].weakTopic, "Insufficient data");
  assert.equal(result.topics[0].sufficientData, false);
  assert.equal(result.overview.weakTopics, 0);
});

test("labels attempts without a relational topic as unassigned", () => {
  const result = insights([attempt({ topicId: null, topicName: null })]);
  assert.equal(result.topics[0].topicName, "Unassigned topic");
  assert.match(result.warnings.join(" "), /Unassigned topic/);
});

test("uses name, then email, then unnamed-student fallback", () => {
  assert.equal(displayStudentName("  Mira  ", "mira@example.com"), "Mira");
  assert.equal(displayStudentName(null, "mira@example.com"), "mira@example.com");
  assert.equal(displayStudentName(null, null), "Unnamed student");
});

test("derives range mistakes only from attempt answers, not accumulated mistake totals", () => {
  const result = insights([attempt()]);
  assert.equal(result.overview.wrongOrUnanswered, 2);
  assert.equal("mistakeCount" in result.overview, false);
});
