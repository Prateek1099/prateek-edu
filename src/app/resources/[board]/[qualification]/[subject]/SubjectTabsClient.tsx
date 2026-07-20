"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, BookOpen, ScrollText, Download, Trophy, Clock, Zap, ClipboardCheck, ListChecks } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const difficultyColor: Record<string, string> = {
  easy: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  medium: "border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10",
  hard: "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10",
  mixed: "border-primary/50 text-primary bg-primary/10",
};

type Note = { id: string; title: string; pdfUrl: string | null };
type Topic = { id: string; topicName: string };
type Subject = { slug: string; name: string; syllabusPdfUrl: string | null };
type Challenge = {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  estimatedTime: number;
  pdfUrl: string | null;
  pdfAnswerUrl: string | null;
  topic: Topic | null;
  _count: { questions: number };
};

export default function SubjectTabsClient({
  topics,
  notes,
  subject,
  challenges = [],
  board = "",
  qualification = "",
}: {
  topics: Topic[];
  notes: Note[];
  subject: Subject;
  challenges?: Challenge[];
  board?: string;
  qualification?: string;
}) {
  void topics;
  const quickPractices = challenges.filter((challenge) => challenge.type === "QUICK_PRACTICE");
  const standardChallenges = challenges.filter((challenge) => challenge.type === "CHALLENGE" || !challenge.type);
  const worksheets = challenges.filter((challenge) => challenge.type === "WORKSHEET" || challenge.type === "PDF_WORKSHEET");

  return (
    <Tabs defaultValue="practice" className="w-full">
      <TabsList className="mb-8 flex h-auto w-full max-w-4xl flex-wrap justify-start gap-1 rounded-xl border bg-muted/30 p-1.5">
        <TabsTrigger value="practice" className="flex-1 gap-2 px-3 py-2.5 text-xs sm:text-sm">
          <Zap className="h-4 w-4" /> Quick Practice
        </TabsTrigger>
        <TabsTrigger value="notes" className="flex-1 gap-2 px-3 py-2.5 text-xs sm:text-sm"><ScrollText className="h-4 w-4" /> Notes</TabsTrigger>
        <TabsTrigger value="syllabus" className="flex-1 gap-2 px-3 py-2.5 text-xs sm:text-sm"><ListChecks className="h-4 w-4" /> Syllabus</TabsTrigger>
      </TabsList>
      
      {/* Quick Practice Hub replaces Topical/Challenges */}

      <TabsContent value="notes" className="mt-0">
        {notes.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground">No notes available</h3>
            <p className="text-muted-foreground">Revision notes will be uploaded shortly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {notes.map((note) => (
               <Card key={note.id} className="hover:border-primary/50 transition-colors shadow-sm bg-card">
                 <CardContent className="p-4 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="bg-primary/10 p-2 rounded-lg">
                       <ScrollText className="h-5 w-5 text-primary" />
                     </div>
                     <span className="font-medium">{note.title}</span>
                   </div>
                   {note.pdfUrl && (
                     <a 
                       href={note.pdfUrl} 
                       target="_blank" 
                       rel="noreferrer"
                       className={buttonVariants({ size: "sm", variant: "secondary" })}
                     >
                       <Download className="h-4 w-4 mr-2" /> Download
                     </a>
                   )}
                 </CardContent>
               </Card>
             ))}
          </div>
        )}
      </TabsContent>

      {/* Quick Practice Tab */}
      <TabsContent value="practice" className="mt-0">
        <div className="space-y-8">
          <section>
            <div className="mb-4 flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">Quick Practice</h2></div>
            <p className="mb-4 text-sm text-muted-foreground">Start with a short, focused set before moving into full challenges.</p>
            {quickPractices.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-primary/5 p-6 text-center"><ClipboardCheck className="mx-auto mb-3 h-8 w-8 text-primary/70" /><h3 className="font-semibold">No quick practices yet</h3><p className="mt-1 text-sm text-muted-foreground">Try a challenge below, or check back when your teacher publishes a short practice.</p></div>
            ) : <div className="grid gap-4 md:grid-cols-2">{quickPractices.map((practice) => <Card key={practice.id} className="border-primary/25 bg-primary/5 shadow-sm transition-colors hover:border-primary/50"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{practice.title}</h3>{practice.topic && <p className="mt-1 text-sm text-muted-foreground">{practice.topic.topicName}</p>}</div><Badge variant="outline" className={cn("capitalize", difficultyColor[practice.difficulty] || difficultyColor.medium)}>{practice.difficulty}</Badge></div><div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground"><span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> {practice._count.questions} questions</span><span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {practice.estimatedTime} min</span></div><Link href={`/resources/${board}/${qualification}/${subject.slug}/challenge/${practice.id}`}><Button className="mt-5 w-full">Start quick practice</Button></Link></CardContent></Card>)}</div>}
          </section>
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold">MCQ Challenges</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Fast revision and topic mastery.</p>
            {standardChallenges.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-foreground">No challenges available</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {standardChallenges.map((challenge) => (
                  <Card key={challenge.id} className="hover:border-primary/50 transition-all shadow-sm bg-card group overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/80 to-amber-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="bg-amber-500/10 p-3 rounded-xl">
                          <Trophy className="h-6 w-6 text-amber-500" />
                        </div>
                        <Badge variant="outline" className={cn("capitalize font-medium", difficultyColor[challenge.difficulty] || difficultyColor.medium)}>
                          {challenge.difficulty}
                        </Badge>
                      </div>

                      <h3 className="text-lg font-bold text-foreground group-hover:text-amber-500 transition-colors">
                        {challenge.title}
                      </h3>

                      {challenge.topic && (
                        <p className="text-sm text-muted-foreground mt-1">{challenge.topic.topicName}</p>
                      )}

                      <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5" />
                          {challenge._count.questions} Questions
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {challenge.estimatedTime} min
                        </span>
                      </div>

                      <Link href={`/resources/${board}/${qualification}/${subject.slug}/challenge/${challenge.id}`}>
                        <Button className="w-full mt-5 font-semibold bg-amber-500 hover:bg-amber-600 text-white" size="lg">
                          Start Challenge
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-blue-500" />
              <h2 className="text-xl font-bold">Worksheets</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Exam-style structured practice.</p>
            {worksheets.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-foreground">No worksheets published yet</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {worksheets.map((worksheet) => (
                  <Card key={worksheet.id} className="hover:border-blue-500/50 transition-all shadow-sm bg-card group overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/80 to-blue-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="bg-blue-500/10 p-3 rounded-xl">
                          <FileText className="h-6 w-6 text-blue-500" />
                        </div>
                        <Badge variant="outline" className={cn("capitalize font-medium", difficultyColor[worksheet.difficulty] || difficultyColor.medium)}>
                          {worksheet.difficulty}
                        </Badge>
                      </div>

                      <h3 className="text-lg font-bold text-foreground group-hover:text-blue-500 transition-colors">
                        {worksheet.title}
                      </h3>

                      {worksheet.topic && (
                        <p className="text-sm text-muted-foreground mt-1">{worksheet.topic.topicName}</p>
                      )}

                      <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5" />
                          {worksheet.type === "PDF_WORKSHEET" ? "PDF format" : `${worksheet._count.questions} Questions`}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {worksheet.estimatedTime} min
                        </span>
                      </div>

                      {worksheet.type === "PDF_WORKSHEET" ? (
                        <div className="flex flex-col sm:flex-row gap-2 mt-5">
                          {worksheet.pdfUrl && (
                            <a href={worksheet.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                              <Button className="w-full font-semibold bg-blue-500 hover:bg-blue-600 text-white" size="lg">
                                View Questions
                              </Button>
                            </a>
                          )}
                          {worksheet.pdfAnswerUrl && (
                            <a href={worksheet.pdfAnswerUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                              <Button variant="outline" className="w-full font-semibold" size="lg">
                                View Answers
                              </Button>
                            </a>
                          )}
                        </div>
                      ) : (
                        <Link href={`/resources/${board}/${qualification}/${subject.slug}/challenge/${worksheet.id}`}>
                          <Button className="w-full mt-5 font-semibold bg-blue-500 hover:bg-blue-600 text-white" size="lg">
                            Start Worksheet
                          </Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

        </div>
      </TabsContent>

      <TabsContent value="syllabus" className="mt-0">
        <Card className="shadow-sm border-border bg-card">
          <CardHeader>
            <CardTitle>Syllabus Outline</CardTitle>
            <CardDescription>Overview of the {subject.name} curriculum.</CardDescription>
          </CardHeader>
          <CardContent>
             {subject.syllabusPdfUrl ? (
               <div className="flex flex-col gap-4">
                 <p className="text-muted-foreground">The official syllabus document is available for viewing or downloading below.</p>
                 <div className="flex gap-4">
                   <Link
                     href={subject.syllabusPdfUrl}
                     target="_blank"
                     rel="noopener noreferrer"
                     className={cn(buttonVariants({ variant: "default" }), "gap-2")}
                   >
                     <FileText className="h-4 w-4" /> View PDF
                   </Link>
                   <a
                     href={subject.syllabusPdfUrl}
                     download
                     target="_blank"
                     rel="noopener noreferrer"
                     className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
                   >
                     <Download className="h-4 w-4" /> Download
                   </a>
                 </div>
               </div>
             ) : (
               <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                 <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
                 <h3 className="text-lg font-semibold text-foreground">Syllabus unavailable</h3>
                 <p className="text-muted-foreground mt-2">The syllabus for this subject has not been uploaded yet.</p>
               </div>
             )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
