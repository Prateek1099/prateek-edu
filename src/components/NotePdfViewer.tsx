"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2 } from "lucide-react";

// Configure PDF.js worker for react-pdf.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type NotePdfViewerProps = {
  url: string;
  loadingLabel?: string;
};

export default function NotePdfViewer({ url, loadingLabel = "Loading note…" }: NotePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [numPages, setNumPages] = useState<number | undefined>(undefined);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => {
      const fsEl = document.fullscreenElement;
      setIsFullscreen(Boolean(fsEl));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const maxPages = useMemo(() => numPages ?? 1, [numPages]);

  const requestFs = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) await el.requestFullscreen();
    } catch {
      // ignore (browser might block fullscreen)
    }
  };

  const exitFs = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // ignore
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-muted/20 items-center overflow-hidden select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Toolbar: controlled (no download/open-in-new-tab actions) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b bg-background shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium w-24 text-center">
            Page {pageNumber} of {numPages || "?"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNumber((p) => Math.min(maxPages, p + 1))}
            disabled={pageNumber >= maxPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => Math.max(0.6, s - 0.15))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => Math.min(3, s + 0.15))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => (isFullscreen ? exitFs() : requestFs())}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Viewer Area */}
      <div className="flex-1 overflow-auto w-full flex justify-center p-2 md:p-4">
        <div
          className={cn(
            "bg-white shadow-lg rounded-sm overflow-hidden transition-all duration-300",
            "dark:invert-[.9] dark:hue-rotate-180"
          )}
        >
          <Document
            file={url}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            className="flex flex-col items-center"
            loading={<div className="p-8 text-muted-foreground animate-pulse">{loadingLabel}</div>}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="max-w-full"
            />
          </Document>
        </div>
      </div>
    </div>
  );
}
