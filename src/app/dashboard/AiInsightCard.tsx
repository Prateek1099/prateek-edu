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
    <Card className="bg-gradient-to-br from-primary/5 via-card to-card shadow-sm border-primary/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Sparkles className="w-24 h-24 text-primary" />
      </div>
      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="text-lg flex items-center gap-2 text-primary">
          <Sparkles className="w-5 h-5" /> AI Study Insight
        </CardTitle>
        <CardDescription>Get personalized, smart recommendations based on your recent activity.</CardDescription>
      </CardHeader>
      <CardContent className="relative z-10">
        {!insight && !loading && (
          <Button onClick={generateInsight} className="mt-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 shadow-none">
            Generate Insight
          </Button>
        )}
        
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Analyzing your progress...
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive mt-4">{error}</div>
        )}

        {insight && (
          <div className="mt-4 prose prose-sm dark:prose-invert max-w-none text-foreground/90">
            <ReactMarkdown>{insight}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
