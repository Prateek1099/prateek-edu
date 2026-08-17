"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export function AiInsightCard({ contextData }: { contextData: string }) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInsight = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: contextData })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      setInsight(data.text);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate insight");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card shadow-sm border border-border/80 rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Sparkles className="size-4 text-primary" />
          </div>
          <span>AI Study Insight</span>
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">Personalised recommendations based on your revision history.</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {!insight && !loading && (
          <Button
            onClick={generateInsight}
            size="sm"
            className="rounded-xl shadow-sm gap-1.5 font-medium"
          >
            <Sparkles className="size-3.5" />
            <span>Generate Insight</span>
          </Button>
        )}

        {loading && (
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground py-2 font-medium">
            <Loader2 className="size-4 animate-spin text-primary" /> Analysing your revision strengths and weaknesses…
          </div>
        )}

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded-xl mt-2 font-medium">{error}</div>
        )}

        {insight && (
          <div className="mt-2 prose prose-sm dark:prose-invert max-w-none text-foreground/90 text-xs sm:text-sm leading-relaxed p-3.5 rounded-xl bg-muted/20 border border-border/50">
            <ReactMarkdown>{insight}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
