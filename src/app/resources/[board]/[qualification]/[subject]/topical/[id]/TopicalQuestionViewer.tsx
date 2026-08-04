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
    <main className="flex h-[calc(100vh-64px)] min-h-[620px] flex-col overflow-hidden bg-muted/20">
      <header className="shrink-0 border-b bg-background px-3 py-3 shadow-sm sm:px-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Link href={backUrl} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mt-0.5 shrink-0 gap-1.5")}>
              <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Back</span>
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{documentKind === "solutions" ? "Solutions" : "Questions"}</Badge>
                {resource.topicName && <span className="text-xs text-muted-foreground">{resource.topicName}</span>}
              </div>
              <h1 className="mt-1 truncate text-base font-semibold sm:text-lg">{resource.title}</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">{resource.subjectName}{resource.description ? ` · ${resource.description}` : ""}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pl-12 lg:pl-0">
            <Link
              href={`${backUrl}/topical/${resource.id}`}
              className={cn(buttonVariants({ variant: documentKind === "questions" ? "default" : "outline", size: "sm" }), "gap-1.5")}
            >
              <FileQuestion className="size-4" /> Questions
            </Link>
            {resource.hasSolutions && (
              <Link
                href={`${backUrl}/topical/${resource.id}?document=solutions`}
                className={cn(buttonVariants({ variant: documentKind === "solutions" ? "default" : "outline", size: "sm" }), "gap-1.5")}
              >
                <BookOpenCheck className="size-4" /> Solutions
              </Link>
            )}
            <a href={downloadUrl} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
              <Download className="size-4" /> <span className="hidden sm:inline">Download</span>
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
