import { prisma } from "@/lib/prisma";

export interface StudentInterventionScore {
  userId: string;
  name: string;
  email: string;
  score: number;
  category: "Priority Intervention" | "Attention Needed" | "Normal";
  metrics: {
    askTeacherRequests: number;
    mistakeCount: number;
    avgChallengeScore: number | null;
    revisionCompletion: number | null;
  };
  weakTopics: string[];
}

export interface TopicIntelligence {
  topic: string;
  mistakes: number;
  helpRequests: number;
  avgChallengeScore: number | null;
}

export async function getTeachingIntelligenceData() {
  const students = await prisma.user.findMany({
    where: { role: "student" },
    select: { id: true, name: true, email: true },
  });

  const [
    reflections,
    mistakes,
    challenges,
    revisionPlans,
  ] = await Promise.all([
    prisma.studentReflection.findMany({
      select: { userId: true, challengingTopics: true },
    }),
    prisma.mistakeEntry.findMany({
      select: { userId: true, topicTag: true, mistakeCount: true, status: true },
    }),
    prisma.challengeAttempt.findMany({
      select: {
        userId: true,
        percentage: true,
        challengeId: true,
        answers: true,
        challenge: {
          select: {
            title: true,
            subject: { select: { name: true } },
            questions: { select: { id: true, topicTag: true, correctAnswer: true } },
          },
        },
      },
    }),
    prisma.revisionPlan.findMany({
      include: { tasks: { select: { status: true } } },
    }),
  ]);

  // ─── 1. PRIORITY INTERVENTION ENGINE ───────────────────────────────────────
  
  const studentStats = new Map<string, any>();
  
  for (const s of students) {
    studentStats.set(s.id, {
      userId: s.id,
      name: s.name || "Unknown Student",
      email: s.email || "",
      askTeacherRequests: 0,
      mistakeCount: 0,
      challengeScores: [] as number[],
      revisionCompletion: null as number | null,
      weakTopicsMap: new Map<string, number>(),
    });
  }

  // Count Ask Teacher Requests
  for (const r of reflections) {
    const s = studentStats.get(r.userId);
    if (s) {
      s.askTeacherRequests += 1;
      for (const t of r.challengingTopics) {
        const clean = t.includes(":") ? t.split(":")[1].trim() : t.trim();
        s.weakTopicsMap.set(clean, (s.weakTopicsMap.get(clean) || 0) + 1);
      }
    }
  }

  // Count Mistakes
  for (const m of mistakes) {
    const s = studentStats.get(m.userId);
    if (s && m.status === "needs_revision") {
      s.mistakeCount += m.mistakeCount;
      if (m.topicTag) {
        s.weakTopicsMap.set(m.topicTag, (s.weakTopicsMap.get(m.topicTag) || 0) + m.mistakeCount);
      }
    }
  }

  // Challenge Scores
  for (const c of challenges) {
    const s = studentStats.get(c.userId);
    if (s) {
      s.challengeScores.push(c.percentage);
    }
  }

  // Revision Completion
  for (const p of revisionPlans) {
    const s = studentStats.get(p.userId);
    if (s) {
      const total = p.tasks.length;
      if (total > 0) {
        const completed = p.tasks.filter((t) => t.status === "COMPLETED").length;
        s.revisionCompletion = Math.round((completed / total) * 100);
      } else {
        s.revisionCompletion = 0;
      }
    }
  }

  // Calculate Scores
  const interventions: StudentInterventionScore[] = [];

  for (const [id, s] of studentStats) {
    let score = 0;
    
    // +3 points = Ask Teacher Request
    if (s.askTeacherRequests > 0) score += 3;
    
    // +2 points = Mistake Count > 5
    if (s.mistakeCount > 5) score += 2;
    
    // +2 points = Challenge Score < 50%
    const avgChallenge = s.challengeScores.length > 0 
      ? Math.round(s.challengeScores.reduce((a: number, b: number) => a + b, 0) / s.challengeScores.length) 
      : null;
    if (avgChallenge !== null && avgChallenge < 50) score += 2;
    
    // +2 points = Revision Completion < 30%
    if (s.revisionCompletion !== null && s.revisionCompletion < 30) score += 2;

    let category: "Priority Intervention" | "Attention Needed" | "Normal" = "Normal";
    if (score >= 7) category = "Priority Intervention";
    else if (score >= 4) category = "Attention Needed";

    const weakTopics = (Array.from(s.weakTopicsMap.entries()) as [string, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((e) => e[0]);

    interventions.push({
      userId: s.userId,
      name: s.name,
      email: s.email,
      score,
      category,
      metrics: {
        askTeacherRequests: s.askTeacherRequests,
        mistakeCount: s.mistakeCount,
        avgChallengeScore: avgChallenge,
        revisionCompletion: s.revisionCompletion,
      },
      weakTopics,
    });
  }

  interventions.sort((a, b) => b.score - a.score);

  // ─── 2. TOPIC INTELLIGENCE ───────────────────────────────────────────────
  
  const topicStats = new Map<string, { mistakes: number; requests: number; scores: number[] }>();

  // Aggregate Mistakes
  for (const m of mistakes) {
    if (m.topicTag) {
      if (!topicStats.has(m.topicTag)) topicStats.set(m.topicTag, { mistakes: 0, requests: 0, scores: [] });
      topicStats.get(m.topicTag)!.mistakes += m.mistakeCount;
    }
  }

  // Aggregate Requests
  for (const r of reflections) {
    for (const t of r.challengingTopics) {
      const clean = t.includes(":") ? t.split(":")[1].trim() : t.trim();
      if (!topicStats.has(clean)) topicStats.set(clean, { mistakes: 0, requests: 0, scores: [] });
      topicStats.get(clean)!.requests += 1;
    }
  }

  // Aggregate Challenge Scores (derive topic from questions)
  for (const c of challenges) {
    let parsedAnswers: Record<string, string> = {};
    try { parsedAnswers = JSON.parse(c.answers); } catch {}
    
    // Track right/wrong per tag in this attempt
    const tagResults = new Map<string, { total: number; correct: number }>();
    for (const q of c.challenge.questions) {
      if (q.topicTag) {
        if (!tagResults.has(q.topicTag)) tagResults.set(q.topicTag, { total: 0, correct: 0 });
        tagResults.get(q.topicTag)!.total += 1;
        if (parsedAnswers[q.id]?.toUpperCase() === q.correctAnswer.toUpperCase()) {
          tagResults.get(q.topicTag)!.correct += 1;
        }
      }
    }

    for (const [tag, res] of tagResults) {
      if (res.total > 0) {
        if (!topicStats.has(tag)) topicStats.set(tag, { mistakes: 0, requests: 0, scores: [] });
        topicStats.get(tag)!.scores.push((res.correct / res.total) * 100);
      }
    }
  }

  const topicIntelligence: TopicIntelligence[] = [];
  for (const [topic, stats] of topicStats) {
    topicIntelligence.push({
      topic,
      mistakes: stats.mistakes,
      helpRequests: stats.requests,
      avgChallengeScore: stats.scores.length > 0 ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length) : null,
    });
  }

  // Sort by general difficulty (requests * 10 + mistakes - avgScore)
  topicIntelligence.sort((a, b) => {
    const scoreA = (a.helpRequests * 10) + a.mistakes - (a.avgChallengeScore || 100);
    const scoreB = (b.helpRequests * 10) + b.mistakes - (b.avgChallengeScore || 100);
    return scoreB - scoreA;
  });

  // ─── 3. REVISION PLANNER INTELLIGENCE ────────────────────────────────────

  const plannerIntelligence = {
    ahead: [] as { name: string; completion: number; }[],
    onTrack: [] as { name: string; completion: number; }[],
    behind: [] as { name: string; completion: number; }[],
  };

  for (const p of revisionPlans) {
    const total = p.tasks.length;
    if (total === 0) continue;
    const completed = p.tasks.filter((t) => t.status === "COMPLETED").length;
    const pct = Math.round((completed / total) * 100);
    
    // Calculate expected
    const planCreatedAt = p.createdAt.getTime();
    const examTime = p.examDate.getTime();
    const totalDuration = examTime - planCreatedAt;
    const elapsed = Date.now() - planCreatedAt;
    const expectedPct = totalDuration > 0 ? Math.min(100, Math.round((elapsed / totalDuration) * 100)) : 0;

    const user = students.find(s => s.id === p.userId);
    const name = user?.name || "Unknown";

    if (pct > expectedPct + 15) {
      plannerIntelligence.ahead.push({ name, completion: pct });
    } else if (pct < expectedPct - 15) {
      plannerIntelligence.behind.push({ name, completion: pct });
    } else {
      plannerIntelligence.onTrack.push({ name, completion: pct });
    }
  }

  plannerIntelligence.ahead.sort((a, b) => b.completion - a.completion);
  plannerIntelligence.onTrack.sort((a, b) => b.completion - a.completion);
  plannerIntelligence.behind.sort((a, b) => a.completion - b.completion);

  // ─── 4. OVERVIEW STATS ───────────────────────────────────────────────────
  
  const activeStudents = challenges.map(c => c.userId).concat(reflections.map(r => r.userId));
  const uniqueActive = new Set(activeStudents).size;
  const challengeParticipation = new Set(challenges.map(c => c.userId)).size;
  const avgOverallScore = challenges.length > 0 
    ? Math.round(challenges.reduce((acc, c) => acc + c.percentage, 0) / challenges.length) 
    : 0;

  const totalPlannerTasks = revisionPlans.reduce((acc, p) => acc + p.tasks.length, 0);
  const totalCompletedTasks = revisionPlans.reduce((acc, p) => acc + p.tasks.filter(t => t.status === "COMPLETED").length, 0);
  const avgRevisionCompletion = totalPlannerTasks > 0 ? Math.round((totalCompletedTasks / totalPlannerTasks) * 100) : 0;

  return {
    overview: {
      totalStudents: students.length,
      activeStudents: uniqueActive,
      challengeParticipation,
      revisionPlannerUsage: revisionPlans.length,
      helpRequests: reflections.length,
      avgChallengeScore: avgOverallScore,
      avgRevisionCompletion,
    },
    interventions,
    topicIntelligence,
    plannerIntelligence,
    challenges,
  };
}
