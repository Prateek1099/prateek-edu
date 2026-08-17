"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, BookOpenCheck, Download, FileQuestion } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PdfViewer = dynamic(() => import("@/components/NotePdfViewer"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading document…</div>,
});

type DocumentKind = "questions" | "solutions";

export default function TopicalQuestionViewer({
  resource,
  initialDocument,
  backUrl,
}: {
  resource: {
    id: string;
    title: string;
    description: string | null;
    subjectName: string;
    topicName: string | null;
    hasSolutions: boolean;
  };
  initialDocument: DocumentKind;
  backUrl: string;
}) {
  const documentKind = initialDocument === "solutions" && resource.hasSolutions ? "solutions" : "questions";
  const proxyUrl = `/api/protected/pdf?topicalId=${encodeURIComponent(resource.id)}&document=${documentKind}`;
  const downloadUrl = `${proxyUrl}&download=true`;

  return (
    <main className="flex h-[calc(100vh-64px)] min-h-[620px] flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b border-border/80 bg-card/90 backdrop-blur-md px-4 py-3 shadow-xs">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link href={backUrl} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0 gap-1.5 rounded-xl h-9 px-3 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground")}>
              <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Back</span>
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-primary/10 border border-primary/20 text-primary text-xs font-semibold px-2.5 py-0.5 rounded-lg">
                  {documentKind === "solutions" ? "Solutions" : "Questions"}
                </Badge>
                {resource.topicName && <span className="text-xs font-medium text-muted-foreground">{resource.topicName}</span>}
              </div>
              <h1 className="mt-0.5 truncate text-sm sm:text-base font-bold text-foreground">{resource.title}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pl-10 lg:pl-0">
            <Link
              href={`${backUrl}/topical/${resource.id}`}
              className={cn(buttonVariants({ variant: documentKind === "questions" ? "default" : "outline", size: "sm" }), "gap-1.5 rounded-xl h-9 px-3.5 text-xs sm:text-sm font-semibold shadow-2xs")}
            >
              <FileQuestion className="size-3.5" /> Questions
            </Link>
            {resource.hasSolutions && (
              <Link
                href={`${backUrl}/topical/${resource.id}?document=solutions`}
                className={cn(buttonVariants({ variant: documentKind === "solutions" ? "default" : "outline", size: "sm" }), "gap-1.5 rounded-xl h-9 px-3.5 text-xs sm:text-sm font-semibold shadow-2xs")}
              >
                <BookOpenCheck className="size-3.5" /> Solutions
              </Link>
            )}
            <a href={downloadUrl} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 rounded-xl h-9 px-3.5 text-xs sm:text-sm font-semibold shadow-2xs")}>
              <Download className="size-3.5" /> <span className="hidden sm:inline">Download</span>
            </a>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <PdfViewer url={proxyUrl} loadingLabel="Loading topical questions…" />
      </div>
    </main>
  );
}
