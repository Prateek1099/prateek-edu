"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface WorksheetSubject {
  id: string;
  name: string;
  topics?: { id: string; topicName: string }[];
}

export function PdfWorksheetUploader({ subjects }: { subjects: WorksheetSubject[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [topicId, setTopicId] = useState("none");
  const [difficulty, setDifficulty] = useState("mixed");

  const [questionsPdf, setQuestionsPdf] = useState<File | null>(null);
  const [answersPdf, setAnswersPdf] = useState<File | null>(null);

  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const topics: { id: string; topicName: string }[] = selectedSubject?.topics || [];

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const filename = `worksheets/${folder}/${Date.now()}-${file.name}`;
    const res = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
      method: "POST",
      body: file,
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Upload failed");
    }
    const data = await res.json();
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Enter a title");
    if (!questionsPdf) return toast.error("Upload the Questions PDF");
    setLoading(true);
    setError(null);
    try {
      // Upload PDFs
      const pdfUrl = await uploadFile(questionsPdf, "questions");
      let pdfAnswerUrl: string | null = null;
      if (answersPdf) {
        pdfAnswerUrl = await uploadFile(answersPdf, "answers");
      }

      // Create the worksheet record
      const res = await fetch("/api/worksheets/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subjectId,
          topicId: topicId === "none" ? null : topicId,
          difficulty,
          pdfUrl,
          pdfAnswerUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create worksheet");
      }

      toast.success("PDF Worksheet created!");
      router.push("/admin/worksheets");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create worksheet";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" /> Upload PDF Worksheet
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Worksheet Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Databases Practice Worksheet" />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <Label>Topic (Optional)</Label>
              <Select value={topicId} onValueChange={(v) => setTopicId(v || "none")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Topics</SelectItem>
                  {topics.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.topicName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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

          {/* PDF Upload Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Questions PDF */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Questions PDF <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">Upload the questions-only worksheet for students to practice.</p>
              <div className="relative">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setQuestionsPdf(e.target.files?.[0] || null)}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer border rounded-lg p-2"
                />
                {questionsPdf && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    {questionsPdf.name} ({(questionsPdf.size / 1024).toFixed(0)} KB)
                  </div>
                )}
              </div>
            </div>

            {/* Answers PDF */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                Answers / Mark Scheme PDF <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <p className="text-xs text-muted-foreground">Upload the answers / mark scheme. Students see this after completing the worksheet.</p>
              <div className="relative">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setAnswersPdf(e.target.files?.[0] || null)}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-500/10 file:text-amber-600 hover:file:bg-amber-500/20 cursor-pointer border rounded-lg p-2"
                />
                {answersPdf && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    {answersPdf.name} ({(answersPdf.size / 1024).toFixed(0)} KB)
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading & Creating...</> : "Create PDF Worksheet"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
