"use client";

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

// Set up the worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function ProtectedPdfViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
  }

  return (
    <div className="flex flex-col h-full bg-muted/20 items-center overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
      <div className="flex items-center gap-4 py-2 px-4 bg-background border-b w-full justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium w-24 text-center">
            Page {pageNumber} of {numPages || '?'}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPageNumber(p => Math.min(numPages || p, p + 1))}
            disabled={pageNumber >= (numPages || 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => setScale(s => Math.min(3, s + 0.2))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto w-full flex justify-center p-4 select-none">
        <div className="bg-white dark:invert-[.9] dark:hue-rotate-180 shadow-lg rounded-sm overflow-hidden transition-all duration-300">
          <Document 
            file={url} 
            onLoadSuccess={onDocumentLoadSuccess}
            className="flex flex-col items-center"
            loading={<div className="p-20 text-muted-foreground animate-pulse">Loading secure document...</div>}
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
      
      <style jsx global>{`
        /* Hide print via CSS as an extra layer of protection */
        @media print {
          body {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
