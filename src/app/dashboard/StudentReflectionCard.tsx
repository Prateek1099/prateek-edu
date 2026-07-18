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
    return <Card className="border-border bg-card shadow-sm"><CardContent className="flex flex-col items-center gap-2 p-8 text-center"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500"><MessageSquarePlus className="h-5 w-5" /></div><p className="font-medium">Doubt sent successfully!</p><p className="text-sm text-muted-foreground">Your teacher will review it and get back to you soon.</p><Button className="mt-3" variant="outline" size="sm" onClick={reset}>Ask another doubt</Button></CardContent></Card>;
  }

  return (
    <Card id="ask-teacher" className="scroll-mt-24 border-border bg-card shadow-sm">
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg">Ask Your Doubts</CardTitle><CardDescription>Questions are routed with the subject and topics you select.</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        {prefillContext && <div className="space-y-3 rounded-lg border bg-muted/30 p-4"><div className="flex items-center gap-2 text-sm font-semibold"><Info className="h-4 w-4 text-primary" /> Context included</div><div className="flex flex-wrap gap-2">{prefillContext.source === "Mistake Book" && <Badge variant="outline"><BookOpen className="mr-1 h-3 w-3" /> Mistake Book</Badge>}{prefillContext.source === "Challenge Results" && <Badge variant="outline"><Trophy className="mr-1 h-3 w-3" /> Challenge Results</Badge>}{prefillContext.topic && <Badge variant="secondary">Topic: {prefillContext.topic}</Badge>}{prefillContext.challengeName && <Badge variant="secondary">Challenge: {prefillContext.challengeName}</Badge>}</div></div>}
        <div className="space-y-2"><label className="text-sm font-semibold" htmlFor="ask-subject">1. Choose subject</label><Select value={selectedSubjectId} onValueChange={(value) => { setSelectedSubjectId(value || ""); setSelectedTopicIds([]); }} disabled={isLoading || subjects.length === 0}><SelectTrigger id="ask-subject"><SelectValue placeholder={isLoading ? "Loading subjects..." : "Select one of your subjects"} /></SelectTrigger><SelectContent>{subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.name}{subject.code ? ` (${subject.code})` : ""} · {subject.qualification}</SelectItem>)}</SelectContent></Select>{!isLoading && subjects.length === 0 && <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">No subjects are available yet. Join a class, enroll in a course, or choose your board and qualification in Settings.</p>}</div>
        {selectedSubject && <div className="space-y-3"><label className="text-sm font-semibold">2. Select related topics <span className="font-normal text-muted-foreground">(optional if you describe your doubt)</span></label>{selectedSubject.topics.length === 0 ? <p className="text-sm text-muted-foreground">No published topics are available for this subject yet.</p> : <div className="grid gap-2 sm:grid-cols-2">{selectedSubject.topics.map((topic) => <label key={topic.id} className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm font-medium transition-colors hover:bg-muted/30"><Checkbox checked={selectedTopicIds.includes(topic.id)} onCheckedChange={() => toggleTopic(topic.id)} />{topic.name}</label>)}</div>}</div>}
        <div className="space-y-3"><p className="text-sm font-semibold">3. What kind of help do you need?</p><div className="grid gap-2">{REASONS.map((reason) => <label key={reason} className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm font-medium transition-colors hover:bg-muted/30"><Checkbox checked={selectedReasons.includes(reason)} onCheckedChange={() => toggleReason(reason)} />{reason}</label>)}</div></div>
        <div className="space-y-2"><label className="text-sm font-semibold" htmlFor="ask-message">4. Describe your doubt</label><Textarea id="ask-message" className="h-24 resize-none" placeholder="Explain what you are struggling with..." value={message} onChange={(event) => setMessage(event.target.value)} /></div>
        <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting || isLoading || !selectedSubjectId}>{isSubmitting ? "Sending..." : "Send to Teacher"}</Button>
      </CardContent>
    </Card>
  );
}
