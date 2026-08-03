"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CircleAlert,
  LibraryBig,
  Loader2,
  Search,
  Shuffle,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { createChallengeFromBank } from "@/app/actions/admin";
import { useAdminBoard } from "@/components/AdminBoardContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type SubjectOption = {
  id: string;
  name: string;
  code: string | null;
  label: string;
  qualificationId: string;
  qualificationName: string;
  qualificationTitle: string;
  boardId: string;
  boardName: string;
  boardTitle: string;
};

type TopicOption = {
  id: string;
  label: string;
  subjectId: string;
};

type BankQuestionOption = {
  id: string;
  subjectId: string;
  topicId: string | null;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string | null;
  topicTag: string | null;
  difficulty: string;
  marks: number;
  topic: { topicName: string } | null;
};

type Props = {
  subjectOptions: SubjectOption[];
  topicOptions: TopicOption[];
  bankQuestions: BankQuestionOption[];
};

const CHALLENGE_DIFFICULTIES = ["easy", "medium", "hard", "mixed"] as const;
const QUESTION_DIFFICULTIES = ["all", "easy", "medium", "hard"] as const;

export default function CreateChallengeFromBankClient({
  subjectOptions,
  topicOptions,
  bankQuestions,
}: Props) {
  const router = useRouter();
  const { selectedBoard } = useAdminBoard();

  const boards = useMemo(() => {
    const unique = new Map<string, { id: string; name: string; title: string }>();
    for (const subject of subjectOptions) {
      unique.set(subject.boardId, {
        id: subject.boardId,
        name: subject.boardName,
        title: subject.boardTitle,
      });
    }
    return [...unique.values()];
  }, [subjectOptions]);

  const initialBoardId =
    boards.find((board) => selectedBoard !== "all" && board.name === selectedBoard)?.id ?? "";

  const [title, setTitle] = useState("");
  const [estimatedTime, setEstimatedTime] = useState(15);
  const [challengeDifficulty, setChallengeDifficulty] = useState("medium");
  const [publishStatus, setPublishStatus] = useState<"draft" | "published">("draft");
  const [boardId, setBoardId] = useState(initialBoardId);
  const [qualificationId, setQualificationId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("all");
  const [questionDifficulty, setQuestionDifficulty] = useState("all");
  const [search, setSearch] = useState("");
  const [selectionMode, setSelectionMode] = useState<"manual" | "random">("manual");
  const [randomCount, setRandomCount] = useState(10);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const qualifications = useMemo(() => {
    const unique = new Map<string, { id: string; name: string; title: string }>();
    for (const subject of subjectOptions) {
      if (subject.boardId !== boardId) continue;
      unique.set(subject.qualificationId, {
        id: subject.qualificationId,
        name: subject.qualificationName,
        title: subject.qualificationTitle,
      });
    }
    return [...unique.values()];
  }, [boardId, subjectOptions]);

  const subjects = useMemo(
    () => subjectOptions.filter((subject) => subject.qualificationId === qualificationId),
    [qualificationId, subjectOptions],
  );

  const topics = useMemo(
    () => topicOptions.filter((topic) => topic.subjectId === subjectId),
    [subjectId, topicOptions],
  );

  const filteredQuestions = useMemo(() => {
    if (!subjectId) return [];
    const query = search.trim().toLowerCase();
    return bankQuestions.filter((question) => {
      if (question.subjectId !== subjectId) return false;
      if (topicId !== "all" && question.topicId !== topicId) return false;
      if (questionDifficulty !== "all" && question.difficulty !== questionDifficulty) return false;
      if (
        query &&
        !`${question.questionText} ${question.topicTag ?? ""} ${question.optionA} ${question.optionB} ${question.optionC} ${question.optionD}`
          .toLowerCase()
          .includes(query)
      ) return false;
      return true;
    });
  }, [bankQuestions, questionDifficulty, search, subjectId, topicId]);

  const selectedQuestions = useMemo(() => {
    const byId = new Map(bankQuestions.map((question) => [question.id, question]));
    return selectedQuestionIds
      .map((id) => byId.get(id))
      .filter((question): question is BankQuestionOption => Boolean(question));
  }, [bankQuestions, selectedQuestionIds]);

  const clearSelection = () => {
    setSelectedQuestionIds([]);
    setSelectionError(null);
  };

  const toggleQuestion = (questionId: string) => {
    setSelectionError(null);
    setSelectedQuestionIds((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId],
    );
  };

  const selectAllMatching = () => {
    const matchingIds = filteredQuestions.slice(0, 100).map((question) => question.id);
    setSelectedQuestionIds(matchingIds);
    setSelectionError(
      filteredQuestions.length > 100
        ? "Only the first 100 matching questions were selected. A challenge supports at most 100 questions."
        : null,
    );
  };

  const selectRandomQuestions = () => {
    if (randomCount < 1 || randomCount > 100) {
      setSelectionError("Choose between 1 and 100 questions.");
      return;
    }
    if (filteredQuestions.length < randomCount) {
      setSelectedQuestionIds([]);
      setSelectionError(
        `Only ${filteredQuestions.length} question${filteredQuestions.length === 1 ? " is" : "s are"} available for these filters. Reduce the requested number or broaden the filters.`,
      );
      return;
    }

    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
    setSelectedQuestionIds(shuffled.slice(0, randomCount).map((question) => question.id));
    setSelectionError(null);
  };

  const handleCreate = async () => {
    if (!title.trim() || !subjectId || selectedQuestionIds.length === 0) return;
    setIsSubmitting(true);
    try {
      const result = await createChallengeFromBank({
        title,
        subjectId,
        topicId: topicId === "all" ? null : topicId,
        difficulty: challengeDifficulty,
        questionDifficulty,
        estimatedTime,
        isPublished: publishStatus === "published",
        questionIds: selectedQuestionIds,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `${publishStatus === "published" ? "Published" : "Draft"} challenge created with ${selectedQuestionIds.length} questions.`,
      );
      router.push("/admin/challenges");
      router.refresh();
    } catch {
      toast.error("Could not create the challenge. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCreate =
    title.trim().length > 0 &&
    Boolean(subjectId) &&
    selectedQuestionIds.length > 0 &&
    estimatedTime >= 1 &&
    estimatedTime <= 300;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <StepNumber value="1" />
              <div>
                <CardTitle>Challenge details</CardTitle>
                <CardDescription>Set the student-facing title, duration, difficulty, and visibility.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="challenge-title">Title</Label>
              <Input
                id="challenge-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Chapter 1 SQL Practice Challenge"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="challenge-duration">Duration (minutes)</Label>
              <Input
                id="challenge-duration"
                type="number"
                min={1}
                max={300}
                value={estimatedTime}
                onChange={(event) => setEstimatedTime(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Challenge difficulty</Label>
              <Select value={challengeDifficulty} onValueChange={(value) => setChallengeDifficulty(value || "medium")}>
                <SelectTrigger aria-label="Challenge difficulty">
                  <SelectValue className="capitalize">{challengeDifficulty}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CHALLENGE_DIFFICULTIES.map((difficulty) => (
                    <SelectItem key={difficulty} value={difficulty} className="capitalize">
                      {difficulty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Visibility after creation</Label>
              <Select
                value={publishStatus}
                onValueChange={(value) => setPublishStatus((value || "draft") as "draft" | "published")}
              >
                <SelectTrigger aria-label="Challenge visibility">
                  <SelectValue>
                    {publishStatus === "published" ? "Published — visible to students" : "Draft — review first"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft — review before students can see it</SelectItem>
                  <SelectItem value="published">Published — visible to students immediately</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <StepNumber value="2" />
              <div>
                <CardTitle>Filter Question Bank</CardTitle>
                <CardDescription>Choose the academic scope before selecting questions.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <FilterSelect
                label="Board"
                value={boardId}
                placeholder="Select board"
                options={boards.map((board) => ({ value: board.id, label: board.title }))}
                onChange={(value) => {
                  setBoardId(value);
                  setQualificationId("");
                  setSubjectId("");
                  setTopicId("all");
                  clearSelection();
                }}
              />
              <FilterSelect
                label="Qualification"
                value={qualificationId}
                placeholder="Select qualification"
                disabled={!boardId}
                options={qualifications.map((qualification) => ({
                  value: qualification.id,
                  label: qualification.title,
                }))}
                onChange={(value) => {
                  setQualificationId(value);
                  setSubjectId("");
                  setTopicId("all");
                  clearSelection();
                }}
              />
              <FilterSelect
                label="Subject"
                value={subjectId}
                placeholder="Select subject"
                disabled={!qualificationId}
                options={subjects.map((subject) => ({ value: subject.id, label: subject.label }))}
                onChange={(value) => {
                  setSubjectId(value);
                  setTopicId("all");
                  clearSelection();
                }}
              />
              <FilterSelect
                label="Topic / chapter"
                value={topicId}
                disabled={!subjectId}
                options={[
                  { value: "all", label: "All topics" },
                  ...topics.map((topic) => ({ value: topic.id, label: topic.label })),
                ]}
                onChange={(value) => {
                  setTopicId(value);
                  clearSelection();
                }}
              />
              <FilterSelect
                label="Question difficulty"
                value={questionDifficulty}
                options={QUESTION_DIFFICULTIES.map((difficulty) => ({
                  value: difficulty,
                  label: difficulty === "all" ? "All difficulties" : difficulty,
                }))}
                onChange={(value) => {
                  setQuestionDifficulty(value);
                  clearSelection();
                }}
              />
              <div className="space-y-2">
                <Label htmlFor="question-search">Search questions</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="question-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Question text or topic…"
                    className="pl-9"
                    disabled={!subjectId}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Selection mode</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={selectionMode === "manual" ? "default" : "outline"}
                  className="h-auto justify-start px-4 py-3 text-left whitespace-normal"
                  onClick={() => {
                    setSelectionMode("manual");
                    clearSelection();
                  }}
                >
                  <LibraryBig className="h-5 w-5" />
                  <span>
                    <span className="block font-semibold">Manual selection</span>
                    <span className="block text-xs opacity-80">Review and tick individual questions.</span>
                  </span>
                </Button>
                <Button
                  type="button"
                  variant={selectionMode === "random" ? "default" : "outline"}
                  className="h-auto justify-start px-4 py-3 text-left whitespace-normal"
                  onClick={() => {
                    setSelectionMode("random");
                    clearSelection();
                  }}
                >
                  <Shuffle className="h-5 w-5" />
                  <span>
                    <span className="block font-semibold">Random selection</span>
                    <span className="block text-xs opacity-80">Choose a count, then review the random set.</span>
                  </span>
                </Button>
              </div>
              {selectionMode === "random" && (
                <div className="flex flex-col gap-3 rounded-xl bg-muted/40 p-4 sm:flex-row sm:items-end">
                  <div className="w-full space-y-2 sm:max-w-48">
                    <Label htmlFor="random-count">Number of questions</Label>
                    <Input
                      id="random-count"
                      type="number"
                      min={1}
                      max={100}
                      value={randomCount}
                      onChange={(event) => setRandomCount(Number(event.target.value))}
                    />
                  </div>
                  <Button type="button" onClick={selectRandomQuestions} disabled={!subjectId}>
                    <Shuffle className="h-4 w-4" />
                    Select random questions
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <StepNumber value="3" />
                <div>
                  <CardTitle>Select questions</CardTitle>
                  <CardDescription>
                    {subjectId
                      ? `${filteredQuestions.length} matching question${filteredQuestions.length === 1 ? "" : "s"}`
                      : "Choose a subject to load Question Bank questions."}
                  </CardDescription>
                </div>
              </div>
              {selectionMode === "manual" && filteredQuestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectAllMatching}>
                    Select all matching
                  </Button>
                  {selectedQuestionIds.length > 0 && (
                    <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                      Clear selection
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectionError && (
              <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{selectionError}</span>
              </div>
            )}

            {!subjectId ? (
              <EmptySelectionState message="Select a board, qualification, and subject to begin." />
            ) : filteredQuestions.length === 0 ? (
              <EmptySelectionState message="No Question Bank questions match these filters." />
            ) : selectionMode === "random" && selectedQuestions.length === 0 ? (
              <EmptySelectionState message="Choose a random question count above to preview a set." />
            ) : (
              <div className="space-y-3">
                {(selectionMode === "random" ? selectedQuestions : filteredQuestions).map((question) => {
                  const isSelected = selectedQuestionIds.includes(question.id);
                  return (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      selected={isSelected}
                      disabled={selectionMode === "random"}
                      onToggle={() => toggleQuestion(question.id)}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="lg:sticky lg:top-24">
        <CardHeader>
          <div className="flex items-center gap-3">
            <StepNumber value="4" />
            <div>
              <CardTitle>Review & create</CardTitle>
              <CardDescription>Confirm the fixed challenge snapshot.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <SummaryStat label="Selected" value={String(selectedQuestions.length)} />
            <SummaryStat label="Duration" value={`${estimatedTime || 0} min`} />
          </div>

          <div className="space-y-2 text-sm">
            <ReviewLine label="Title" value={title.trim() || "Not set"} />
            <ReviewLine
              label="Subject"
              value={subjectOptions.find((subject) => subject.id === subjectId)?.label || "Not set"}
            />
            <ReviewLine
              label="Topic"
              value={topicId === "all" ? "All topics" : topics.find((topic) => topic.id === topicId)?.label || "Not set"}
            />
            <ReviewLine label="Difficulty" value={challengeDifficulty} capitalize />
            <ReviewLine label="Visibility" value={publishStatus} capitalize />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm font-medium">
              <span>Selected questions</span>
              <Badge variant="secondary">{selectedQuestions.length}</Badge>
            </div>
            {selectedQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No questions selected yet.</p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {selectedQuestions.map((question, index) => (
                  <div key={question.id} className="flex items-start gap-2 rounded-lg bg-muted/40 p-2 text-xs">
                    <span className="font-semibold text-primary">{index + 1}.</span>
                    <span className="line-clamp-2 flex-1">{question.questionText}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Remove question ${index + 1}`}
                      onClick={() => toggleQuestion(question.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs leading-5 text-emerald-900 dark:text-emerald-200">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Stable snapshot
            </div>
            Selected content is copied into Challenge questions. Later Question Bank edits will not change this challenge.
          </div>

          <Button className="w-full" size="lg" disabled={!canCreate || isSubmitting} onClick={handleCreate}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Creating challenge…
              </>
            ) : (
              `Create ${publishStatus === "published" ? "published" : "draft"} challenge`
            )}
          </Button>
          {!canCreate && (
            <p className="text-center text-xs text-muted-foreground">
              Add a title, choose a subject, and select at least one question.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StepNumber({ value }: { value: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
      {value}
    </span>
  );
}

function FilterSelect({
  label,
  value,
  placeholder,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue || "")} disabled={disabled}>
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder={placeholder}>
            {options.find((option) => option.value === value)?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="capitalize">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function QuestionCard({
  question,
  selected,
  disabled,
  onToggle,
}: {
  question: BankQuestionOption;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const options = [
    ["A", question.optionA],
    ["B", question.optionB],
    ["C", question.optionC],
    ["D", question.optionD],
  ];

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        selected ? "border-primary/50 bg-primary/5" : "bg-card",
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id={`bank-question-${question.id}`}
          checked={selected}
          disabled={disabled}
          onCheckedChange={onToggle}
          aria-label={`Select question: ${question.questionText}`}
          className="mt-1"
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Label htmlFor={`bank-question-${question.id}`} className="cursor-pointer text-sm leading-6">
              {question.questionText}
            </Label>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="capitalize">{question.difficulty}</Badge>
              <Badge variant="secondary">{question.marks} mark{question.marks === 1 ? "" : "s"}</Badge>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map(([letter, text]) => (
              <div
                key={letter}
                className={cn(
                  "rounded-lg bg-muted/40 px-3 py-2 text-xs leading-5",
                  question.correctAnswer.toUpperCase() === letter &&
                    "bg-emerald-500/10 text-emerald-800 ring-1 ring-emerald-500/20 dark:text-emerald-200",
                )}
              >
                <span className="mr-1 font-bold">{letter}.</span> {text}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Answer: <strong className="text-foreground">{question.correctAnswer.toUpperCase()}</strong></span>
            <span>Topic: {question.topic?.topicName || question.topicTag || "Unspecified"}</span>
          </div>
          {question.explanation && (
            <p className="rounded-lg border-l-2 border-primary/30 bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
              <span className="font-semibold text-foreground">Explanation:</span> {question.explanation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptySelectionState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
      <LibraryBig className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function ReviewLine({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("max-w-44 text-right font-medium", capitalize && "capitalize")}>{value}</span>
    </div>
  );
}
