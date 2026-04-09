"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { boards, levels, subjects, years, mockedPapers } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, ChevronRight, Download, SplitSquareHorizontal, Folder } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

function PastPapersInner() {
  const searchParams = useSearchParams();
  const boardParam = searchParams.get("board");
  
  const initialBoard = boards.find(b => b.id.toLowerCase() === boardParam?.toLowerCase())?.id || boards[0].id;

  const [selectedBoard, setSelectedBoard] = useState(initialBoard);
  const [selectedLevel, setSelectedLevel] = useState(levels.filter(l => l.boardId === initialBoard)[0]?.id || levels[0].id);
  const [selectedSubject, setSelectedSubject] = useState(subjects.filter(s => s.levelIds.includes(selectedLevel))[0]?.id || subjects[0].id);
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");

  // Keep levels and subjects synced correctly if state changes
  const filteredLevels = levels.filter((l) => l.boardId === selectedBoard);
  const filteredSubjects = subjects.filter((s) => s.levelIds.includes(selectedLevel));
  
  const filteredPapers = mockedPapers.filter((p) => {
    let match = p.boardId === selectedBoard && 
                p.levelId === selectedLevel && 
                p.subjectId === selectedSubject;
    if (selectedYear !== "all") {
      match = match && p.year === selectedYear;
    }
    return match;
  });

  // Series Bundling Algorithm
  const groupedPapers = filteredPapers.reduce((acc, paper) => {
    const key = `${paper.season} ${paper.year}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(paper);
    return acc;
  }, {} as Record<string, typeof mockedPapers>);

  const sortedKeys = Object.keys(groupedPapers).sort((a, b) => {
    const yearA = parseInt(a.slice(-4));
    const yearB = parseInt(b.slice(-4));
    if (yearA !== yearB) return yearB - yearA;
    return b.localeCompare(a); // Rough season sort
  });

  return (
    <div className="container px-4 md:px-8 py-8 max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
      {/* Sidebar Filters */}
      <aside className="w-full md:w-64 shrink-0 space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
             <BookOpen className="h-5 w-5 text-primary" /> Browse Papers
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Education Board</Label>
              <div className="flex flex-col gap-2">
                {boards.map((b) => (
                  <Button 
                    key={b.id} 
                    variant={selectedBoard === b.id ? "default" : "outline"}
                    className="justify-start w-full font-semibold"
                    onClick={() => {
                      setSelectedBoard(b.id);
                      const newLevels = levels.filter((l) => l.boardId === b.id);
                      if (newLevels.length) {
                         setSelectedLevel(newLevels[0].id);
                         const newSubjects = subjects.filter(s => s.levelIds.includes(newLevels[0].id));
                         if (newSubjects.length) setSelectedSubject(newSubjects[0].id);
                      }
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

            <div className="space-y-2">
              <Label>Year Filter</Label>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(val) => setSelectedYear(val === "all" ? "all" : parseInt(val || "0"))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

        {sortedKeys.length === 0 ? (
          <div className="text-center py-24 bg-muted/30 rounded-lg border border-dashed">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">No papers found</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mt-1">
              Try adjusting your filters or check back later. We are constantly uploading new resources.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {sortedKeys.map((seriesKey) => (
              <Card key={seriesKey} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow border-muted">
                <CardHeader className="p-4 bg-muted/30 border-b flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-md">
                      <Folder className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-bold">{seriesKey} Series</CardTitle>
                  </div>
                  <Badge variant="outline" className="ml-auto font-medium">
                    {groupedPapers[seriesKey].length} Papers
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex flex-col divide-y divide-border">
                    {groupedPapers[seriesKey].sort((a,b) => a.paperNumber.localeCompare(b.paperNumber)).map((paper) => (
                      <div key={paper.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                        <div>
                          <h4 className="font-bold text-lg text-foreground flex items-center gap-2">
                            {paper.title}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1 font-medium">
                            Paper {paper.paperNumber} (Variant {paper.variant})
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                          <Link href={`/papers/viewer?qp=${paper.qpUrl}&ms=${paper.msUrl}${paper.sfUrl ? `&sf=${paper.sfUrl}` : ""}`} className="w-full sm:w-auto">
                            <Button variant="default" size="sm" className="w-full gap-2 shadow-sm">
                              <SplitSquareHorizontal className="h-4 w-4" /> Practice Split View
                            </Button>
                          </Link>
                          {paper.sfUrl && (
                            <a href={paper.sfUrl} download className="w-full sm:w-auto flex">
                              <Button variant="outline" size="sm" className="w-full gap-2 text-primary border-primary/30 hover:bg-primary/10 hover:text-primary">
                                <Download className="h-4 w-4" /> Source Files
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function PastPapersPage() {
  return (
    <Suspense fallback={<div className="flex h-[calc(100vh-65px)] items-center justify-center">Loading browser...</div>}>
      <PastPapersInner />
    </Suspense>
  );
}
