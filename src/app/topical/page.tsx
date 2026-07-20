"use client";

import { useState } from "react";
import { boards, levels, subjects } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, FolderTree, ChevronRight } from "lucide-react";
import Link from "next/link";

const mockTopics = [
  {
    id: "t1",
    boardId: "cambridge",
    levelId: "igcse",
    subjectId: "ict-0417",
    chapterName: "1. Types and components of computer systems",
    questions: [
      { difficulty: "Easy", count: 12, qpUrl: "#", msUrl: "#" },
      { difficulty: "Hard", count: 8, qpUrl: "#", msUrl: "#" }
    ]
  },
  {
    id: "t2",
    boardId: "cambridge",
    levelId: "igcse",
    subjectId: "ict-0417",
    chapterName: "2. Input and output devices",
    questions: [
      { difficulty: "Easy", count: 20, qpUrl: "#", msUrl: "#" },
      { difficulty: "Medium", count: 15, qpUrl: "#", msUrl: "#" }
    ]
  }
];

export default function TopicalQuestionsPage() {
  const [selectedBoard, setSelectedBoard] = useState(boards[0].id);
  const [selectedLevel, setSelectedLevel] = useState(levels[0].id);
  const [selectedSubject, setSelectedSubject] = useState(subjects[0].id);

  const filteredLevels = levels.filter((l) => l.boardId === selectedBoard);
  const filteredSubjects = subjects.filter((s) => s.levelIds.includes(selectedLevel));
  
  const filteredTopics = mockTopics.filter((t) => 
    t.boardId === selectedBoard && 
    t.levelId === selectedLevel && 
    t.subjectId === selectedSubject
  );

  return (
    <div className="container px-4 md:px-8 py-8 max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
      {/* Sidebar Filters */}
      <aside className="w-full md:w-64 shrink-0 space-y-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight mb-4 flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-primary" /> Topical Questions
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Education Board</Label>
              <div className="flex flex-col gap-2">
                {boards.map((b) => (
                  <Button 
                    key={b.id} 
                    variant={selectedBoard === b.id ? "default" : "outline"}
                    className="justify-start w-full"
                    onClick={() => {
                      setSelectedBoard(b.id);
                      const newLevels = levels.filter((l) => l.boardId === b.id);
                      if (newLevels.length) setSelectedLevel(newLevels[0].id);
                    }}
                  >
                    {b.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Level</Label>
              <div className="grid grid-cols-2 gap-2">
                {filteredLevels.map((l) => (
                  <Button 
                    key={l.id} 
                    size="sm"
                    variant={selectedLevel === l.id ? "default" : "outline"}
                    className="justify-start truncate"
                    onClick={() => {
                      setSelectedLevel(l.id);
                      const newSubjects = subjects.filter((s) => s.levelIds.includes(l.id));
                      if (newSubjects.length) setSelectedSubject(newSubjects[0].id);
                    }}
                  >
                    {l.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <div className="flex flex-col gap-2">
                {filteredSubjects.map((s) => (
                  <Button 
                    key={s.id} 
                    size="sm"
                    variant={selectedSubject === s.id ? "default" : "outline"}
                    className="justify-start text-left h-auto py-2"
                    onClick={() => setSelectedSubject(s.id)}
                  >
                    {s.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground pb-4 border-b">
          <span>{boards.find(b => b.id === selectedBoard)?.name}</span>
          <ChevronRight className="h-4 w-4" />
          <span>{levels.find(l => l.id === selectedLevel)?.name}</span>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">{subjects.find(s => s.id === selectedSubject)?.name}</span>
        </div>

        {filteredTopics.length === 0 ? (
          <div className="text-center py-24 bg-muted/30 rounded-lg border border-dashed">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">No topical questions found</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mt-1">
              Topical questions for this subject are still being compiled. Check back soon!
            </p>
          </div>
        ) : (
          <Card className="border bg-card">
            <CardContent className="p-0">
              <Accordion className="w-full">
                {filteredTopics.map((topic, i) => (
                  <AccordionItem value={`item-${i}`} key={topic.id} className="last:border-0 px-6">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex text-left items-center justify-between w-full pr-4">
                        <span className="font-semibold text-base">{topic.chapterName}</span>
                        <Badge variant="secondary" className="font-normal shrink-0 ml-2">
                          {topic.questions.reduce((acc, q) => acc + q.count, 0)} Questions
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-3 pt-2">
                        {topic.questions.map((q, j) => (
                          <div key={j} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg border bg-muted/20">
                            <div className="flex items-center gap-3 mb-3 sm:mb-0">
                              <Badge variant={q.difficulty === "Hard" ? "destructive" : q.difficulty === "Medium" ? "default" : "secondary"}>
                                {q.difficulty}
                              </Badge>
                              <span className="text-sm font-medium">{q.count} exam-style questions.</span>
                            </div>
                            {q.qpUrl === "#" ? (
                              <Button size="sm" variant="outline" className="w-full sm:w-auto" disabled>
                                Resource coming soon
                              </Button>
                            ) : (
                              <Link
                                href={`/topical/viewer?question=${encodeURIComponent(q.qpUrl)}&answers=${encodeURIComponent(q.msUrl || "")}`}
                                className="w-full sm:w-auto"
                              >
                                <Button size="sm" variant="outline" className="w-full gap-2 bg-background">
                                  <BookOpen className="h-4 w-4 text-primary" /> Open questions
                                </Button>
                              </Link>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
