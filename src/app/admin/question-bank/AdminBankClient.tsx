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
import { Database, Plus, Trash2, Upload, AlertCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type SubjectOption = { id: string; label: string };
type TopicOption = { id: string; label: string; subjectId: string };

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
  initialQuestions: any[];
  subjectOptions: SubjectOption[];
  topicOptions: TopicOption[];
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  
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
  }, [questions, subjectFilter, topicFilter, difficultyFilter, searchQuery]);

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
    } catch (e) {
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
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Input 
            placeholder="Search questions..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64"
          />
          <Select value={subjectFilter} onValueChange={(v) => { setSubjectFilter(v); setTopicFilter("all"); }}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjectOptions.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={topicFilter} onValueChange={setTopicFilter} disabled={subjectFilter === "all"}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Topics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              {filteredTopicsForFilter.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-full sm:w-32">
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
        
        <Button onClick={() => setImportOpen(true)} className="w-full sm:w-auto gap-2">
          <Upload className="h-4 w-4" /> Bulk Import
        </Button>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
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
                      <p className="font-medium line-clamp-2">{q.questionText}</p>
                      <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                        <span className={q.correctAnswer === 'A' ? "text-emerald-500 font-bold" : ""}>A: {q.optionA}</span>
                        <span className={q.correctAnswer === 'B' ? "text-emerald-500 font-bold" : ""}>B: {q.optionB}</span>
                        <span className={q.correctAnswer === 'C' ? "text-emerald-500 font-bold" : ""}>C: {q.optionC}</span>
                        <span className={q.correctAnswer === 'D' ? "text-emerald-500 font-bold" : ""}>D: {q.optionD}</span>
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
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(q.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Import Questions</DialogTitle>
            <DialogDescription>Paste questions in the required format to add them to the Bank.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={importSubject} onValueChange={(v) => { setImportSubject(v); setImportTopic("none"); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Topic (Optional)</Label>
              <Select value={importTopic} onValueChange={setImportTopic} disabled={!importSubject}>
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
                    <AlertCircle className="h-5 w-5" /> Parsing Errors
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
                  <div className="font-bold">Successfully parsed {parseResult.questions.length} questions!</div>
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
