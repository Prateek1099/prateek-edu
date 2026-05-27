"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";

const NotePdfViewer = dynamic(() => import("@/components/NotePdfViewer"), {
  ssr: false,
});

function NotesViewerInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const pdf = searchParams.get("pdf");
  const title = searchParams.get("title") ?? "Revision note";

  const decodedPdf = useMemo(() => {
    try {
      return pdf ? decodeURIComponent(pdf) : null;
    } catch {
      return pdf;
    }
  }, [pdf]);

  if (!decodedPdf) {
    return (
      <div className="flex h-[calc(100vh-140px)] items-center justify-center">
        <p className="text-muted-foreground">No note PDF provided.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-muted/20">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <h1 className="text-sm md:text-base font-semibold truncate">{title}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <NotePdfViewer url={decodedPdf} />
      </div>
    </div>
  );
}

export default function NotesViewerPage() {
  return (
    <Suspense fallback={<div className="flex h-[calc(100vh-64px)] items-center justify-center">Loading…</div>}>
      <NotesViewerInner />
    </Suspense>
  );
}

