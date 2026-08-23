export const INSIGHTS_DATE_RANGES = ["7", "30"] as const;
export const INSIGHTS_ALLOWED_CHALLENGE_TYPES = ["CHALLENGE", "QUICK_PRACTICE"] as const;
export const INSIGHTS_MIN_TOPIC_ATTEMPTS = 2;
export const INSIGHTS_LOW_SCORE_THRESHOLD = 60;

export type InsightsDateRange = (typeof INSIGHTS_DATE_RANGES)[number];

export type InsightsScope = {
  boardId: string;
  qualificationId: string;
  subjectId: string;
  topicId?: string;
  challengeId?: string;
  dateRange: InsightsDateRange;
};

export type InsightQuestionRecord = {
  id: string;
  correctAnswer: string;
};

export type InsightAttemptRecord = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  boardId: string;
  qualificationId: string;
  subjectId: string;
  challengeId: string;
  challengeTitle: string;
  challengeType: string;
  workspaceId: string | null;
  isPublished: boolean;
  topicId: string | null;
  topicName: string | null;
  percentage: number;
  answers: string;
  completedAt: string;
  questions: InsightQuestionRecord[];
};

export type InsightReflectionRecord = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  boardId: string;
  qualificationId: string;
  subjectId: string;
  topicId: string | null;
  createdAt: string;
};

export type StudentInsightRow = {
  userId: string;
  name: string;
  email: string;
  attempts: number;
  averageScore: number | null;
  bestTopic: string;
  weakTopic: string;
  wrongOrUnanswered: number;
  helpRequests: number;
  lastActive: string;
  suggestedRevision: string;
};

export type AttentionStudent = StudentInsightRow & {
  reasons: string[];
};

export type TopicInsightRow = {
  topicId: string | null;
  topicName: string;
  attempts: number;
  averageScore: number | null;
  wrongOrUnanswered: number;
  affectedStudents: number;
  sufficientData: boolean;
  suggestedAction: string;
};

export type ChallengeInsightRow = {
  challengeId: string;
  challengeTitle: string;
  topicName: string;
  attempts: number;
  averageScore: number | null;
  lowPerformingStudents: number;
  wrongOrUnanswered: number;
};

export type ScopedInsights = {
  dateStart: string;
  dateEnd: string;
  overview: {
    activeParticipants: number;
    totalAttempts: number;
    averageScore: number | null;
    wrongOrUnanswered: number;
    helpRequests: number;
    weakTopics: number;
  };
  students: StudentInsightRow[];
  attention: AttentionStudent[];
  topics: TopicInsightRow[];
  challenges: ChallengeInsightRow[];
  warnings: string[];
};

type AnswerAnalysis = {
  analyzable: boolean;
  wrongOrUnanswered: number;
  missedQuestionIds: string[];
};

type StudentAccumulator = {
  userId: string;
  name: string;
  email: string;
  scores: number[];
  attempts: InsightAttemptRecord[];
  wrongOrUnanswered: number;
  missedQuestionCounts: Map<string, number>;
  helpRequests: number;
  lastActive: string;
};

function roundedAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function newestDate(current: string, candidate: string): string {
  return new Date(candidate).getTime() > new Date(current).getTime() ? candidate : current;
}

export function displayStudentName(name: string | null, email: string | null): string {
  return name?.trim() || email?.trim() || "Unnamed student";
}

export function getInsightsDateWindow(
  dateRange: InsightsDateRange,
  now: Date = new Date(),
): { start: Date; end: Date } {
  const days = dateRange === "30" ? 30 : 7;
  return {
    start: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
    end: new Date(now),
  };
}

function isWithinWindow(value: string, start: Date, end: Date): boolean {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp >= start.getTime() && timestamp <= end.getTime();
}

function matchesAttemptScope(
  attempt: InsightAttemptRecord,
  scope: InsightsScope,
  start: Date,
  end: Date,
): boolean {
  return (
    attempt.boardId === scope.boardId &&
    attempt.qualificationId === scope.qualificationId &&
    attempt.subjectId === scope.subjectId &&
    (!scope.topicId || attempt.topicId === scope.topicId) &&
    (!scope.challengeId || attempt.challengeId === scope.challengeId) &&
    attempt.workspaceId === null &&
    attempt.isPublished &&
    (INSIGHTS_ALLOWED_CHALLENGE_TYPES as readonly string[]).includes(attempt.challengeType) &&
    isWithinWindow(attempt.completedAt, start, end)
  );
}

function matchesReflectionScope(
  reflection: InsightReflectionRecord,
  scope: InsightsScope,
  start: Date,
  end: Date,
): boolean {
  // Reflections do not have a reliable challenge relation, so they are excluded
  // when a challenge filter is active rather than guessed from their text/context.
  if (scope.challengeId) return false;
  return (
    reflection.boardId === scope.boardId &&
    reflection.qualificationId === scope.qualificationId &&
    reflection.subjectId === scope.subjectId &&
    (!scope.topicId || reflection.topicId === scope.topicId) &&
    isWithinWindow(reflection.createdAt, start, end)
  );
}

export function analyseAttemptAnswers(attempt: InsightAttemptRecord): AnswerAnalysis {
  let answers: Record<string, unknown>;
  try {
    const parsed = JSON.parse(attempt.answers) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { analyzable: false, wrongOrUnanswered: 0, missedQuestionIds: [] };
    }
    answers = parsed as Record<string, unknown>;
  } catch {
    return { analyzable: false, wrongOrUnanswered: 0, missedQuestionIds: [] };
  }

  const missedQuestionIds: string[] = [];
  for (const question of attempt.questions) {
    const answer = answers[question.id];
    if (
      typeof answer !== "string" ||
      answer.trim().toUpperCase() !== question.correctAnswer.trim().toUpperCase()
    ) {
      missedQuestionIds.push(question.id);
    }
  }

  return {
    analyzable: true,
    wrongOrUnanswered: missedQuestionIds.length,
    missedQuestionIds,
  };
}

function buildTopicSummary(attempts: InsightAttemptRecord[]): TopicInsightRow[] {
  const groups = new Map<
    string,
    {
      topicId: string | null;
      topicName: string;
      scores: number[];
      wrongOrUnanswered: number;
      affectedStudents: Set<string>;
    }
  >();

  for (const attempt of attempts) {
    const key = attempt.topicId ?? "__unassigned__";
    const group = groups.get(key) ?? {
      topicId: attempt.topicId,
      topicName: attempt.topicName || "Unassigned topic",
      scores: [],
      wrongOrUnanswered: 0,
      affectedStudents: new Set<string>(),
    };
    const answerStats = analyseAttemptAnswers(attempt);
    group.scores.push(attempt.percentage);
    group.wrongOrUnanswered += answerStats.wrongOrUnanswered;
    if (answerStats.wrongOrUnanswered > 0) group.affectedStudents.add(attempt.userId);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => {
      const averageScore = roundedAverage(group.scores);
      const sufficientData = group.topicId !== null && group.scores.length >= INSIGHTS_MIN_TOPIC_ATTEMPTS;
      let suggestedAction = "Collect more attempts before drawing a conclusion";
      if (group.topicId === null) suggestedAction = "Assign a syllabus topic to these challenges";
      else if (sufficientData && ((averageScore ?? 100) < INSIGHTS_LOW_SCORE_THRESHOLD || group.wrongOrUnanswered >= 2)) {
        suggestedAction = "Review this topic and assign focused practice";
      } else if (sufficientData) {
        suggestedAction = "Continue regular revision";
      }

      return {
        topicId: group.topicId,
        topicName: group.topicName,
        attempts: group.scores.length,
        averageScore,
        wrongOrUnanswered: group.wrongOrUnanswered,
        affectedStudents: group.affectedStudents.size,
        sufficientData,
        suggestedAction,
      };
    })
    .sort((left, right) => {
      if (left.topicId === null) return 1;
      if (right.topicId === null) return -1;
      if (left.sufficientData !== right.sufficientData) return left.sufficientData ? -1 : 1;
      return (left.averageScore ?? 101) - (right.averageScore ?? 101);
    });
}

function buildChallengeSummary(attempts: InsightAttemptRecord[]): ChallengeInsightRow[] {
  const groups = new Map<
    string,
    {
      title: string;
      topicName: string;
      scores: number[];
      studentScores: Map<string, number[]>;
      wrongOrUnanswered: number;
    }
  >();

  for (const attempt of attempts) {
    const group = groups.get(attempt.challengeId) ?? {
      title: attempt.challengeTitle,
      topicName: attempt.topicName || "Unassigned topic",
      scores: [],
      studentScores: new Map<string, number[]>(),
      wrongOrUnanswered: 0,
    };
    group.scores.push(attempt.percentage);
    group.wrongOrUnanswered += analyseAttemptAnswers(attempt).wrongOrUnanswered;
    const studentScores = group.studentScores.get(attempt.userId) ?? [];
    studentScores.push(attempt.percentage);
    group.studentScores.set(attempt.userId, studentScores);
    groups.set(attempt.challengeId, group);
  }

  return [...groups.entries()]
    .map(([challengeId, group]) => ({
      challengeId,
      challengeTitle: group.title,
      topicName: group.topicName,
      attempts: group.scores.length,
      averageScore: roundedAverage(group.scores),
      lowPerformingStudents: [...group.studentScores.values()].filter(
        (scores) => (roundedAverage(scores) ?? 100) < INSIGHTS_LOW_SCORE_THRESHOLD,
      ).length,
      wrongOrUnanswered: group.wrongOrUnanswered,
    }))
    .sort((left, right) => (left.averageScore ?? 101) - (right.averageScore ?? 101));
}

function findStudentTopic(
  attempts: InsightAttemptRecord[],
  direction: "best" | "weak",
): string {
  const groups = new Map<string, { name: string; scores: number[]; wrong: number }>();
  for (const attempt of attempts) {
    if (!attempt.topicId || !attempt.topicName) continue;
    const group = groups.get(attempt.topicId) ?? { name: attempt.topicName, scores: [], wrong: 0 };
    group.scores.push(attempt.percentage);
    group.wrong += analyseAttemptAnswers(attempt).wrongOrUnanswered;
    groups.set(attempt.topicId, group);
  }

  const eligible = [...groups.values()].filter(
    (group) => group.scores.length >= INSIGHTS_MIN_TOPIC_ATTEMPTS,
  );
  if (eligible.length === 0) return "Insufficient data";

  eligible.sort((left, right) => {
    const scoreDifference = (roundedAverage(left.scores) ?? 0) - (roundedAverage(right.scores) ?? 0);
    if (scoreDifference !== 0) return direction === "best" ? -scoreDifference : scoreDifference;
    return direction === "best" ? left.wrong - right.wrong : right.wrong - left.wrong;
  });
  return eligible[0].name;
}

function buildStudents(
  attempts: InsightAttemptRecord[],
  reflections: InsightReflectionRecord[],
): { students: StudentInsightRow[]; attention: AttentionStudent[] } {
  const students = new Map<string, StudentAccumulator>();

  const getStudent = (
    userId: string,
    name: string | null,
    email: string | null,
    activityAt: string,
  ) => {
    const current = students.get(userId);
    if (current) {
      current.lastActive = newestDate(current.lastActive, activityAt);
      return current;
    }
    const created: StudentAccumulator = {
      userId,
      name: displayStudentName(name, email),
      email: email?.trim() || "—",
      scores: [],
      attempts: [],
      wrongOrUnanswered: 0,
      missedQuestionCounts: new Map<string, number>(),
      helpRequests: 0,
      lastActive: activityAt,
    };
    students.set(userId, created);
    return created;
  };

  for (const attempt of attempts) {
    const student = getStudent(
      attempt.userId,
      attempt.userName,
      attempt.userEmail,
      attempt.completedAt,
    );
    student.scores.push(attempt.percentage);
    student.attempts.push(attempt);
    const answerStats = analyseAttemptAnswers(attempt);
    student.wrongOrUnanswered += answerStats.wrongOrUnanswered;
    for (const questionId of answerStats.missedQuestionIds) {
      student.missedQuestionCounts.set(
        questionId,
        (student.missedQuestionCounts.get(questionId) ?? 0) + 1,
      );
    }
  }

  for (const reflection of reflections) {
    const student = getStudent(
      reflection.userId,
      reflection.userName,
      reflection.userEmail,
      reflection.createdAt,
    );
    student.helpRequests += 1;
  }

  const rows = [...students.values()]
    .map<StudentInsightRow>((student) => {
      const weakTopic = findStudentTopic(student.attempts, "weak");
      let suggestedRevision = "Continue current practice";
      if (weakTopic !== "Insufficient data") suggestedRevision = `Revise ${weakTopic}`;
      else if (student.wrongOrUnanswered > 0) suggestedRevision = "Review missed questions";
      else if (student.helpRequests > 0) suggestedRevision = "Follow up on the help request";

      return {
        userId: student.userId,
        name: student.name,
        email: student.email,
        attempts: student.attempts.length,
        averageScore: roundedAverage(student.scores),
        bestTopic: findStudentTopic(student.attempts, "best"),
        weakTopic,
        wrongOrUnanswered: student.wrongOrUnanswered,
        helpRequests: student.helpRequests,
        lastActive: student.lastActive,
        suggestedRevision,
      };
    })
    .sort((left, right) => new Date(right.lastActive).getTime() - new Date(left.lastActive).getTime());

  const attention = rows
    .map<AttentionStudent | null>((row) => {
      const source = students.get(row.userId)!;
      const reasons: string[] = [];
      if (
        row.attempts >= INSIGHTS_MIN_TOPIC_ATTEMPTS &&
        row.averageScore !== null &&
        row.averageScore < INSIGHTS_LOW_SCORE_THRESHOLD
      ) {
        reasons.push(`Average below ${INSIGHTS_LOW_SCORE_THRESHOLD}% across ${row.attempts} attempts`);
      }
      const repeatedMisses = [...source.missedQuestionCounts.values()].filter((count) => count >= 2).length;
      if (repeatedMisses > 0) reasons.push(`${repeatedMisses} question${repeatedMisses === 1 ? "" : "s"} missed repeatedly`);
      if (row.helpRequests > 0) reasons.push(`${row.helpRequests} help request${row.helpRequests === 1 ? "" : "s"} submitted`);
      return reasons.length > 0 ? { ...row, reasons } : null;
    })
    .filter((row): row is AttentionStudent => row !== null)
    .sort((left, right) => right.reasons.length - left.reasons.length);

  return { students: rows, attention };
}

export function buildScopedInsights(
  source: { attempts: InsightAttemptRecord[]; reflections: InsightReflectionRecord[] },
  scope: InsightsScope,
  now: Date = new Date(),
): ScopedInsights {
  const { start, end } = getInsightsDateWindow(scope.dateRange, now);
  const attempts = source.attempts.filter((attempt) => matchesAttemptScope(attempt, scope, start, end));
  const reflections = source.reflections.filter((reflection) =>
    matchesReflectionScope(reflection, scope, start, end),
  );

  const topics = buildTopicSummary(attempts);
  const challenges = buildChallengeSummary(attempts);
  const { students, attention } = buildStudents(attempts, reflections);
  const answerAnalyses = attempts.map(analyseAttemptAnswers);
  const warnings: string[] = [];

  if (attempts.some((attempt) => attempt.topicId === null)) {
    warnings.push("Some attempts are labelled “Unassigned topic” because their challenge has no topic relation.");
  }
  const unreadableAnswers = answerAnalyses.filter((analysis) => !analysis.analyzable).length;
  if (unreadableAnswers > 0) {
    warnings.push(`${unreadableAnswers} attempt${unreadableAnswers === 1 ? "" : "s"} could not be included in wrong/unanswered analysis.`);
  }
  if (scope.challengeId) {
    warnings.push("Help requests are excluded while a challenge filter is active because reflections are not challenge-linked.");
  }

  const weakTopics = topics.filter(
    (topic) =>
      topic.sufficientData &&
      ((topic.averageScore ?? 100) < INSIGHTS_LOW_SCORE_THRESHOLD || topic.wrongOrUnanswered >= 2),
  ).length;

  return {
    dateStart: start.toISOString(),
    dateEnd: end.toISOString(),
    overview: {
      activeParticipants: students.length,
      totalAttempts: attempts.length,
      averageScore: roundedAverage(attempts.map((attempt) => attempt.percentage)),
      wrongOrUnanswered: answerAnalyses.reduce(
        (sum, analysis) => sum + analysis.wrongOrUnanswered,
        0,
      ),
      helpRequests: reflections.length,
      weakTopics,
    },
    students,
    attention,
    topics,
    challenges,
    warnings,
  };
}
