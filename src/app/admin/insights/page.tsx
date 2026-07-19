import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TeacherAiInsight } from "./TeacherAiInsight";
import { PrintButton } from "@/components/PrintButton";
import { getTeachingIntelligenceData } from "@/lib/teaching-intelligence";
import { isAdminRole } from "@/lib/roles";
import {
  Users,
  Trophy,
  CalendarDays,
  AlertTriangle,
  BookOpen,
  MessageSquare,
  BarChart3,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

export default async function TeachingIntelligencePage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !isAdminRole((session.user as { role?: string }).role)) {
    redirect("/dashboard");
  }

  const {
    overview,
    interventions,
    topicIntelligence,
    plannerIntelligence,
    challenges,
  } = await getTeachingIntelligenceData();

  // ─── Generate Context for AI ───────────────────────────────────────────────

  const priorityStudents = interventions.filter(i => i.category === "Priority Intervention");
  
  const aiContext = `
Active Students: ${overview.activeStudents}
Average Challenge Score: ${overview.avgChallengeScore}%
Average Revision Completion: ${overview.avgRevisionCompletion}%
Priority Interventions Needed: ${priorityStudents.length} students

Most Difficult Topics:
${topicIntelligence.slice(0, 5).map(t => `- ${t.topic}: ${t.mistakes} mistakes, ${t.helpRequests} help requests, ${t.avgChallengeScore || 'N/A'}% avg score`).join("\n")}

Students Behind Schedule (Revision Planner):
${plannerIntelligence.behind.slice(0, 5).map(s => `- ${s.name} (${s.completion}% completed)`).join("\n")}
  `.trim();

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 max-w-7xl pb-16">
      {/* ── Header & Weekly Report Print Area ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teaching Intelligence</h1>
          <p className="text-muted-foreground mt-1">Real-time classroom insights and intervention priorities.</p>
        </div>
        <PrintButton />
      </div>

      <div className="print-only mb-8 hidden">
        <h2 className="text-2xl font-bold">Weekly Teaching Report</h2>
        <p className="text-muted-foreground">{new Date().toLocaleDateString()}</p>
      </div>

      {/* ── Classroom Overview ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{overview.activeStudents}</p>
            <p className="text-xs text-muted-foreground">Active Students</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <Trophy className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{overview.challengeParticipation}</p>
            <p className="text-xs text-muted-foreground">Challenge Participation</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <CalendarDays className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{overview.revisionPlannerUsage}</p>
            <p className="text-xs text-muted-foreground">Revision Planner Users</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{overview.avgChallengeScore}%</p>
            <p className="text-xs text-muted-foreground">Average Challenge Score</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <BookOpen className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{overview.avgRevisionCompletion}%</p>
            <p className="text-xs text-muted-foreground">Average Revision Completion</p>
          </CardContent>
        </Card>
      </div>

      <TeacherAiInsight contextData={aiContext} />

      {/* ── Priority Intervention Engine ── */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" /> Priority Intervention Engine
        </h2>
        {interventions.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">No interventions needed at this time.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {interventions.filter(i => i.score >= 4).slice(0, 9).map((student) => (
              <Card key={student.userId} className={`shadow-sm border-t-4 ${student.category === "Priority Intervention" ? "border-t-destructive bg-destructive/5" : "border-t-amber-500 bg-amber-500/5"}`}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base font-bold">
                        <Link href={`/admin/users/${student.userId}/performance`} className="hover:underline">
                          {student.category === "Priority Intervention" ? "🔴" : "🟡"} {student.name}
                        </Link>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Score: {student.score} ({student.category})</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-sm space-y-3">
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-background p-2 rounded border">
                      <p className="text-[10px] uppercase text-muted-foreground font-semibold">Avg Score</p>
                      <p className="font-medium text-destructive">{student.metrics.avgChallengeScore !== null ? `${student.metrics.avgChallengeScore}%` : 'N/A'}</p>
                    </div>
                    <div className="bg-background p-2 rounded border">
                      <p className="text-[10px] uppercase text-muted-foreground font-semibold">Mistakes</p>
                      <p className="font-medium">{student.metrics.mistakeCount}</p>
                    </div>
                    <div className="bg-background p-2 rounded border">
                      <p className="text-[10px] uppercase text-muted-foreground font-semibold">Help Requests</p>
                      <p className="font-medium">{student.metrics.askTeacherRequests}</p>
                    </div>
                    <div className="bg-background p-2 rounded border">
                      <p className="text-[10px] uppercase text-muted-foreground font-semibold">Revision</p>
                      <p className="font-medium">{student.metrics.revisionCompletion !== null ? `${student.metrics.revisionCompletion}%` : 'N/A'}</p>
                    </div>
                  </div>
                  {student.weakTopics.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Weak Topics:</p>
                      <div className="flex flex-wrap gap-1">
                        {student.weakTopics.map((t, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded bg-muted text-foreground">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Topic Intelligence ── */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Topic Intelligence
        </h2>
        <Card className="shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Topic</th>
                  <th className="px-4 py-3">Mistakes</th>
                  <th className="px-4 py-3">Help Requests</th>
                  <th className="px-4 py-3">Avg Challenge Score</th>
                  <th className="px-4 py-3 text-right">Intervention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topicIntelligence.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No topic data available.</td></tr>
                ) : (
                  topicIntelligence.slice(0, 10).map((topic, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{topic.topic}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${topic.mistakes > 20 ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}>
                          {topic.mistakes}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 ${topic.helpRequests > 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground'}`}>
                          {topic.helpRequests > 0 && <MessageSquare className="w-3 h-3" />}
                          {topic.helpRequests}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {topic.avgChallengeScore !== null ? (
                          <span className={`font-medium ${topic.avgChallengeScore < 60 ? 'text-destructive' : topic.avgChallengeScore > 80 ? 'text-emerald-500' : ''}`}>
                            {topic.avgChallengeScore}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/worksheets/create?topic=${encodeURIComponent(topic.topic)}`}>
                          <Button variant="outline" size="sm" className="text-xs h-7">Generate Worksheet</Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Revision Planner Intelligence ── */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" /> Revision Planner Status
          </h2>
          <Card className="shadow-sm">
            <CardContent className="p-0 divide-y divide-border">
              {/* Behind */}
              <div className="p-4">
                <h3 className="text-sm font-bold uppercase text-destructive flex items-center gap-2 mb-3">
                  <TrendingDown className="w-4 h-4" /> Behind Schedule
                </h3>
                {plannerIntelligence.behind.length === 0 ? <p className="text-sm text-muted-foreground">No students behind schedule.</p> : (
                  <div className="space-y-2">
                    {plannerIntelligence.behind.map((s, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span>{s.name}</span>
                        <span className="font-semibold text-destructive">{s.completion}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Ahead */}
              <div className="p-4">
                <h3 className="text-sm font-bold uppercase text-emerald-500 flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4" /> Ahead of Schedule
                </h3>
                {plannerIntelligence.ahead.length === 0 ? <p className="text-sm text-muted-foreground">No students ahead of schedule.</p> : (
                  <div className="space-y-2">
                    {plannerIntelligence.ahead.map((s, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span>{s.name}</span>
                        <span className="font-semibold text-emerald-500">{s.completion}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ── Challenge Intelligence ── */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" /> Challenge Performance
          </h2>
          <Card className="shadow-sm">
            <CardContent className="p-0 divide-y divide-border">
              {(() => {
                const challengeStats = new Map<string, { title: string; subject: string; attempts: number; scores: number[] }>();
                for (const c of challenges) {
                  if (!challengeStats.has(c.challengeId)) {
                    challengeStats.set(c.challengeId, { title: c.challenge.title, subject: c.challenge.subject.name, attempts: 0, scores: [] });
                  }
                  const s = challengeStats.get(c.challengeId)!;
                  s.attempts += 1;
                  s.scores.push(c.percentage);
                }
                const sorted = Array.from(challengeStats.values())
                  .map(s => ({ ...s, avgScore: Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length) }))
                  .sort((a, b) => a.avgScore - b.avgScore);

                if (sorted.length === 0) return <div className="p-4 text-center text-sm text-muted-foreground">No challenge data.</div>;
                
                return sorted.slice(0, 5).map((cs, i) => (
                  <div key={i} className="p-4 flex justify-between items-center hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{cs.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Attempts: {cs.attempts}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      cs.avgScore < 60 ? 'bg-destructive/10 text-destructive' :
                      cs.avgScore > 80 ? 'bg-emerald-500/10 text-emerald-600' :
                      'bg-muted'
                    }`}>
                      {cs.avgScore}% Avg
                    </span>
                  </div>
                ));
              })()}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
