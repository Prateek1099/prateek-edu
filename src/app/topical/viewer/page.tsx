"use client";

import { Suspense, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

function TopicalViewerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAnswers, setShowAnswers] = useState(false);
  const questionUrl = searchParams.get("question");
  const answersUrl = searchParams.get("answers");

  const activeUrl = showAnswers && answersUrl ? answersUrl : questionUrl;
  const proxiedUrl = useMemo(
    () => activeUrl ? `/api/protected/pdf?url=${encodeURIComponent(activeUrl)}` : null,
    [activeUrl],
  );

  if (!questionUrl || !proxiedUrl) {
    return (
      <main className="flex min-h-[calc(100vh-140px)] items-center justify-center p-4">
        <div className="space-y-4 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-muted-foreground">No topical question resource was provided.</p>
          <Button variant="outline" onClick={() => router.back()}>Go back</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-[calc(100vh-64px)] flex-col overflow-hidden bg-muted/20">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-sm font-semibold sm:text-base">Topical Questions</h1>
            <p className="text-xs text-muted-foreground">
              {showAnswers ? "Review the answers when you are ready." : "Attempt the questions before revealing the answers."}
            </p>
          </div>
        </div>

        {answersUrl && (
          <Button variant={showAnswers ? "secondary" : "default"} size="sm" onClick={() => setShowAnswers((current) => !current)}>
            {showAnswers ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showAnswers ? "Return to questions" : "Reveal answers"}
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-hidden p-2 md:p-4">
        <iframe
          key={proxiedUrl}
          src={`${proxiedUrl}#toolbar=0&navpanes=0`}
          title={showAnswers ? "Topical answers" : "Topical questions"}
          className="h-full w-full rounded-lg border-0 bg-background shadow-sm"
        />
      </div>
    </main>
  );
}

export default function TopicalViewerPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100vh-140px)] items-center justify-center">Loading resource...</div>}>
      <TopicalViewerContent />
    </Suspense>
  );
}
