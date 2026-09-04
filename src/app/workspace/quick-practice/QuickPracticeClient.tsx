"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Zap, Trash2, Clock, Users, ExternalLink, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { createQuickPractice, deleteWorkspaceChallenge } from "@/app/actions/workspace-worksheets";
import AssignContentDialog, { type AssignmentClassOption } from "@/components/workspace/AssignContentDialog";

type SubjectOption = { id: string; label: string; board: string };
type TopicOption = { id: string; label: string; subjectId: string };
type WorkspaceQuickPractice = {
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

const difficultyColor: Record<string, string> = {
  easy: "border-emerald-500/50 text-emerald-600 bg-emerald-500/10",
  medium: "border-amber-500/50 text-amber-600 bg-amber-500/10",
  hard: "border-red-500/50 text-red-600 bg-red-500/10",
};

export default function QuickPracticeClient({
  practices,
  subjectOptions,
  topicOptions,
  bankQuestions,
  assignmentClasses,
}: {
  practices: WorkspaceQuickPractice[];
  subjectOptions: SubjectOption[];
  topicOptions: TopicOption[];
  bankQuestions: { id: string, subjectId: string, topicId: string | null, difficulty: string }[];
  assignmentClasses: AssignmentClassOption[];
}) {
  const [data, setData] = useState(practices);
  const [searchQuery, setSearchQuery] = useState("");

  // Builder state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newTopic, setNewTopic] = useState("none");
  const [questionCount, setQuestionCount] = useState(5);
  const [difficultyMix, setDifficultyMix] = useState("mixed");
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
      if (difficultyMix !== "mixed" && q.difficulty !== difficultyMix) return false;
      return true;
    });
  }, [newSubject, newTopic, difficultyMix, bankQuestions]);

  const handleCreate = async () => {
    if (!newTitle) return toast.error("Title is required");
    if (!newSubject) return toast.error("Subject is required");
    
    if (availableQuestions.length < questionCount) {
      return toast.error(`Not enough questions. Found ${availableQuestions.length}, requested ${questionCount}.`);
    }

    setIsSubmitting(true);
    try {
      // Shuffle and pick
      const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, questionCount).map(q => q.id);
      
      const result = await createQuickPractice({
        title: newTitle,
        subjectId: newSubject,
        topicId: newTopic === "none" ? null : newTopic,
        questionIds: selected,
        requestedQuestionCount: questionCount,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      
      toast.success("Practice set created!");
      setBuilderOpen(false);
      window.location.reload();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create quick practice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this practice set?")) return;
    
    try {
      await deleteWorkspaceChallenge(id);
      toast.success("Deleted successfully");
      setData(prev => prev.filter(w => w.id !== id));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  // Main UI filtering
  const filteredPractices = useMemo(() => {
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase();
    return data.filter(w => w.title.toLowerCase().includes(query) || w.subject.name.toLowerCase().includes(query));
  }, [data, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
        <Input 
          placeholder="Search practice sets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64"
        />
        <Button onClick={() => {
          setBuilderOpen(true);
          setNewTitle("");
          setNewSubject("");
          setNewTopic("none");
          setQuestionCount(5);
        }} className="w-full sm:w-auto gap-2">
          <Zap className="h-4 w-4" /> Create practice set
        </Button>
      </div>

      {/* Grid of Practices */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPractices.length === 0 ? (
          <div className="col-span-full py-12 text-center border rounded-xl bg-card">
            <div className="mx-auto size-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mb-3">
              <Zap className="size-6" />
            </div>
            <h3 className="text-lg font-medium">No practice sets yet</h3>
            <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
              Create a short quiz for an exit ticket, warm-up, or recap.
            </p>
            <Button className="mt-4" onClick={() => setBuilderOpen(true)}>Create practice set</Button>
          </div>
        ) : (
          filteredPractices.map(w => (
            <Card key={w.id} className="flex flex-col border-amber-200 dark:border-amber-900/50">
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
                  <Badge variant="secondary" className="gap-1"><Zap className="size-3 text-amber-500" /> {w._count.questions} Qs</Badge>
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
                    <Button variant="outline" className="w-full gap-2 border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-900/50 dark:hover:bg-amber-900/20 dark:hover:text-amber-400">
                      <ExternalLink className="size-4" /> Print / PDF
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Generator Dialog */}
      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="size-5 text-amber-500" /> Create practice set
            </DialogTitle>
            <DialogDescription>
              Let Vexa assemble a quick practice automatically. Students will not see it until you assign it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Exit Ticket - Algebra" />
            </div>
            
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={newSubject} onValueChange={(v) => { setNewSubject(v || ""); setNewTopic("none"); }}>
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
              <Select value={newTopic} onValueChange={(v) => setNewTopic(v || "")} disabled={!newSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Topics in Subject</SelectItem>
                  {filteredTopicOptions.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Number of Questions</Label>
                <Select value={questionCount.toString()} onValueChange={(v) => setQuestionCount(parseInt(v || "10"))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Questions</SelectItem>
                    <SelectItem value="5">5 Questions</SelectItem>
                    <SelectItem value="10">10 Questions</SelectItem>
                    <SelectItem value="15">15 Questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficultyMix} onValueChange={(v) => setDifficultyMix(v || "mixed")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Mixed</SelectItem>
                    <SelectItem value="easy">Easy Only</SelectItem>
                    <SelectItem value="medium">Medium Only</SelectItem>
                    <SelectItem value="hard">Hard Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newSubject && (
              <div className="p-3 bg-muted rounded-lg flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Available Questions:</span>
                <span className={cn("font-bold", availableQuestions.length < questionCount ? "text-destructive" : "text-emerald-600")}>
                  {availableQuestions.length}
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBuilderOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !newSubject || availableQuestions.length < questionCount} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
              {isSubmitting ? "Generating..." : <><Shuffle className="size-4" /> Generate Practice</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
