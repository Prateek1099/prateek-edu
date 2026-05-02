"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { boards, subjects, levels } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Target, ChevronRight } from "lucide-react";
import Link from "next/link";

function SyllabusInner() {
  const searchParams = useSearchParams();
  const boardParam = searchParams.get("board");
  
  const initialBoard = boards.find(b => b.id.toLowerCase() === boardParam?.toLowerCase())?.id || boards[0].id;
  const [selectedBoard, setSelectedBoard] = useState(initialBoard);

  const filteredLevels = levels.filter(l => l.boardId === selectedBoard);
  
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

      <div className="flex gap-4 mb-10 w-full max-w-sm">
        {boards.map((b: any) => (
          <Button 
            key={b.id} 
            variant={selectedBoard === b.id ? "default" : "outline"}
            className="w-full text-base"
            onClick={() => setSelectedBoard(b.id)}
          >
            {b.name}
          </Button>
        ))}
      </div>

      <div className="w-full space-y-8">
        {filteredLevels.map((level: any) => {
          const levelSubjects = subjects.filter(s => s.levelIds.includes(level.id));
          if (levelSubjects.length === 0) return null;

          return (
            <div key={level.id} className="w-full">
              <div className="flex items-center gap-2 mb-4 px-2">
                <ChevronRight className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-semibold">{level.name}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {levelSubjects.map((subject: any) => {
                  // Clean naming convention for the backend: /syllabus/0417_syllabus.pdf
                  const subjectCodeMatch = subject.id.match(/-([0-9]+)$/);
                  const code = subjectCodeMatch ? subjectCodeMatch[1] : subject.id;
                  const syllabusUrl = `/syllabus/${code}_syllabus.pdf`;

                  return (
                    <Card key={subject.id} className="hover:border-primary/40 transition-colors group">
                      <CardContent className="p-6 flex flex-col h-full">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg leading-tight">{subject.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">Official Course Curriculum</p>
                          </div>
                        </div>
                        <div className="mt-auto pt-4 flex gap-2">
                          <a href={syllabusUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                            <Button variant="outline" className="w-full gap-2">
                              View PDF
                            </Button>
                          </a>
                          <a href={syllabusUrl} download className="flex-shrink-0">
                            <Button variant="secondary" className="px-3">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SyllabusPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-96">Loading...</div>}>
      <SyllabusInner />
    </Suspense>
  );
}
