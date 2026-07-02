"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, BookOpen, Layers, ScrollText, Download, Trophy, Clock, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const difficultyColor: Record<string, string> = {
  easy: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  medium: "border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10",
  hard: "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10",
  mixed: "border-primary/50 text-primary bg-primary/10",
};

export default function SubjectTabsClient({
  papersByYear,
  topics,
  notes,
  subject,
  challenges = [],
  board = "",
  qualification = "",
}: {
  papersByYear: Record<number, Record<string, any[]>>;
  topics: any[];
  notes: any[];
  subject: any;
  challenges?: any[];
  board?: string;
  qualification?: string;
}) {
  const years = Object.keys(papersByYear).map(Number).sort((a, b) => b - a);

  return (
    <Tabs defaultValue="past-papers" className="w-full">
      <TabsList className="grid w-full grid-cols-4 max-w-3xl mb-8 h-auto p-1">
        <TabsTrigger value="past-papers" className="py-2">Past Papers</TabsTrigger>
        <TabsTrigger value="practice" className="py-2 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5" />Quick Practice
        </TabsTrigger>
        <TabsTrigger value="notes" className="py-2">Notes</TabsTrigger>
        <TabsTrigger value="syllabus" className="py-2">Syllabus</TabsTrigger>
      </TabsList>
      
      <TabsContent value="past-papers" className="mt-0">
        {years.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground">No past papers found</h3>
            <p className="text-muted-foreground">Papers for this subject will be uploaded soon.</p>
          </div>
        ) : (
          <Accordion className="w-full space-y-4" defaultValue={[years[0].toString()]}>
            {years.map((year) => (
              <AccordionItem value={year.toString()} key={year} className="border rounded-xl bg-card overflow-hidden shadow-sm">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 px-3 py-1 rounded-lg text-primary font-bold">
                      {year}
                    </div>
                    <span className="text-lg font-semibold text-foreground">Series</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2">
                  <Accordion className="w-full space-y-4 mt-4">
                    {Object.entries(papersByYear[year]).sort(([a], [b]) => a.localeCompare(b)).map(([season, papers]) => (
                      <AccordionItem value={season} key={season} className="border rounded-lg bg-muted/10 overflow-hidden">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 transition-colors">
                          <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{season}</h4>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 pt-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {papers.map((paper) => (
                              <Card key={paper.id} className="hover:border-primary/50 transition-colors shadow-sm group">
                                <CardContent className="p-4 flex flex-col justify-between h-full gap-4">
                                  <div>
                                    <div className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                                      Paper {paper.paperNumber} {paper.variant ? `(Variant ${paper.variant})` : ''}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2 w-full mt-auto">
                                    <Link 
                                      href={paper.questionPdfUrl ? `/papers/viewer?qp=${encodeURIComponent(paper.questionPdfUrl)}&ms=${encodeURIComponent(paper.msPdfUrl || '')}&id=${paper.id}` : '#'}
                                      className={cn(buttonVariants({ size: "sm", variant: paper.questionPdfUrl ? "default" : "secondary" }), "flex-1 font-medium", !paper.questionPdfUrl && "pointer-events-none opacity-50")}
                                    >
                                      {paper.questionPdfUrl ? "Open Viewer" : "Coming Soon"}
                                    </Link>
                                    
                                    {paper.questionPdfUrl && (
                                      <a
                                        href={`/api/protected/pdf?url=${encodeURIComponent(paper.questionPdfUrl)}&download=true`}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(buttonVariants({ size: "sm", variant: "outline" }), "flex-1 font-medium")}
                                        title="Download QP"
                                      >
                                        <Download className="w-4 h-4 mr-1" /> QP
                                      </a>
                                    )}

                                    {paper.sourceFilesUrl && (
                                      <a
                                        href={paper.sourceFilesUrl}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(buttonVariants({ size: "sm", variant: "outline" }), "flex-1 font-medium")}
                                        title="Download SF"
                                      >
                                        <Download className="w-4 h-4 mr-1" /> SF
                                      </a>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </TabsContent>
      
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
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold">MCQ Challenges</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Fast revision and topic mastery.</p>
            {challenges.filter(c => c.type === "CHALLENGE" || !c.type).length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-foreground">No challenges available</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {challenges.filter(c => c.type === "CHALLENGE" || !c.type).map((challenge) => (
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
            {challenges.filter(c => c.type === "WORKSHEET" || c.type === "PDF_WORKSHEET").length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-foreground">No worksheets published yet</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {challenges.filter(c => c.type === "WORKSHEET" || c.type === "PDF_WORKSHEET").map((worksheet: any) => (
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
