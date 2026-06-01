import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TeacherAiInsight } from "./TeacherAiInsight";
import { MessageSquare, Flame } from "lucide-react";

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

  // Generate Context for AI
  const contextData = `
Most Requested Topics for Help:
${topTopics.map(([topic, count]) => `- ${topic}: ${count} students`).join("\n") || "No data yet"}

Recent Student Feedback Snippets:
${reflections.filter(r => r.message).slice(0, 5).map(r => `- "${r.message}"`).join("\n") || "No text feedback yet"}
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
    </div>
  );
}
