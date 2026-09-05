"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Zap, Trash2, ExternalLink, Shuffle, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { createQuickPractice, deleteWorkspaceChallenge } from "@/app/actions/workspace-worksheets";
import AssignContentDialog, { type AssignmentClassOption } from "@/components/workspace/AssignContentDialog";
import {
  filterPracticeSets,
  isPracticeSetAssigned,
  type PracticeSetSegment,
} from "@/lib/human-ui-density-rules";

type SubjectOption = { id: string; label: string; board: string };
type TopicOption = { id: string; label: string; subjectId: string };
type WorkspaceQuickPractice = {
  id: string;
  title: string;
  subjectId: string;
  topicId: string | null;
  difficulty: string;
  estimatedTime: number;
  assignedRecipientCount: number;
  assignmentContexts: Array<{
    classId: string;
    className: string;
    recipientCount: number;
  }>;
  subject: { name: string };
  topic: { topicName: string } | null;
  _count: { questions: number };
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
  const [segment, setSegment] = useState<PracticeSetSegment>("all");
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  // Builder state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newTopic, setNewTopic] = useState("none");
  const [questionCount, setQuestionCount] = useState(5);
  const [difficultyMix, setDifficultyMix] = useState("mixed");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived filtered options for Builder
  const builderTopicOptions = useMemo(() => {
    if (!newSubject) return [];
    return topicOptions.filter((t) => t.subjectId === newSubject);
  }, [newSubject, topicOptions]);

  const filterTopicOptions = useMemo(
    () => subjectFilter === "all"
      ? topicOptions
      : topicOptions.filter((topic) => topic.subjectId === subjectFilter),
    [subjectFilter, topicOptions],
  );

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
  const filteredPractices = useMemo(
    () => filterPracticeSets(data, {
      segment,
      searchQuery,
      classId: classFilter,
      subjectId: subjectFilter,
      topicId: topicFilter,
      difficulty: difficultyFilter,
    }),
    [classFilter, data, difficultyFilter, searchQuery, segment, subjectFilter, topicFilter],
  );

  const segmentCounts = useMemo(() => {
    const assigned = data.filter(isPracticeSetAssigned).length;
    return { all: data.length, assigned, unassigned: data.length - assigned };
  }, [data]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    classFilter !== "all" ||
    subjectFilter !== "all" ||
    topicFilter !== "all" ||
    difficultyFilter !== "all",
  );

  const clearFilters = () => {
    setSearchQuery("");
    setSegment("all");
    setClassFilter("all");
    setSubjectFilter("all");
    setTopicFilter("all");
    setDifficultyFilter("all");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search practice sets"
            placeholder="Search title, subject, topic, or class"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9"
          />
        </div>
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

      <div className="space-y-4" aria-label="Practice set filters">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1" role="group" aria-label="Assignment state">
          {([
            ["all", "All", segmentCounts.all],
            ["unassigned", "Unassigned", segmentCounts.unassigned],
            ["assigned", "Assigned", segmentCounts.assigned],
          ] as const).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              aria-pressed={segment === value}
              onClick={() => setSegment(value)}
              className={cn(
                "min-h-10 flex-1 whitespace-nowrap rounded-md px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                segment === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label} <span className="ml-1 text-xs font-normal">{count}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="practice-class-filter" className="text-xs text-muted-foreground">Class</Label>
            <Select value={classFilter} onValueChange={(value) => setClassFilter(value || "all")}>
              <SelectTrigger id="practice-class-filter" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {assignmentClasses.map((classOption) => (
                  <SelectItem key={classOption.id} value={classOption.id}>{classOption.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="practice-subject-filter" className="text-xs text-muted-foreground">Subject</Label>
            <Select value={subjectFilter} onValueChange={(value) => {
              setSubjectFilter(value || "all");
              setTopicFilter("all");
            }}>
              <SelectTrigger id="practice-subject-filter" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {subjectOptions.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>{subject.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="practice-topic-filter" className="text-xs text-muted-foreground">Topic</Label>
            <Select value={topicFilter} onValueChange={(value) => setTopicFilter(value || "all")}>
              <SelectTrigger id="practice-topic-filter" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All topics</SelectItem>
                {filterTopicOptions.map((topic) => (
                  <SelectItem key={topic.id} value={topic.id}>{topic.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="practice-difficulty-filter" className="text-xs text-muted-foreground">Difficulty</Label>
            <Select value={difficultyFilter} onValueChange={(value) => setDifficultyFilter(value || "all")}>
              <SelectTrigger id="practice-difficulty-filter" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filteredPractices.length}</span> of {data.length} practice sets
        </p>
        {hasActiveFilters || segment !== "all" ? (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
            <SlidersHorizontal className="size-4" /> Clear filters
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {filteredPractices.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
              <Zap className="size-6" />
            </div>
            <h3 className="text-lg font-medium">
              {data.length === 0
                ? "No practice sets yet"
                : hasActiveFilters
                  ? "No practice sets match these filters"
                  : segment === "unassigned"
                    ? "No unassigned practice sets"
                    : "No assigned practice sets yet"}
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {data.length === 0
                ? "Create a short quiz for an exit ticket, warm-up, or recap."
                : hasActiveFilters
                  ? "Clear the filters to return to the full worklist."
                  : segment === "unassigned"
                    ? "Everything here has already been used with a class."
                    : "Assign a practice set to a class and it will appear here."}
            </p>
            {data.length === 0 ? (
              <Button className="mt-4" onClick={() => setBuilderOpen(true)}>Create practice set</Button>
            ) : (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear filters</Button>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {filteredPractices.map((practice) => {
              const assigned = isPracticeSetAssigned(practice);
              const batchRecipientCount = practice.assignmentContexts.reduce(
                (total, context) => total + context.recipientCount,
                0,
              );
              const legacyRecipientCount = Math.max(0, practice.assignedRecipientCount - batchRecipientCount);

              return (
                <article key={practice.id} className="grid min-w-0 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.7fr)_auto] lg:items-center lg:px-5">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold leading-snug">{practice.title}</h3>
                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      {practice.subject.name}{practice.topic ? ` · ${practice.topic.topicName}` : " · All topics"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="capitalize">{practice.difficulty}</span>
                      <span aria-hidden="true"> · </span>
                      {practice._count.questions} question{practice._count.questions === 1 ? "" : "s"}
                      <span aria-hidden="true"> · </span>
                      {practice.estimatedTime} min
                    </p>
                  </div>

                  <div className="min-w-0">
                    {assigned ? (
                      practice.assignmentContexts.length > 1 ? (
                        <details className="group text-sm">
                          <summary className="min-h-10 cursor-pointer list-none rounded-md py-2 font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            Assigned to {practice.assignmentContexts.length} classes · {practice.assignedRecipientCount} recipients
                          </summary>
                          <ul className="space-y-1 pb-1 text-xs text-muted-foreground">
                            {practice.assignmentContexts.map((context) => (
                              <li key={context.classId}>{context.className} · {context.recipientCount} student{context.recipientCount === 1 ? "" : "s"}</li>
                            ))}
                            {legacyRecipientCount > 0 ? <li>{legacyRecipientCount} legacy recipient{legacyRecipientCount === 1 ? "" : "s"}</li> : null}
                          </ul>
                        </details>
                      ) : (
                        <div className="space-y-1">
                          <Badge className="bg-emerald-600 hover:bg-emerald-600">Assigned</Badge>
                          <p className="break-words text-sm text-muted-foreground">
                            {practice.assignmentContexts[0]
                              ? `${practice.assignmentContexts[0].className} · ${practice.assignmentContexts[0].recipientCount} student${practice.assignmentContexts[0].recipientCount === 1 ? "" : "s"}${legacyRecipientCount > 0 ? ` · ${legacyRecipientCount} legacy` : ""}`
                              : `${practice.assignedRecipientCount} legacy recipient${practice.assignedRecipientCount === 1 ? "" : "s"}`}
                          </p>
                        </div>
                      )
                    ) : (
                      <div className="space-y-1">
                        <Badge variant="outline">Unassigned</Badge>
                        <p className="text-sm text-muted-foreground">Private until assigned to a class or student.</p>
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
                    <AssignContentDialog
                      challengeId={practice.id}
                      challengeTitle={practice.title}
                      subjectId={practice.subjectId}
                      classes={assignmentClasses}
                    />
                    <Link href={`/workspace/print/${practice.id}`}>
                      <Button variant="outline" className="gap-2">
                        <ExternalLink className="size-4" /> Print / PDF
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${practice.title}`}
                      title="Delete practice set"
                      onClick={() => handleDelete(practice.id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
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
                  {builderTopicOptions.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
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
