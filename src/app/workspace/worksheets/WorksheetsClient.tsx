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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2, FileText, Clock, Users, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { createWorksheet, deleteWorkspaceChallenge } from "@/app/actions/workspace-worksheets";
import AssignContentDialog, { type AssignmentClassOption } from "@/components/workspace/AssignContentDialog";

type SubjectOption = { id: string; label: string };
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
  const [newSubject, setNewSubject] = useState(subjectOptions.length === 1 ? subjectOptions[0].id : "");
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

  const selectedSubjectLabel = subjectOptions.find((subject) => subject.id === newSubject)?.label;
  const selectedTopicLabel = !newSubject
    ? undefined
    : newTopic === "none"
      ? "All topics in subject"
      : filteredTopicOptions.find((topic) => topic.id === newTopic)?.label;

  const openBuilder = () => {
    setBuilderOpen(true);
    setNewTitle("");
    setNewSubject(subjectOptions.length === 1 ? subjectOptions[0].id : "");
    setNewTopic("none");
    setSelectedQuestions([]);
  };

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
      const result = await createWorksheet({
        title: newTitle,
        subjectId: newSubject,
        topicId: newTopic === "none" ? null : newTopic,
        estimatedTime: newEstimatedTime,
        questionIds: selectedQuestions,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
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
        <Button onClick={openBuilder} className="w-full sm:w-auto gap-2">
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
            <h3 className="text-lg font-medium">No worksheets yet</h3>
            <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
              Create your first worksheet by selecting questions from the Question Bank.
            </p>
            <Button className="mt-4" onClick={openBuilder}>Create Worksheet</Button>
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
                  <Link href={`/workspace/print/${w.id}`} className="flex-1">
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
        <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-5xl flex-col overflow-hidden p-0 sm:max-h-[90vh]">
          <div className="shrink-0 border-b p-4 pr-12 sm:p-6 sm:pr-14">
            <DialogHeader>
              <DialogTitle className="text-xl">Create Worksheet</DialogTitle>
              <DialogDescription>
                Build a new worksheet from the Question Bank. Students will not see it until you assign it.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="workspace-worksheet-title">Title</Label>
                <Input id="workspace-worksheet-title" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. End of Year Revision" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspace-worksheet-time">Estimated Time (minutes)</Label>
                <Input id="workspace-worksheet-time" type="number" value={newEstimatedTime} onChange={e => setNewEstimatedTime(parseInt(e.target.value) || 0)} min={5} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspace-worksheet-subject">Subject</Label>
                <Select value={newSubject} onValueChange={(v) => { setNewSubject(v || ""); setNewTopic("none"); setSelectedQuestions([]); }}>
                  <SelectTrigger id="workspace-worksheet-subject" className="h-11 w-full">
                    <SelectValue placeholder="Select subject">{selectedSubjectLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {subjectOptions.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspace-worksheet-topic">Topic (Optional)</Label>
                <Select value={newTopic} onValueChange={(v) => { setNewTopic(v || ""); setSelectedQuestions([]); }} disabled={!newSubject}>
                  <SelectTrigger id="workspace-worksheet-topic" className="h-11 w-full">
                    <SelectValue placeholder="Select topic">{selectedTopicLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All topics in subject</SelectItem>
                    {filteredTopicOptions.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newSubject && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">Select Questions</h3>
                    <p className="text-sm text-muted-foreground">
                      {availableQuestions.length} available for this selection
                    </p>
                  </div>
                  <Badge variant="secondary" className="rounded-lg px-3 py-1 text-sm">
                    {selectedQuestions.length} selected
                  </Badge>
                </div>

                {availableQuestions.length === 0 ? (
                  <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                    No questions found for this subject or topic in the Question Bank.
                  </div>
                ) : (
                  <div className="max-h-[48vh] overflow-y-auto overscroll-contain rounded-xl border">
                    <div className="space-y-2 p-2 md:hidden">
                      {availableQuestions.map((question) => {
                        const isSelected = selectedQuestions.includes(question.id);
                        return (
                          <label
                            key={question.id}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                              isSelected ? "border-primary/40 bg-primary/5" : "border-border/70 bg-card",
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleQuestionSelection(question.id)}
                              aria-label={`Select ${question.questionText}`}
                              className="mt-1"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block whitespace-normal break-words text-sm font-medium leading-6 [overflow-wrap:anywhere]">
                                {question.questionText}
                              </span>
                              <span className="mt-2 flex flex-wrap items-center gap-1.5">
                                {question.topicTag ? <Badge variant="secondary" className="max-w-full truncate text-[10px]">{question.topicTag}</Badge> : null}
                                <Badge variant="outline" className="text-[10px]">{question.marks} mark{question.marks === 1 ? "" : "s"}</Badge>
                                <Badge variant="outline" className={cn("capitalize text-[10px]", difficultyColor[question.difficulty] || difficultyColor.medium)}>{question.difficulty}</Badge>
                                <Badge variant="outline" className="text-[10px]">{question.workspaceId ? "Workspace" : "Vexa"}</Badge>
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="hidden md:block">
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-muted">
                          <TableRow>
                            <TableHead className="w-12"><span className="sr-only">Select</span></TableHead>
                            <TableHead>Question Preview</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead className="w-28">Difficulty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availableQuestions.map((question) => {
                            const isSelected = selectedQuestions.includes(question.id);
                            return (
                              <TableRow key={question.id} className={cn(isSelected && "bg-primary/5")}>
                                <TableCell>
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleQuestionSelection(question.id)}
                                    aria-label={`Select ${question.questionText}`}
                                  />
                                </TableCell>
                                <TableCell className="max-w-0">
                                  <p className="whitespace-normal break-words text-sm font-medium leading-6 [overflow-wrap:anywhere]">{question.questionText}</p>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    {question.topicTag ? <Badge variant="secondary" className="max-w-full truncate text-[10px]">{question.topicTag}</Badge> : null}
                                    <span className="text-xs text-muted-foreground">{question.marks} mark{question.marks === 1 ? "" : "s"}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={question.workspaceId ? "border-violet-200 bg-violet-50 text-violet-700" : "border-blue-200 bg-blue-50 text-blue-700"}>
                                    {question.workspaceId ? "Workspace" : "Vexa"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={cn("capitalize text-[10px]", difficultyColor[question.difficulty] || difficultyColor.medium)}>{question.difficulty}</Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t bg-background/95 p-4 backdrop-blur sm:p-6">
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setBuilderOpen(false)} className="h-11 w-full sm:w-auto">Cancel</Button>
              <Button onClick={handleCreate} disabled={isSubmitting || selectedQuestions.length === 0} className="h-11 w-full sm:w-auto">
                {isSubmitting ? "Creating..." : `Create Worksheet (${selectedQuestions.length} Qs)`}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
