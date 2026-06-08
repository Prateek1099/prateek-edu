import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TeacherAiInsight } from "./TeacherAiInsight";
import { MessageSquare, Flame, Trophy, BarChart3, BookOpen, AlertTriangle, CheckCircle2 } from "lucide-react";

export default async function TeacherInsightsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== "admin") {
    redirect("/dashboard");
  }

  // Fetch recent student reflections
  const reflections = await prisma.studentReflection.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: true }
  });

  // Aggregate challenging topics
  const topicCounts: Record<string, number> = {};
  reflections.forEach(ref => {
    ref.challengingTopics.forEach(topic => {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });
  });

  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Challenge Performance Analytics
  const challengeAttempts = await prisma.challengeAttempt.findMany({
    include: {
      challenge: {
        include: {
          subject: true,
          topic: true,
          questions: { select: { id: true, correctAnswer: true, topicTag: true } },
        },
      },
    },
    orderBy: { completedAt: "desc" },
    take: 200,
  });

  // Class-wide Mistake Analytics
  const classMistakeTopics = await prisma.mistakeEntry.groupBy({
    by: ["topicTag"],
    where: { topicTag: { not: null } },
    _sum: { mistakeCount: true },
    _count: true,
    orderBy: { _sum: { mistakeCount: "desc" } },
    take: 15,
  });

  const [totalMistakeEntries, totalStudentsWithMistakes] = await Promise.all([
    prisma.mistakeEntry.count(),
    prisma.mistakeEntry.groupBy({ by: ["userId"] }).then(r => r.length),
  ]);

  // Aggregate per-challenge stats
  const challengeStatsMap: Record<string, { title: string; subject: string; totalAttempts: number; avgScore: number; scores: number[] }> = {};
  challengeAttempts.forEach(ca => {
    if (!challengeStatsMap[ca.challengeId]) {
      challengeStatsMap[ca.challengeId] = {
        title: ca.challenge.title,
        subject: ca.challenge.subject.name,
        totalAttempts: 0,
        avgScore: 0,
        scores: [],
      };
    }
    challengeStatsMap[ca.challengeId].totalAttempts++;
    challengeStatsMap[ca.challengeId].scores.push(ca.percentage);
  });
  const challengeStatsList = Object.values(challengeStatsMap).map(cs => ({
    ...cs,
    avgScore: cs.scores.length > 0 ? Math.round(cs.scores.reduce((a, b) => a + b, 0) / cs.scores.length) : 0,
  })).sort((a, b) => a.avgScore - b.avgScore);

  // Aggregate weak topic tags from wrong answers
  const weakTagCounts: Record<string, number> = {};
  challengeAttempts.forEach(ca => {
    let answers: Record<string, string> = {};
    try { answers = JSON.parse(ca.answers); } catch { /* skip */ }
    ca.challenge.questions.forEach(q => {
      const userAns = answers[q.id]?.toUpperCase();
      if (userAns && userAns !== q.correctAnswer.toUpperCase() && q.topicTag) {
        weakTagCounts[q.topicTag] = (weakTagCounts[q.topicTag] || 0) + 1;
      }
    });
  });
  const weakTagsList = Object.entries(weakTagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Generate Context for AI
  const contextData = `
Most Requested Topics for Help:
${topTopics.map(([topic, count]) => `- ${topic}: ${count} students`).join("\n") || "No data yet"}

Recent Student Feedback Snippets:
${reflections.filter(r => r.message).slice(0, 5).map(r => `- "${r.message}"`).join("\n") || "No text feedback yet"}

Challenge Performance (weakest first):
${challengeStatsList.slice(0, 5).map(cs => `- ${cs.title} (${cs.subject}): ${cs.avgScore}% avg across ${cs.totalAttempts} attempts`).join("\n") || "No challenge data yet"}

Most Incorrect Topic Tags:
${weakTagsList.map(([tag, count]) => `- ${tag}: ${count} wrong answers`).join("\n") || "No data yet"}

Class-Wide Mistake Book (${totalMistakeEntries} total entries across ${totalStudentsWithMistakes} students):
${classMistakeTopics.slice(0, 8).map((t: any) => `- ${t.topicTag}: ${t._sum.mistakeCount} mistakes from ${t._count} students`).join("\n") || "No data yet"}
  `.trim();

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Teacher Insights</h1>
        <p className="text-muted-foreground mt-1">Real-time classroom struggles and student feedback.</p>
      </div>

      <TeacherAiInsight contextData={contextData} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Col: Aggregated Data */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Flame className="w-5 h-5 text-destructive" /> Top Challenging Topics
          </h2>
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-0 divide-y divide-border">
              {topTopics.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">No data available yet.</div>
              ) : (
                topTopics.map(([topic, count], i) => (
                  <div key={i} className="flex justify-between items-center p-4 hover:bg-muted/30 transition-colors">
                    <span className="font-medium text-foreground">{topic}</span>
                    <span className="text-sm font-semibold px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive">
                      {count} student{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        {/* Right Col: Recent Feedback */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" /> Recent Student Requests
          </h2>
          <div className="space-y-4">
            {reflections.length === 0 ? (
              <Card className="bg-card border-border shadow-sm">
                <CardContent className="p-6 text-center text-muted-foreground">No reflections submitted yet.</CardContent>
              </Card>
            ) : reflections.slice(0, 10).map(ref => (
              <Card key={ref.id} className="bg-card border-border shadow-sm hover:border-primary/40 transition-colors">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-semibold">{ref.user.name || "Student"}</CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {new Date(ref.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  {ref.challengingTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ref.challengingTopics.map((t, i) => (
                        <span key={i} className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-foreground">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {ref.message && (
                    <div className="text-sm text-foreground/90 bg-muted/30 p-3 rounded-md italic border-l-2 border-primary/50">
                      "{ref.message}"
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>

      {/* Challenge Performance */}
      {challengeStatsList.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" /> Challenge Performance
            </h2>
            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-0 divide-y divide-border">
                {challengeStatsList.map((cs, i) => (
                  <div key={i} className="flex justify-between items-center p-4 hover:bg-muted/30 transition-colors">
                    <div>
                      <span className="font-medium text-foreground">{cs.title}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{cs.subject} · {cs.totalAttempts} attempt{cs.totalAttempts !== 1 ? "s" : ""}</p>
                    </div>
                    <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
                      cs.avgScore >= 80 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                      cs.avgScore >= 60 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {cs.avgScore}% avg
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          {weakTagsList.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-destructive" /> Weak Topic Tags
              </h2>
              <Card className="bg-card border-border shadow-sm">
                <CardContent className="p-0 divide-y divide-border">
                  {weakTagsList.map(([tag, count], i) => (
                    <div key={i} className="flex justify-between items-center p-4 hover:bg-muted/30 transition-colors">
                      <span className="font-medium text-foreground">{tag}</span>
                      <span className="text-sm font-semibold px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive">
                        {count} wrong answer{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          )}
        </div>
      )}

      {/* Class-Wide Mistake Analytics */}
      {classMistakeTopics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Class Mistake Book
            </h2>
            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-4">
                <div className="flex gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{totalMistakeEntries}</p>
                    <p className="text-xs text-muted-foreground">Total Mistakes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{totalStudentsWithMistakes}</p>
                    <p className="text-xs text-muted-foreground">Students</p>
                  </div>
                </div>
              </CardContent>
              <CardContent className="p-0 divide-y divide-border border-t">
                {(() => {
                  const reasonCounts: Record<string, number> = {};
                  reflections.forEach(ref => {
                    const ctx = ref.context as any;
                    if (ctx?.reasons && Array.isArray(ctx.reasons)) {
                      ctx.reasons.forEach((r: string) => {
                        reasonCounts[r] = (reasonCounts[r] || 0) + 1;
                      });
                    }
                  });
                  const sortedReasons = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]);

                  if (sortedReasons.length > 0) {
                    return (
                      <div className="p-4 bg-muted/20 border-b">
                        <p className="text-sm font-semibold mb-3">Most Common Help Requests</p>
                        <ul className="space-y-2">
                          {sortedReasons.map(([reason, count]) => (
                            <li key={reason} className="text-sm flex justify-between items-center">
                              <span className="text-muted-foreground">• {reason}</span>
                              <span className="font-medium">{count} request{count !== 1 ? 's' : ''}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                  return null;
                })()}

                {classMistakeTopics.slice(0, 10).map((t: any, i: number) => (
                  <div key={t.topicTag} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                      <span className="font-medium text-foreground">{t.topicTag}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t._count} student{t._count !== 1 ? 's' : ''}</span>
                      <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
                        (t._sum.mistakeCount || 0) >= 10 ? 'bg-red-500/10 text-red-500' :
                        (t._sum.mistakeCount || 0) >= 5 ? 'bg-amber-500/10 text-amber-500' :
                        'bg-muted text-foreground'
                      }`}>
                        {t._sum.mistakeCount}× wrong
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          {/* Cross-reference: Ask Teacher + Mistakes */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Priority Interventions
            </h2>
            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Students who asked for help on topics they repeatedly get wrong.
                </p>
                {(() => {
                  const priorityReflections = reflections.filter(ref => {
                    const ctx = ref.context as any;
                    // Explicit priority via context
                    if (ctx && ctx.mistakes && ctx.mistakes >= 3) return true;
                    // Fallback fuzzy match for old requests
                    const mistakeTopicSet = new Set(classMistakeTopics.slice(0, 20).map((t: any) => (t.topicTag as string).toLowerCase()));
                    return ref.challengingTopics.some(ct => {
                      const part = ct.includes(':') ? ct.split(':').pop()?.trim().toLowerCase() : ct.toLowerCase();
                      return part && Array.from(mistakeTopicSet).some(tag => tag.includes(part) || (part && part.includes(tag)));
                    });
                  }).slice(0, 10);

                  if (priorityReflections.length === 0) {
                    return <p className="text-sm text-muted-foreground text-center py-4">No priority interventions needed currently.</p>;
                  }

                  return (
                    <div className="space-y-3">
                      {priorityReflections.map(ref => {
                        const ctx = ref.context as any;
                        const isExplicitPriority = ctx && ctx.mistakes && ctx.mistakes >= 3;
                        
                        return (
                          <div key={ref.id} className="p-4 rounded-lg bg-red-500/5 border border-red-500/20 shadow-sm relative overflow-hidden">
                            {isExplicitPriority && (
                              <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                                Priority
                              </div>
                            )}
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-bold">{ref.user.name || 'Student'}</span>
                              <span className="text-xs text-muted-foreground mr-16">{new Date(ref.createdAt).toLocaleDateString()}</span>
                            </div>
                            
                            {/* Context Badges */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              {ctx ? (
                                <>
                                  {ctx.source && (
                                    <span className="text-xs font-medium px-2 py-1 rounded bg-secondary text-secondary-foreground border">
                                      Source: {ctx.source}
                                    </span>
                                  )}
                                  {ctx.topic && (
                                    <span className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
                                      Topic: {ctx.topic}
                                    </span>
                                  )}
                                  {ctx.mistakes && (
                                    <span className="text-xs font-bold px-2 py-1 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                      Mistakes: {ctx.mistakes}
                                    </span>
                                  )}
                                  {ctx.challengeName && (
                                    <span className="text-xs font-medium px-2 py-1 rounded bg-muted text-muted-foreground border">
                                      Challenge: {ctx.challengeName}
                                    </span>
                                  )}
                                  {ctx.score !== undefined && (
                                    <span className="text-xs font-medium px-2 py-1 rounded bg-red-500/10 text-red-600 border border-red-500/20">
                                      Score: {ctx.score}%
                                    </span>
                                  )}
                                </>
                              ) : (
                                ref.challengingTopics.map((t, i) => (
                                  <span key={i} className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">{t}</span>
                                ))
                              )}
                            </div>

                            {ctx?.reasons && ctx.reasons.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Reasons:</p>
                                <div className="space-y-1">
                                  {ctx.reasons.map((r: string, i: number) => (
                                    <div key={i} className="flex items-center gap-1.5 text-sm">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                      <span>{r}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {ref.message && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Message:</p>
                                <div className="bg-background/50 p-3 rounded text-sm text-foreground/90 italic border-l-2 border-red-500/50">
                                  &quot;{ref.message}&quot;
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
