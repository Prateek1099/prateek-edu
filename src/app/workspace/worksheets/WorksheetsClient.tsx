"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, FileText, Clock, Users, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { createWorksheet, deleteWorkspaceChallenge } from "@/app/actions/workspace-worksheets";
import AssignContentDialog, { type AssignmentClassOption } from "@/components/workspace/AssignContentDialog";

type SubjectOption = { id: string; label: string; board: string };
type TopicOption = { id: string; label: string; subjectId: string };
type WorkspaceWorksheet = {
  id: string;
  title: string;
  subjectId: string;
  difficulty: string;
  estimatedTime: number;
  assignedRecipientCount: number;
  subject: { name: string };
  topic: { topicName: string } | null;
  _count: { questions: number };
};
type WorkspaceBankQuestion = {
  id: string;
  subjectId: string;
  topicId: string | null;
  questionText: string;
  topicTag: string | null;
  marks: number;
  difficulty: string;
  workspaceId: string | null;
};

const difficultyColor: Record<string, string> = {
  easy: "border-emerald-500/50 text-emerald-600 bg-emerald-500/10",
  medium: "border-amber-500/50 text-amber-600 bg-amber-500/10",
  hard: "border-red-500/50 text-red-600 bg-red-500/10",
};

export default function WorksheetsClient({
  worksheets,
  subjectOptions,
  topicOptions,
  bankQuestions,
  assignmentClasses,
}: {
  worksheets: WorkspaceWorksheet[];
  subjectOptions: SubjectOption[];
  topicOptions: TopicOption[];
  bankQuestions: WorkspaceBankQuestion[];
  assignmentClasses: AssignmentClassOption[];
}) {
  const [data, setData] = useState(worksheets);
  const [searchQuery, setSearchQuery] = useState("");

  // Builder state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newTopic, setNewTopic] = useState("none");
  const [newEstimatedTime, setNewEstimatedTime] = useState(30);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived filtered options for Builder
  const filteredTopicOptions = useMemo(() => {
    if (!newSubject) return [];
    return topicOptions.filter((t) => t.subjectId === newSubject);
  }, [newSubject, topicOptions]);

  // Derived available questions for Builder
  const availableQuestions = useMemo(() => {
    if (!newSubject) return [];
    return bankQuestions.filter(q => {
      if (q.subjectId !== newSubject) return false;
      if (newTopic !== "none" && q.topicId !== newTopic) return false;
      return true;
    });
  }, [newSubject, newTopic, bankQuestions]);

  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestions(prev => 
      prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!newTitle) return toast.error("Title is required");
    if (!newSubject) return toast.error("Subject is required");
    if (selectedQuestions.length === 0) return toast.error("Select at least 1 question");

    setIsSubmitting(true);
    try {
      await createWorksheet({
        title: newTitle,
        subjectId: newSubject,
        topicId: newTopic === "none" ? null : newTopic,
        estimatedTime: newEstimatedTime,
        questionIds: selectedQuestions,
      });
      toast.success("Worksheet created");
      setBuilderOpen(false);
      
      // We would normally re-fetch or rely on Next.js server actions revalidatePath
      // But we can trigger a hard refresh if needed to see it instantly
      window.location.reload();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create worksheet");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this worksheet? Assignments and student submissions may be affected.")) return;
    
    try {
      await deleteWorkspaceChallenge(id);
      toast.success("Worksheet deleted");
      setData(prev => prev.filter(w => w.id !== id));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  // Main UI filtering
  const filteredWorksheets = useMemo(() => {
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase();
    return data.filter(w => w.title.toLowerCase().includes(query) || w.subject.name.toLowerCase().includes(query));
  }, [data, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
        <Input 
          placeholder="Search worksheets..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64"
        />
        <Button onClick={() => {
          setBuilderOpen(true);
          setNewTitle("");
          setNewSubject("");
          setNewTopic("none");
          setSelectedQuestions([]);
        }} className="w-full sm:w-auto gap-2">
          <Plus className="h-4 w-4" /> Create Worksheet
        </Button>
      </div>

      {/* Grid of Worksheets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWorksheets.length === 0 ? (
          <div className="col-span-full py-12 text-center border rounded-xl bg-card">
            <div className="mx-auto size-12 bg-muted rounded-full flex items-center justify-center mb-3">
              <FileText className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No Worksheets Found</h3>
            <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
              Create your first worksheet by selecting questions from the Question Bank.
            </p>
            <Button className="mt-4" onClick={() => setBuilderOpen(true)}>Create Worksheet</Button>
          </div>
        ) : (
          filteredWorksheets.map(w => (
            <Card key={w.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                  <CardTitle className="text-xl line-clamp-2">{w.title}</CardTitle>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(w.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground mt-1">
                  <span>{w.subject.name}</span>
                  {w.topic && <span>{w.topic.topicName}</span>}
                </div>
              </CardHeader>
              <CardContent className="mt-auto pt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={cn("capitalize", difficultyColor[w.difficulty] || difficultyColor.medium)}>
                    {w.difficulty}
                  </Badge>
                  <Badge variant="secondary" className="gap-1"><Clock className="size-3" /> {w.estimatedTime}m</Badge>
                  <Badge variant="secondary" className="gap-1"><FileText className="size-3" /> {w._count.questions} Qs</Badge>
                  <Badge variant="secondary" className="gap-1 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"><Users className="size-3" /> {w.assignedRecipientCount} assigned</Badge>
                </div>
                
                <div className="flex gap-2">
                  <AssignContentDialog
                    challengeId={w.id}
                    challengeTitle={w.title}
                    subjectId={w.subjectId}
                    classes={assignmentClasses}
                  />
                  <Link href={`/admin/worksheets/${w.id}/print`} className="flex-1">
                    <Button variant="outline" className="w-full gap-2">
                      <ExternalLink className="size-4" /> Print / PDF
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Builder Dialog */}
      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
          <div className="p-6 border-b shrink-0">
            <DialogHeader>
              <DialogTitle>Create Worksheet</DialogTitle>
              <DialogDescription>Build a new worksheet from the Question Bank.</DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. End of Year Revision" />
              </div>
              <div className="space-y-2">
                <Label>Estimated Time (minutes)</Label>
                <Input type="number" value={newEstimatedTime} onChange={e => setNewEstimatedTime(parseInt(e.target.value) || 0)} min={5} />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={newSubject} onValueChange={(v) => { setNewSubject(v || ""); setNewTopic("none"); setSelectedQuestions([]); }}>
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
                <Select value={newTopic} onValueChange={(v) => { setNewTopic(v || ""); setSelectedQuestions([]); }} disabled={!newSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select topic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All Topics in Subject</SelectItem>
                    {filteredTopicOptions.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newSubject && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">Select Questions</h3>
                    <p className="text-sm text-muted-foreground">{selectedQuestions.length} selected</p>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Question Preview</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead className="w-[100px]">Difficulty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableQuestions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No questions found for this subject/topic in the Question Bank.
                          </TableCell>
                        </TableRow>
                      ) : (
                        availableQuestions.map(q => {
                          const isSelected = selectedQuestions.includes(q.id);
                          return (
                            <TableRow 
                              key={q.id} 
                              className={cn("cursor-pointer", isSelected && "bg-primary/5 hover:bg-primary/10")}
                              onClick={() => toggleQuestionSelection(q.id)}
                            >
                              <TableCell>
                                <div className={cn(
                                  "size-5 rounded border flex items-center justify-center",
                                  isSelected ? "bg-primary border-primary text-primary-foreground" : "border-input"
                                )}>
                                  {isSelected && <div className="size-2.5 bg-current rounded-sm" />}
                                </div>
                              </TableCell>
                              <TableCell>
                                <p className="font-medium line-clamp-2 text-sm">{q.questionText}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {q.topicTag && <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{q.topicTag}</Badge>}
                                  <span className="text-xs text-muted-foreground">{q.marks} Mark{q.marks !== 1 && 's'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={q.workspaceId ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
                                  {q.workspaceId ? "Workspace" : "Vexa"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn("capitalize text-[10px] px-1.5 py-0", difficultyColor[q.difficulty] || difficultyColor.medium)}>
                                  {q.difficulty}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t bg-muted/20 shrink-0">
            <DialogFooter>
              <Button variant="outline" onClick={() => setBuilderOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={isSubmitting || selectedQuestions.length === 0}>
                {isSubmitting ? "Creating..." : `Create Worksheet (${selectedQuestions.length} Qs)`}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
