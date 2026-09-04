"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type StudentData = {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  averageScore: number | null;
  weakTopics: string[];
  enrolledAt: Date;
};

export default function StudentsClient({ initialStudents }: { initialStudents: StudentData[] }) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<keyof StudentData>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (field: keyof StudentData) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc"); // default desc for scores/dates, asc for names
      if (field === "name") setSortDirection("asc");
    }
  };

  const filtered = initialStudents.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    (s.email && s.email.toLowerCase().includes(search.toLowerCase())) ||
    s.classes.some(c => c.name.toLowerCase().includes(search.toLowerCase()))
  );

  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (aVal === null) aVal = -1;
    if (bVal === null) bVal = -1;

    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const renderSortIcon = (field: keyof StudentData) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? <ChevronUp className="inline w-4 h-4 ml-1" /> : <ChevronDown className="inline w-4 h-4 ml-1" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative w-full max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search students, emails, or classes..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {sorted.length} of {initialStudents.length} students
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("name")}>
                Student {renderSortIcon("name")}
              </TableHead>
              <TableHead>Classes</TableHead>
              <TableHead className="cursor-pointer text-center hover:bg-muted/50 transition-colors" onClick={() => handleSort("averageScore")}>
                Avg Score {renderSortIcon("averageScore")}
              </TableHead>
              <TableHead>Weak Topics</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground bg-background">
                  {initialStudents.length === 0
                    ? "No one has joined yet. Share the class code with students."
                    : "No students match your search."}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((student) => (
                <TableRow key={student.id} className="group bg-background hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-border">
                        <AvatarImage src={student.image || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary">{student.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {student.classes.map(c => (
                        <Badge key={c.id} variant="secondary" className="text-[10px] font-medium bg-muted text-foreground">
                          {c.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {student.averageScore !== null ? (
                      <div className="flex flex-col items-center">
                        <span className={`font-bold ${student.averageScore >= 80 ? 'text-emerald-500' : student.averageScore >= 60 ? 'text-amber-500' : 'text-destructive'}`}>
                          {student.averageScore}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {student.weakTopics.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {student.weakTopics.map((topic, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-500 bg-amber-500/5">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">Not enough attempts yet</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/workspace/students/${student.id}`}>
                      <Button variant="outline" size="sm" className="text-primary hover:text-primary hover:bg-primary/10">
                        View Profile
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
