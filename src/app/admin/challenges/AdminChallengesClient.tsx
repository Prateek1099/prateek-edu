"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { cn } from "@/lib/utils";
import { parseQuestions, type ParseResult } from "@/lib/parseQuestions";
import {
  createChallenge,
  updateChallenge,
  deleteChallenge,
  toggleChallengePublished,
  appendQuestions,
} from "@/app/actions/admin";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Upload,
} from "lucide-react";

type SubjectOption = { id: string; label: string };
type TopicOption = { id: string; label: string; subjectId: string };

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "mixed", label: "Mixed" },
];

const difficultyBadge: Record<string, string> = {
  easy: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  medium: "border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10",
  hard: "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10",
  mixed: "border-primary/50 text-primary bg-primary/10",
};

const BULK_FORMAT_HINT = `QUESTION: What is a primary key?
A) Field used for calculations
B) Unique identifier for a record
C) Validation rule
D) Data type
ANSWER: B
EXPLANATION: A primary key uniquely identifies each record in a table.
TOPIC: Primary Keys
---`;

interface Props {
  challenges: any[];
  subjectOptions: SubjectOption[];
  topicOptions: TopicOption[];
}

export default function AdminChallengesClient({ challenges, subjectOptions, topicOptions }: Props) {
  const router = useRouter();

  // Dialog states
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAppend, setShowAppend] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [estimatedTime, setEstimatedTime] = useState(15);
  const [bulkText, setBulkText] = useState("");
  const [appendText, setAppendText] = useState("");

  // Filtered topics based on selected subject
  const filteredTopics = useMemo(
    () => topicOptions.filter((t) => t.subjectId === subjectId),
    [topicOptions, subjectId]
  );

  // Live parse preview
  const parsePreview: ParseResult = useMemo(() => parseQuestions(bulkText), [bulkText]);
  const appendPreview: ParseResult = useMemo(() => parseQuestions(appendText), [appendText]);

  const resetForm = () => {
    setTitle("");
    setSubjectId("");
    setTopicId("");
    setDifficulty("medium");
    setEstimatedTime(15);
    setBulkText("");
    setAppendText("");
  };

  const handleCreate = async () => {
    if (!title || !subjectId || parsePreview.questions.length === 0) return;
    setIsSubmitting(true);
    try {
      const result = await createChallenge({
        title,
        subjectId,
        topicId: topicId || null,
        difficulty,
        estimatedTime,
        questions: parsePreview.questions,
      });
      if (result.success) {
        toast.success(`Challenge created with ${parsePreview.questions.length} questions`);
        setShowCreate(false);
        resetForm();
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create challenge");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editing || !title || !subjectId) return;
    setIsSubmitting(true);
    try {
      const result = await updateChallenge(editing.id, {
        title,
        subjectId,
        topicId: topicId || null,
        difficulty,
        estimatedTime,
      });
      if (result.success) {
        toast.success("Challenge updated");
        setShowEdit(false);
        resetForm();
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    setIsSubmitting(true);
    try {
      const result = await deleteChallenge(editing.id);
      if (result.success) {
        toast.success("Challenge deleted");
        setShowDelete(false);
        setEditing(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePublish = async (id: string) => {
    try {
      const result = await toggleChallengePublished(id);
      if (result.success) {
        toast.success("Status updated");
        router.refresh();
      } else {
        toast.error(result.error || "Failed");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const handleAppend = async () => {
    if (!editing || appendPreview.questions.length === 0) return;
    setIsSubmitting(true);
    try {
      const result = await appendQuestions(editing.id, appendPreview.questions);
      if (result.success) {
        toast.success(`${appendPreview.questions.length} questions added`);
        setShowAppend(false);
        setAppendText("");
        router.refresh();
      } else {
        toast.error(result.error || "Failed");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setTitle(c.title);
    setSubjectId(c.subjectId);
    setTopicId(c.topicId || "");
    setDifficulty(c.difficulty);
    setEstimatedTime(c.estimatedTime);
    setShowEdit(true);
  };

  const openAppend = (c: any) => {
    setEditing(c);
    setAppendText("");
    setShowAppend(true);
  };

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {challenges.length} challenge{challenges.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={() => { resetForm(); setShowCreate(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Create Challenge
        </Button>
      </div>

      {/* Table */}
      {challenges.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
          <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold">No challenges yet</h3>
          <p className="text-muted-foreground mb-4">Create your first challenge with bulk import.</p>
          <Button onClick={() => { resetForm(); setShowCreate(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Create Challenge
          </Button>
        </div>
      ) : (
        <Card className="shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead className="text-center">Questions</TableHead>
                  <TableHead className="text-center">Attempts</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {challenges.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                      {c.subject.name} {c.subject.code ? `(${c.subject.code})` : ""}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.topic?.topicName || "—"}
                    </TableCell>
                    <TableCell className="text-center font-semibold">{c._count.questions}</TableCell>
                    <TableCell className="text-center">{c._count.attempts}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("capitalize", difficultyBadge[c.difficulty] || difficultyBadge.medium)}>
                        {c.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.isPublished ? "default" : "secondary"} className={c.isPublished ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                        {c.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openAppend(c)} title="Add questions">
                          <Upload className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleTogglePublish(c.id)} title={c.isPublished ? "Unpublish" : "Publish"}>
                          {c.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setEditing(c); setShowDelete(true); }} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* CREATE DIALOG */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Challenge</DialogTitle>
            <DialogDescription>Set up the challenge and paste your questions below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {/* Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input placeholder="e.g. Databases Challenge" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                                <Select value={subjectId} onValueChange={(v: string | null) => { setSubjectId(v || ""); setTopicId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjectOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Topic (optional)</Label>
                <Select value={topicId} onValueChange={(v: string | null) => setTopicId(v || "")}>
                  <SelectTrigger><SelectValue placeholder="All topics" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">All Topics</SelectItem>
                    {filteredTopics.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={difficulty} onValueChange={(v: string | null) => setDifficulty(v || "medium")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_OPTIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time (min)</Label>
                  <Input type="number" min={1} value={estimatedTime} onChange={(e) => setEstimatedTime(Number(e.target.value) || 15)} />
                </div>
              </div>
            </div>

            {/* Bulk Import */}
            <div className="space-y-3">
              <div>
                <Label>Paste Questions</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Use the format: QUESTION: ... A) ... B) ... C) ... D) ... ANSWER: ... EXPLANATION: ... TOPIC: ... separated by ---
                </p>
              </div>
              <Textarea
                className="font-mono text-sm min-h-[280px]"
                placeholder={BULK_FORMAT_HINT}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />

              {/* Parse Results */}
              {bulkText.trim() && (
                <div className="space-y-3">
                  {parsePreview.questions.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      {parsePreview.questions.length} question{parsePreview.questions.length !== 1 ? "s" : ""} parsed successfully
                    </div>
                  )}
                  {parsePreview.errors.length > 0 && (
                    <div className="space-y-1">
                      {parsePreview.errors.map((e, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>Line {e.line}: {e.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Preview first 3 */}
                  {parsePreview.questions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview</p>
                      {parsePreview.questions.slice(0, 3).map((q, i) => (
                        <Card key={i} className="bg-muted/30 border-border">
                          <CardContent className="p-3">
                            <p className="text-sm font-medium">Q{i + 1}: {q.questionText.slice(0, 100)}{q.questionText.length > 100 ? "..." : ""}</p>
                            <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                              <span>Answer: <span className="font-bold text-primary">{q.correctAnswer}</span></span>
                              {q.topicTag && <span>Topic: {q.topicTag}</span>}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {parsePreview.questions.length > 3 && (
                        <p className="text-xs text-muted-foreground">...and {parsePreview.questions.length - 3} more</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!title || !subjectId || parsePreview.questions.length === 0 || isSubmitting}
            >
              {isSubmitting ? "Creating..." : `Create Challenge (${parsePreview.questions.length} Q)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Challenge</DialogTitle>
            <DialogDescription>Update challenge details. Questions are not modified here.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                                <Select value={subjectId} onValueChange={(v: string | null) => { setSubjectId(v || ""); setTopicId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjectOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Topic (optional)</Label>
                <Select value={topicId} onValueChange={(v: string | null) => setTopicId(v || "")}>
                  <SelectTrigger><SelectValue placeholder="All topics" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">All Topics</SelectItem>
                    {filteredTopics.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={difficulty} onValueChange={(v: string | null) => setDifficulty(v || "medium")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_OPTIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time (min)</Label>
                  <Input type="number" min={1} value={estimatedTime} onChange={(e) => setEstimatedTime(Number(e.target.value) || 15)} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!title || !subjectId || isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* APPEND QUESTIONS DIALOG */}
      <Dialog open={showAppend} onOpenChange={setShowAppend}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Questions to: {editing?.title}</DialogTitle>
            <DialogDescription>
              Paste additional questions below. They will be appended to the existing {editing?._count?.questions || 0} questions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Textarea
              className="font-mono text-sm min-h-[280px]"
              placeholder={BULK_FORMAT_HINT}
              value={appendText}
              onChange={(e) => setAppendText(e.target.value)}
            />
            {appendText.trim() && (
              <div className="space-y-2">
                {appendPreview.questions.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    {appendPreview.questions.length} question{appendPreview.questions.length !== 1 ? "s" : ""} parsed
                  </div>
                )}
                {appendPreview.errors.length > 0 && (
                  <div className="space-y-1">
                    {appendPreview.errors.map((e, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>Line {e.line}: {e.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAppend(false)}>Cancel</Button>
            <Button onClick={handleAppend} disabled={appendPreview.questions.length === 0 || isSubmitting}>
              {isSubmitting ? "Adding..." : `Add ${appendPreview.questions.length} Questions`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Challenge</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{editing?.title}&quot;? This will permanently delete all {editing?._count?.questions || 0} questions and {editing?._count?.attempts || 0} student attempts.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? "Deleting..." : "Delete Challenge"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
