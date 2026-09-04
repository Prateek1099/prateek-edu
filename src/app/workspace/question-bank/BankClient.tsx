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
import { createWorkspaceQuestion, deleteWorkspaceQuestion } from "@/app/actions/workspace-bank";
import { Plus, Trash2, AlertCircle, Globe, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type SubjectOption = { id: string; label: string; board: string };
type TopicOption = { id: string; label: string; subjectId: string };
type BankQuestionRow = {
  id: string;
  subjectId: string;
  topicId: string | null;
  questionText: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  correctAnswer: string | null;
  topicTag: string | null;
  difficulty: string;
  workspaceId: string | null;
  subject: { name: string } | null;
  topic: { topicName: string } | null;
};

const difficultyColor: Record<string, string> = {
  easy: "border-emerald-500/50 text-emerald-600 bg-emerald-500/10",
  medium: "border-amber-500/50 text-amber-600 bg-amber-500/10",
  hard: "border-red-500/50 text-red-600 bg-red-500/10",
};

export default function BankClient({
  initialQuestions,
  subjectOptions,
  topicOptions,
  workspaceId,
}: {
  initialQuestions: BankQuestionRow[];
  subjectOptions: SubjectOption[];
  topicOptions: TopicOption[];
  workspaceId: string;
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  
  // Filters
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const difficultyFilter = "all";
  const [ownershipFilter, setOwnershipFilter] = useState<string>("all"); // 'all', 'my', 'vexa'
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
      
      if (ownershipFilter === "my" && q.workspaceId !== workspaceId) return false;
      if (ownershipFilter === "vexa" && q.workspaceId !== null) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!q.questionText.toLowerCase().includes(query) && !q.topicTag?.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [questions, subjectFilter, topicFilter, difficultyFilter, ownershipFilter, searchQuery, workspaceId]);

  const handleParse = () => {
    setParseResult(parseQuestions(importText));
  };

  const handleImport = async () => {
    if (!importSubject) return toast.error("Select a subject first");
    if (!parseResult || parseResult.errors.length > 0) return toast.error("Fix parsing errors first");
    
    setImporting(true);
    try {
      // Import one by one for workspace questions
      const topicId = importTopic === "none" ? null : importTopic;
      
      for (const q of parseResult.questions) {
        await createWorkspaceQuestion({
          subjectId: importSubject,
          topicId,
          ...q
        });
      }
      
      toast.success(`Imported ${parseResult.questions.length} questions`);
      setImportOpen(false);
      setImportText("");
      setParseResult(null);
      window.location.reload(); // Quick refresh to get new records
    } catch {
      toast.error("Failed to import");
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id: string, qWorkspaceId: string | null) => {
    if (qWorkspaceId !== workspaceId) {
      return toast.error("You can only delete your own workspace questions");
    }
    
    if (!confirm("Delete this question?")) return;
    
    try {
      await deleteWorkspaceQuestion(id);
      toast.success("Question deleted");
      setQuestions(q => q.filter(x => x.id !== id));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Bar */}
      <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex flex-wrap gap-3 w-full xl:w-auto items-center">
          <Input 
            placeholder="Search questions..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-48 lg:w-64"
          />
          <Select value={ownershipFilter} onValueChange={(v) => setOwnershipFilter(v || "all")}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Ownership" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Questions</SelectItem>
              <SelectItem value="my">My Questions</SelectItem>
              <SelectItem value="vexa">Vexa library</SelectItem>
            </SelectContent>
          </Select>
          <Select value={subjectFilter} onValueChange={(v) => { setSubjectFilter(v || "all"); setTopicFilter("all"); }}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjectOptions.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={topicFilter} onValueChange={(v) => setTopicFilter(v || "all")} disabled={subjectFilter === "all"}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Topics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              {filteredTopicsForFilter.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={() => setImportOpen(true)} className="w-full xl:w-auto gap-2">
          <Plus className="h-4 w-4" /> Add Questions
        </Button>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[45%]">Question</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Metadata</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    {ownershipFilter === "my" && questions.every((question) => question.workspaceId !== workspaceId)
                      ? "You haven’t added your own questions yet. You can still use the Vexa library."
                      : "No questions match your filters."}
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
                      {q.workspaceId === null ? (
                        <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 w-fit px-2 py-1 rounded-md border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400">
                          <Globe className="size-3" /> Vexa library
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-violet-600 bg-violet-50 w-fit px-2 py-1 rounded-md border border-violet-200 dark:bg-violet-900/20 dark:border-violet-800 dark:text-violet-400">
                          <Lock className="size-3" /> My Workspace
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="font-medium">{q.subject?.name}</span>
                        {q.topic ? <span className="text-muted-foreground">{q.topic.topicName}</span> : null}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={cn("capitalize text-[10px] px-1.5 py-0", difficultyColor[q.difficulty] || difficultyColor.medium)}>
                            {q.difficulty}
                          </Badge>
                          {q.topicTag ? <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{q.topicTag}</Badge> : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {q.workspaceId === workspaceId && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(q.id, q.workspaceId)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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
            <DialogTitle>Add Questions to Workspace</DialogTitle>
            <DialogDescription>Paste questions in the required format to add them to your private bank.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={importSubject} onValueChange={(v) => { setImportSubject(v || ""); setImportTopic("none"); }}>
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
                    {importing ? "Importing..." : "Confirm Import to Workspace"}
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
