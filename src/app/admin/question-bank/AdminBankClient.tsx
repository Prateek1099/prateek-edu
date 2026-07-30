"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { parseQuestions, type ParseResult } from "@/lib/parseQuestions";
import { appendBankQuestions, deleteBankQuestion } from "@/app/actions/admin";
import { Trash2, Upload, AlertCircle, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

import { useAdminBoard } from "@/components/AdminBoardContext";

type SubjectOption = { id: string; label: string; board: string };
type TopicOption = { id: string; label: string; subjectId: string };
type BankQuestion = {
  id: string;
  subjectId: string;
  topicId: string | null;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  difficulty: string;
  marks: number;
  topicTag: string | null;
  subject: {
    name: string;
    qualification: { board: { name: string } };
  };
  topic: { topicName: string } | null;
};

const difficultyColor: Record<string, string> = {
  easy: "border-emerald-500/50 text-emerald-600 bg-emerald-500/10",
  medium: "border-amber-500/50 text-amber-600 bg-amber-500/10",
  hard: "border-red-500/50 text-red-600 bg-red-500/10",
};

export default function AdminBankClient({
  initialQuestions,
  subjectOptions,
  topicOptions,
}: {
  initialQuestions: BankQuestion[];
  subjectOptions: SubjectOption[];
  topicOptions: TopicOption[];
}) {
  const { selectedBoard } = useAdminBoard();
  const [questions, setQuestions] = useState(initialQuestions);
  
  const filteredSubjectOptions = useMemo(() => {
    if (selectedBoard === "all") return subjectOptions;
    return subjectOptions.filter(s => s.board === selectedBoard);
  }, [subjectOptions, selectedBoard]);
  
  // Filters
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Import Dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importSubject, setImportSubject] = useState<string>("");
  const [importTopic, setImportTopic] = useState<string>("none");
  const [importText, setImportText] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // Derived options
  const filteredTopicOptions = useMemo(() => {
    if (!importSubject) return [];
    return topicOptions.filter((t) => t.subjectId === importSubject);
  }, [importSubject, topicOptions]);

  const filteredTopicsForFilter = useMemo(() => {
    if (subjectFilter === "all") return [];
    return topicOptions.filter((t) => t.subjectId === subjectFilter);
  }, [subjectFilter, topicOptions]);

  // Derived questions
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (selectedBoard !== "all" && q.subject.qualification.board.name !== selectedBoard) return false;
      if (subjectFilter !== "all" && q.subjectId !== subjectFilter) return false;
      if (topicFilter !== "all" && q.topicId !== topicFilter) return false;
      if (difficultyFilter !== "all" && q.difficulty !== difficultyFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!q.questionText.toLowerCase().includes(query) && !q.topicTag?.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [questions, subjectFilter, topicFilter, difficultyFilter, searchQuery, selectedBoard]);

  const handleParse = () => {
    setParseResult(parseQuestions(importText));
  };

  const handleImport = async () => {
    if (!importSubject) return toast.error("Select a subject first");
    if (!parseResult || parseResult.errors.length > 0) return toast.error("Fix parsing errors first");
    
    setImporting(true);
    try {
      const res = await appendBankQuestions(importSubject, importTopic === "none" ? null : importTopic, parseResult.questions);
      if (res.success) {
        toast.success(`Imported ${parseResult.questions.length} questions`);
        setImportOpen(false);
        setImportText("");
        setParseResult(null);
        window.location.reload(); // Quick refresh to get new records
      } else {
        toast.error(res.error || "Failed to import");
      }
    } catch {
      toast.error("Failed to import");
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    const res = await deleteBankQuestion(id);
    if (res.success) {
      toast.success("Question deleted");
      setQuestions(q => q.filter(x => x.id !== id));
    } else {
      toast.error(res.error || "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Bar */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">
            {filteredQuestions.length} of {questions.length} questions
          </p>
          <Button onClick={() => setImportOpen(true)} className="w-full gap-2 sm:w-auto">
            <Upload className="h-4 w-4" /> Bulk import
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_minmax(190px,260px)_minmax(180px,240px)_150px]">
          <Input 
            placeholder="Search question text or topic tag…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select value={subjectFilter} onValueChange={(v) => { setSubjectFilter(v || "all"); setTopicFilter("all"); }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {filteredSubjectOptions.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={topicFilter} onValueChange={(v) => setTopicFilter(v || "all")} disabled={subjectFilter === "all"}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Topics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              {filteredTopicsForFilter.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficultyFilter} onValueChange={(v) => setDifficultyFilter(v || "all")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Question</TableHead>
                <TableHead>Metadata</TableHead>
                <TableHead>Difficulty / Marks</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    No questions found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuestions.map(q => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <p className={cn("font-medium", expandedQuestionId === q.id ? "" : "line-clamp-2")}>{q.questionText}</p>
                      <div className={cn("mt-3 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2", expandedQuestionId === q.id ? "" : "hidden")}>
                        <span className={q.correctAnswer === "A" ? "font-semibold text-emerald-600" : ""}>A: {q.optionA}</span>
                        <span className={q.correctAnswer === "B" ? "font-semibold text-emerald-600" : ""}>B: {q.optionB}</span>
                        <span className={q.correctAnswer === "C" ? "font-semibold text-emerald-600" : ""}>C: {q.optionC}</span>
                        <span className={q.correctAnswer === "D" ? "font-semibold text-emerald-600" : ""}>D: {q.optionD}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="font-medium">{q.subject?.name}</span>
                        {q.topic ? <span className="text-muted-foreground">{q.topic.topicName}</span> : null}
                        {q.topicTag ? <Badge variant="outline" className="w-fit mt-1">{q.topicTag}</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("capitalize", difficultyColor[q.difficulty] || difficultyColor.medium)}>
                          {q.difficulty}
                        </Badge>
                        <Badge variant="secondary">{q.marks} Mark{q.marks !== 1 && 's'}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedQuestionId((current) => current === q.id ? null : q.id)}
                        title={expandedQuestionId === q.id ? "Hide preview" : "Preview question"}
                      >
                        {expandedQuestionId === q.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{expandedQuestionId === q.id ? "Hide preview" : "Preview question"}</span>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(q.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive" title="Delete question">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete question</span>
                      </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Bulk Import Questions</DialogTitle>
            <DialogDescription>Paste questions in the required format to add them to the Bank.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={importSubject} onValueChange={(v) => { setImportSubject(v || ""); setImportTopic("none"); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubjectOptions.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Topic (Optional)</Label>
              <Select value={importTopic} onValueChange={(v) => setImportTopic(v || "none")} disabled={!importSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Topic</SelectItem>
                  {filteredTopicOptions.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4 text-sm">
            <p className="font-medium">Import format</p>
            <p className="mt-1 text-muted-foreground">
              Separate questions with <code className="rounded bg-background px-1 py-0.5">---</code>. Each question needs QUESTION, options A–D, and ANSWER. Explanation, topic, difficulty, and marks are optional.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Parse first. Nothing is written to the Question Bank until the preview has no errors and you confirm the import.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Raw Question Data</Label>
              <Button size="sm" variant="outline" onClick={handleParse}>Parse Text</Button>
            </div>
            <Textarea 
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="font-mono text-sm h-64"
              placeholder={`QUESTION: What is a primary key?\nA) Field used for calculations\nB) Unique identifier for a record\nC) Validation rule\nD) Data type\nANSWER: B\nEXPLANATION: Unique identifier\nTOPIC: Primary Keys\nDIFFICULTY: Easy\nMARKS: 1\n---`}
            />
          </div>

          {parseResult && (
            <div className="space-y-4">
              {parseResult.errors.length > 0 && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg space-y-2">
                  <div className="font-bold flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" /> Parsing errors — import blocked
                  </div>
                  <ul className="list-disc pl-5 text-sm">
                    {parseResult.errors.map((e, i) => (
                      <li key={i}>Line {e.line}: {e.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {parseResult.questions.length > 0 && (
                <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-lg space-y-2">
                  <div className="font-bold">Ready to import {parseResult.questions.length} questions</div>
                  <Button onClick={handleImport} disabled={importing || parseResult.errors.length > 0} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
                    {importing ? "Importing..." : "Confirm Import to Question Bank"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
