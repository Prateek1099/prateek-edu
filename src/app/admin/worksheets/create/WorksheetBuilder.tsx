"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

type WorksheetTopic = {
  id: string;
  topicName: string;
};

type WorksheetSubject = {
  id: string;
  name: string;
  topics: WorksheetTopic[];
};

export function WorksheetBuilder({
  subjects,
  source,
}: {
  subjects: WorksheetSubject[];
  source: "bank" | "ai";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [topicId, setTopicId] = useState("all");
  const [difficulty, setDifficulty] = useState("mixed");
  const [questionCount, setQuestionCount] = useState("10");
  const selectedSubject = subjects.find(s => s.id === subjectId);
  const topics: { id: string; topicName: string }[] = selectedSubject?.topics || [];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const selectedTopicName = topics.find(t => t.id === topicId)?.topicName;
      const res = await fetch("/api/worksheets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || undefined,
          subjectId,
          topicId: topicId === "all" ? undefined : topicId,
          customTopic: selectedTopicName || undefined,
          difficulty,
          questionCount: parseInt(questionCount),
          source,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate worksheet");
      
      router.push(`/admin/worksheets/${data.worksheetId}/print`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate worksheet");
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {source === "bank" ? "Generate from Question Bank" : "Generate with AI"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {source === "bank"
            ? "Build a worksheet from existing reviewed questions."
            : "Generate a worksheet with Gemini. Review the generated material before publishing."}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="space-y-2">
            <Label>Worksheet Title (Optional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Validation Intervention" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={(v) => setSubjectId(v || "")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Topic</Label>
              <Select value={topicId} onValueChange={(v) => setTopicId(v || "all")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Mixed Topics (Revision)</SelectItem>
                  {topics.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.topicName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v || "mixed")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Number of Questions</Label>
              <Select value={questionCount} onValueChange={(v) => setQuestionCount(v || "10")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 Questions</SelectItem>
                  <SelectItem value="10">10 Questions</SelectItem>
                  <SelectItem value="15">15 Questions</SelectItem>
                  <SelectItem value="20">20 Questions</SelectItem>
                  <SelectItem value="30">30 Questions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {source === "ai" && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
              AI generation may take longer and can produce varied formatting. This phase does not add a new draft-first workflow.
            </div>
          )}

          {error && <div className="text-sm text-destructive">{error}</div>}

          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Worksheet...</> : "Generate Worksheet"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
