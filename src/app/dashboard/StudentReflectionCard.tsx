"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Info, MessageSquarePlus, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type AskTeacherContext = {
  source: string;
  topic?: string;
  mistakes?: number;
  challengeName?: string;
  score?: number;
  reasons?: string[];
};

type SubjectOption = {
  id: string;
  name: string;
  code: string | null;
  qualification: string;
  board: string;
  topics: { id: string; name: string }[];
};

type Props = { prefillContext?: AskTeacherContext; onSuccess?: () => void };

const REASONS = [
  "I don't understand this topic",
  "I keep making mistakes in this topic",
  "I need more practice questions",
  "I am not confident about exam questions from this topic",
];

export function StudentReflectionCard({ prefillContext, onSuccess }: Props = {}) {
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadSubjects() {
      try {
        const response = await fetch("/api/ask-teacher/options", { signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load subjects");
        const data = (await response.json()) as { subjects: SubjectOption[] };
        setSubjects(data.subjects);
      } catch {
        if (!controller.signal.aborted) toast.error("We could not load your available subjects.");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void loadSubjects();
    return () => controller.abort();
  }, []);

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === selectedSubjectId),
    [selectedSubjectId, subjects],
  );

  const toggleTopic = (topicId: string) => {
    setSelectedTopicIds((current) => current.includes(topicId) ? current.filter((id) => id !== topicId) : [...current, topicId]);
  };

  const toggleReason = (reason: string) => {
    setSelectedReasons((current) => current.includes(reason) ? current.filter((item) => item !== reason) : [...current, reason]);
  };

  const reset = () => {
    setSelectedTopicIds([]);
    setSelectedReasons([]);
    setMessage("");
    setSubmitted(false);
  };

  const handleSubmit = async () => {
    if (!selectedSubjectId) return toast.error("Choose a subject first.");
    if (selectedTopicIds.length === 0 && !message.trim()) return toast.error("Select a topic or describe your doubt.");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/reflections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          topicIds: selectedTopicIds,
          message,
          context: { ...(prefillContext || {}), reasons: selectedReasons },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send doubt");
      setSubmitted(true);
      toast.success("Doubt sent to your teacher!");
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send doubt");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
        <CardContent className="flex flex-col items-center gap-3 p-8 sm:p-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <MessageSquarePlus className="size-6" />
          </div>
          <p className="text-lg font-bold text-foreground">Doubt sent successfully!</p>
          <p className="max-w-md text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Your teacher will review your question and respond to help resolve your doubts.
          </p>
          <Button className="mt-4 rounded-xl text-sm font-semibold shadow-sm" variant="outline" size="sm" onClick={reset}>
            Ask another doubt
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="ask-teacher" className="scroll-mt-24 rounded-2xl border border-border/80 bg-card shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-bold">Ask Your Doubts</CardTitle>
        <CardDescription className="text-xs sm:text-sm text-muted-foreground">
          Questions are routed with the subject and topics you select.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {prefillContext && (
          <div className="space-y-2.5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-primary">
              <Info className="size-4" /> Context included
            </div>
            <div className="flex flex-wrap gap-2">
              {prefillContext.source === "Mistake Book" && (
                <Badge variant="outline" className="border-primary/30 text-xs font-medium">
                  <BookOpen className="mr-1 size-3" /> Mistake Book
                </Badge>
              )}
              {prefillContext.source === "Challenge Results" && (
                <Badge variant="outline" className="border-primary/30 text-xs font-medium">
                  <Trophy className="mr-1 size-3" /> Challenge Results
                </Badge>
              )}
              {prefillContext.topic && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
                  Topic: {prefillContext.topic}
                </Badge>
              )}
              {prefillContext.challengeName && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
                  Challenge: {prefillContext.challengeName}
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="ask-subject">
            1. Choose subject
          </label>
          <Select
            value={selectedSubjectId}
            onValueChange={(value) => {
              setSelectedSubjectId(value || "");
              setSelectedTopicIds([]);
            }}
            disabled={isLoading || subjects.length === 0}
          >
            <SelectTrigger id="ask-subject" className="h-11 rounded-xl bg-background border-border/80 text-sm">
              <SelectValue placeholder={isLoading ? "Loading subjects..." : "Select one of your subjects"} />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/80">
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id} className="text-sm">
                  {subject.name}{subject.code ? ` (${subject.code})` : ""} · {subject.qualification}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isLoading && subjects.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border/80 p-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              No subjects are available yet. Join a class, enroll in a course, or choose your board and qualification in Settings.
            </p>
          )}
        </div>

        {selectedSubject && (
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              2. Select related topics <span className="font-normal lowercase text-muted-foreground">(optional)</span>
            </label>
            {selectedSubject.topics.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground">No published topics are available for this subject yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {selectedSubject.topics.map((topic) => (
                  <label
                    key={topic.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border/80 bg-background p-3 text-xs sm:text-sm font-medium transition-colors hover:bg-muted/30"
                  >
                    <Checkbox checked={selectedTopicIds.includes(topic.id)} onCheckedChange={() => toggleTopic(topic.id)} />
                    <span className="truncate">{topic.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            3. What kind of help do you need?
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {REASONS.map((reason) => (
              <label
                key={reason}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border/80 bg-background p-3 text-xs sm:text-sm font-medium transition-colors hover:bg-muted/30"
              >
                <Checkbox checked={selectedReasons.includes(reason)} onCheckedChange={() => toggleReason(reason)} />
                <span>{reason}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="ask-message">
            4. Describe your doubt
          </label>
          <Textarea
            id="ask-message"
            className="min-h-28 rounded-xl bg-background border-border/80 text-sm resize-none"
            placeholder="Explain what you are struggling with..."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>

        <Button
          className="h-11 w-full rounded-xl text-sm font-semibold shadow-md"
          onClick={handleSubmit}
          disabled={isSubmitting || isLoading || !selectedSubjectId}
        >
          {isSubmitting ? "Sending..." : "Send to Teacher"}
        </Button>
      </CardContent>
    </Card>
  );
}
