import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Bookmark, Clock, Trophy, Target } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const recentPapers = [
    { title: "0417 / 11", subject: "IGCSE ICT", year: 2023, season: "May/June", viewedAt: "2 hours ago" },
    { title: "9618 / 22", subject: "AS Level Comp Sci", year: 2022, season: "Oct/Nov", viewedAt: "1 day ago" },
  ];

  const savedPapers = [
    { title: "0478 / 21", subject: "IGCSE Computer Science", year: 2023, desc: "Hard logic gates questions." },
    { title: "9626 / 04", subject: "A Level IT", year: 2021, desc: "Animation practical tasks to review." }
  ];

  const progressData = [
    { subject: "IGCSE ICT (0417)", completion: 65, color: "bg-blue-500" },
    { subject: "A Level IT (9626)", completion: 32, color: "bg-indigo-500" },
    { subject: "CBSE IP", completion: 80, color: "bg-emerald-500" }
  ];

  return (
    <div className="container px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-lg">Welcome back. Track your learning progress and pick up where you left off.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Papers Practiced</CardTitle>
             <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold text-primary">24</div>
             <p className="text-xs text-muted-foreground mt-1">+4 from last week</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Topics Mastered</CardTitle>
             <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold text-primary">12</div>
             <p className="text-xs text-muted-foreground mt-1">Across 3 subjects</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Current Goal</CardTitle>
             <Trophy className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">A* Target</div>
             <p className="text-xs text-muted-foreground mt-1">IGCSE Exams 2024</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col */}
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Syllabus Progress</CardTitle>
              <CardDescription>Your overall completion rate based on checklists.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {progressData.map((p, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>{p.subject}</span>
                    <span>{p.completion}%</span>
                  </div>
                  <Progress value={p.completion} className="h-2" />
                </div>
              ))}
              <Link href="/syllabus" className="w-full mt-4 flex">
                <Button variant="outline" className="w-full">Update Checklists</Button>
              </Link>
            </CardContent>
          </Card>

          <Tabs defaultValue="recent" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="recent">Recently Viewed</TabsTrigger>
              <TabsTrigger value="weak">Recommended Practice</TabsTrigger>
            </TabsList>
            <TabsContent value="recent" className="space-y-4">
              {recentPapers.map((rp, i) => (
                <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4 mb-3 sm:mb-0">
                    <div className="bg-primary/10 p-2 rounded-full hidden sm:block">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{rp.title}</h4>
                      <p className="text-sm text-muted-foreground">{rp.subject} • {rp.year} {rp.season}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                     <span className="text-xs text-muted-foreground mr-2">{rp.viewedAt}</span>
                     <Button size="sm" variant="secondary" className="w-full sm:w-auto">Resume</Button>
                  </div>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="weak">
              <div className="text-center py-10 bg-muted/20 border border-dashed rounded-lg">
                <Target className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Complete more topical papers to receive AI-based recommendations.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Col */}
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-primary" /> Saved Papers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {savedPapers.map((sp, i) => (
                <div key={i} className="p-3 border rounded-md hover:bg-muted/10 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline">{sp.year}</Badge>
                    <span className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded">{sp.subject}</span>
                  </div>
                  <h4 className="font-bold my-1">{sp.title}</h4>
                  <p className="text-xs text-muted-foreground text-balance">{sp.desc}</p>
                </div>
              ))}
              <Button variant="ghost" className="w-full text-sm">View All Saved</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
