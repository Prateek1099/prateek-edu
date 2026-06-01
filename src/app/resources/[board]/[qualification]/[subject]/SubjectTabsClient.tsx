"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button, buttonVariants } from "@/components/ui/button";
import { FileText, BookOpen, Layers, ScrollText, Download } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function SubjectTabsClient({ papersByYear, topics, notes, subject }: { papersByYear: Record<number, Record<string, any[]>>, topics: any[], notes: any[], subject: any }) {
  const years = Object.keys(papersByYear).map(Number).sort((a, b) => b - a);

  return (
    <Tabs defaultValue="past-papers" className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 max-w-2xl mb-8 h-auto p-1">
        <TabsTrigger value="past-papers" className="py-2">Past Papers</TabsTrigger>
        <TabsTrigger value="topical" className="py-2">Topical</TabsTrigger>
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
          <Accordion type="multiple" className="w-full space-y-4" defaultValue={[years[0].toString()]}>
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
                  <Accordion type="multiple" className="w-full space-y-4 mt-4">
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
      
      <TabsContent value="topical" className="mt-0">
        {topics.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
            <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground">No topics found</h3>
            <p className="text-muted-foreground">Topical questions for this subject are being prepared.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {topics.map((topic, i) => (
               <Card key={topic.id} className="hover:border-primary/50 transition-colors cursor-pointer group shadow-sm bg-card">
                 <CardContent className="p-4 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                       {i + 1}
                     </div>
                     <span className="font-medium group-hover:text-primary transition-colors">{topic.topicName}</span>
                   </div>
                   <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">Practice</Button>
                 </CardContent>
               </Card>
             ))}
          </div>
        )}
      </TabsContent>

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

      <TabsContent value="syllabus" className="mt-0">
        <Card className="shadow-sm border-border bg-card">
          <CardHeader>
            <CardTitle>Syllabus Outline</CardTitle>
            <CardDescription>Overview of the {subject.name} curriculum.</CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-muted-foreground">The syllabus document will be made available here for direct viewing.</p>
             <Button variant="outline" className="mt-4"><Download className="h-4 w-4 mr-2" /> Download Syllabus PDF</Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
