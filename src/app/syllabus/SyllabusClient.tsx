"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Target, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type SubjectWithSyllabus = {
  id: string;
  name: string;
  code: string | null;
  syllabusPdfUrl: string | null;
};

type QualificationWithSubjects = {
  id: string;
  title: string;
  subjects: SubjectWithSyllabus[];
};

type BoardData = {
  id: string;
  title: string;
  qualifications: QualificationWithSubjects[];
};

export default function SyllabusClient({ boards }: { boards: BoardData[] }) {
  const [selectedBoard, setSelectedBoard] = useState(boards[0]?.id);

  const currentBoard = boards.find((b) => b.id === selectedBoard);
  const qualifications = currentBoard?.qualifications || [];

  return (
    <div className="container px-4 md:px-8 py-8 max-w-5xl mx-auto flex flex-col items-center">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4 flex items-center justify-center gap-3">
          <Target className="h-8 w-8 text-primary" /> Official Syllabuses
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Download the core curriculum and technical frameworks to structure your study plan effectively.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4 mb-10 w-full max-w-lg">
        {boards.map((b) => (
          <Button 
            key={b.id} 
            variant={selectedBoard === b.id ? "default" : "outline"}
            className="text-base flex-1 min-w-[140px]"
            onClick={() => setSelectedBoard(b.id)}
          >
            {b.title}
          </Button>
        ))}
      </div>

      <div className="w-full space-y-12">
        {qualifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No subjects found for this board.
          </div>
        ) : (
          qualifications.map((qual) => (
            <div key={qual.id} className="w-full">
              <div className="flex items-center gap-2 mb-6 px-2 border-b pb-2">
                <ChevronRight className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">{qual.title}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {qual.subjects.map((subject) => (
                  <Card key={subject.id} className="hover:border-primary/40 transition-colors group">
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg leading-tight">{subject.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {subject.code ? `Code: ${subject.code}` : "Official Curriculum"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-auto pt-4 flex gap-2">
                        {subject.syllabusPdfUrl ? (
                          <>
                            <Link 
                              href={subject.syllabusPdfUrl}
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className={cn(buttonVariants({ variant: "outline" }), "w-full gap-2")}
                            >
                              View PDF
                            </Link>
                            <a 
                              href={subject.syllabusPdfUrl} 
                              download 
                              target="_blank"
                              rel="noopener noreferrer"
                              className={buttonVariants({ variant: "secondary", className: "px-3" })}
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </>
                        ) : (
                          <div className="w-full text-center py-2 text-sm text-muted-foreground bg-muted/30 rounded-md border border-dashed">
                            Syllabus not uploaded yet
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
