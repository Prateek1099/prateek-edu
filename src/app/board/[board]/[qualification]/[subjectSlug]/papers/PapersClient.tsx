"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BookOpen, ChevronRight, SplitSquareHorizontal, Folder, Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function PapersClient({ initialPapers }: { initialPapers: any[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedSeason, setSelectedSeason] = useState<string>("all");

  const years = useMemo(() => Array.from(new Set(initialPapers.map(p => p.year))).sort((a,b) => b-a), [initialPapers]);
  const seasons = useMemo(() => Array.from(new Set(initialPapers.filter(p => p.season).map(p => p.season))), [initialPapers]);

  // Filter papers
  const filteredPapers = useMemo(() => {
    return initialPapers.filter(p => {
      const matchSearch = p.year.toString().includes(searchQuery) ||
                          `Paper ${p.paperNumber}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.season && p.season.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchYear = selectedYear === "all" || p.year.toString() === selectedYear;
      const matchSeason = selectedSeason === "all" || p.season === selectedSeason;
      
      return matchSearch && matchYear && matchSeason;
    });
  }, [initialPapers, searchQuery, selectedYear, selectedSeason]);

  // Group by Year and Season
  const groupedPapers = useMemo(() => {
    return filteredPapers.reduce((acc, paper) => {
      const key = `${paper.year} - ${paper.season || "Unknown Season"}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(paper);
      return acc;
    }, {} as Record<string, typeof initialPapers>);
  }, [filteredPapers]);

  // Sort groups by year descending, then season
  const sortedKeys = Object.keys(groupedPapers).sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex flex-col md:flex-row gap-8 mt-6">
      {/* Sidebar Filters */}
      <aside className="w-full md:w-64 shrink-0 space-y-6">
        <div className="sticky top-24">
          <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
             <Search className="h-5 w-5 text-primary" /> Filter Papers
          </h2>
          <div className="space-y-4">
            
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="e.g., Paper 2..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={selectedYear} onValueChange={(val) => setSelectedYear(val || "all")}>
                <SelectTrigger>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {seasons.length > 0 && (
              <div className="space-y-2">
                <Label>Season</Label>
                <Select value={selectedSeason} onValueChange={(val) => setSelectedSeason(val || "all")}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Seasons" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Seasons</SelectItem>
                    {seasons.map((s: any) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={() => {
              setSearchQuery(""); setSelectedYear("all"); setSelectedSeason("all");
            }}>
              Clear Filters
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground pb-4 border-b">
          <span>Results</span>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">{filteredPapers.length} papers found</span>
        </div>

        {sortedKeys.length === 0 ? (
          <div className="text-center py-24 bg-muted/30 rounded-lg border border-dashed">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">No papers found</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mt-1">
              Try adjusting your filters or search query.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {sortedKeys.map((groupKey) => (
              <Card key={groupKey} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow border-muted">
                <CardHeader className="p-4 bg-muted/30 border-b flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-md">
                      <Folder className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-bold">{groupKey}</CardTitle>
                  </div>
                  <Badge variant="outline" className="ml-auto font-medium">
                    {groupedPapers[groupKey].length} Papers
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex flex-col divide-y divide-border">
                    {groupedPapers[groupKey].sort((a: any, b: any) => a.paperNumber - b.paperNumber).map((paper: any) => (
                      <div key={paper.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                        <div>
                          <h4 className="font-bold text-lg text-foreground flex items-center gap-2">
                            Paper {paper.paperNumber}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1 font-medium">
                            Variant {paper.variant || 'N/A'}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                          <Link href={`/papers/viewer?id=${paper.id}&qp=${encodeURIComponent(paper.questionPdfUrl || '')}&ms=${encodeURIComponent(paper.msPdfUrl || '')}`} className="w-full sm:w-auto">
                            <Button variant="default" size="sm" className="w-full gap-2 shadow-sm">
                              <SplitSquareHorizontal className="h-4 w-4" /> Practice Split View
                            </Button>
                          </Link>
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
