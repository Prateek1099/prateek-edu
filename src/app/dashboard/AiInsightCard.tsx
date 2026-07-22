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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card shadow-sm border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          AI Study Insight
        </CardTitle>
        <CardDescription>Personalised recommendations based on your activity.</CardDescription>
      </CardHeader>
      <CardContent>
        {!insight && !loading && (
          <Button onClick={generateInsight} size="sm" className="mt-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 shadow-none">
            Generate Insight
          </Button>
        )}
        
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
            <Loader2 className="w-4 h-4 animate-spin" /> Analysing your progress…
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive mt-3">{error}</div>
        )}

        {insight && (
          <div className="mt-3 prose prose-sm dark:prose-invert max-w-none text-foreground/90">
            <ReactMarkdown>{insight}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
