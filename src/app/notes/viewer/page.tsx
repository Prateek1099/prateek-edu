"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { ArrowLeft, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const NotePdfViewer = dynamic(() => import("@/components/NotePdfViewer"), {
  ssr: false,
});

function NotesViewerInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const pdf = searchParams.get("pdf");
  const title = searchParams.get("title") ?? "Revision note";

  const proxiedPdfUrl = useMemo(() => {
    if (!pdf) return null;
    return `/api/protected/pdf?url=${encodeURIComponent(pdf)}&isNote=true`;
  }, [pdf]);

  const downloadUrl = useMemo(() => {
    if (!pdf) return null;
    return `/api/protected/pdf?url=${encodeURIComponent(pdf)}&isNote=true&download=true`;
  }, [pdf]);

  if (!pdf || !proxiedPdfUrl || !downloadUrl) {
    return (
      <div className="flex h-[calc(100vh-140px)] items-center justify-center">
        <p className="text-muted-foreground">No note PDF provided.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/80 bg-card/90 backdrop-blur-md shadow-xs z-10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" className="rounded-xl h-9 px-3 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <h1 className="text-xs sm:text-sm md:text-base font-bold truncate text-foreground">{title}</h1>
        </div>
        <a
          href={downloadUrl}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 gap-1.5 rounded-xl h-9 px-3 text-xs sm:text-sm font-semibold shadow-2xs")}
          aria-label={`Download ${title}`}
        >
          <Download className="size-3.5" />
          <span className="hidden sm:inline">Download PDF</span>
        </a>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-[calc(100vh-130px)]">
          <NotePdfViewer url={proxiedPdfUrl} />
        </div>
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
