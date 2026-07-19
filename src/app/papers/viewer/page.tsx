"use client";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Maximize2, Minimize2, Download, BookOpen, CheckSquare, Square } from "lucide-react";
import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PremiumViewer } from "@/components/PremiumViewer";

function PaperViewerInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const qp = searchParams.get('qp');
  const ms = searchParams.get('ms');
  const sf = searchParams.get('sf');
  const id = searchParams.get('id'); // Paper ID from database
  
  const [viewMode, setViewMode] = useState<"dual" | "qp" | "ms">("dual");
  const [status, setStatus] = useState<string>("not_started");
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    if (!id) return;
    const fetchProgress = async () => {
      try {
        const res = await fetch(`/api/progress?paperId=${id}`);
        if (res.ok) {
          const data = await res.json();
          let currentStatus = data.status;
          
          // If they just opened it and it's not started, mark it in progress immediately
          if (currentStatus === "not_started") {
            fetch("/api/progress", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paperId: id, status: "in_progress" }),
            }).catch(console.error);
            currentStatus = "in_progress";
          }
          
          setStatus(currentStatus);
        }
      } catch (e) {
        console.error("Failed to fetch initial progress:", e);
      }
    };
    fetchProgress();
  }, [id]);

  const toggleCompleted = async () => {
    if (!id) return;
    setIsSaving(true);
    const newStatus = status === "completed" ? "in_progress" : "completed";
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId: id, status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!qp && !ms) {
    return (
      <div className="flex h-full items-center justify-center min-h-[calc(100vh-140px)]">
        <p className="text-muted-foreground">No paper selected.</p>
      </div>
    );
  }

  return (
    <div ref={viewerRef} className={`flex flex-col overflow-hidden bg-muted/20 ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-65px)]'}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div className="hidden sm:flex bg-muted p-1 rounded-md">
            <Button 
               variant={viewMode === "qp" ? "secondary" : "ghost"} 
               size="sm"
               onClick={() => setViewMode("qp")}
            >
              <BookOpen className="h-4 w-4 mr-2" /> QP Only
            </Button>
            <Button 
               variant={viewMode === "dual" ? "secondary" : "ghost"} 
               size="sm"
               onClick={() => setViewMode("dual")}
            >
              Dual View
            </Button>
            <Button 
               variant={viewMode === "ms" ? "secondary" : "ghost"} 
               size="sm"
               onClick={() => setViewMode("ms")}
            >
              <CheckSquare className="h-4 w-4 mr-2" /> MS Only
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sf && (
            <a href={sf} download className="hidden md:flex">
              <Button variant="default" size="sm" className="gap-2 animate-pulse hover:animate-none w-full">
                <Download className="h-4 w-4" /> Download Source Files
              </Button>
            </a>
          )}
          
          {/* Dynamic Download PDF buttons based on viewMode and availability */}
          {qp && (viewMode === "qp" || viewMode === "dual") && (
            <a 
              href={`/api/protected/pdf?url=${encodeURIComponent(qp)}&download=true`} 
              download 
              className="hidden md:flex"
            >
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" /> Download QP
              </Button>
            </a>
          )}
          {ms && (viewMode === "ms" || viewMode === "dual") && (
            <a 
              href={`/api/protected/pdf?url=${encodeURIComponent(ms)}&download=true`} 
              download 
              className="hidden md:flex"
            >
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" /> Download MS
              </Button>
            </a>
          )}

          {id && (
            <Button 
              variant={status === "completed" ? "default" : "secondary"} 
              size="sm" 
              onClick={toggleCompleted}
              disabled={isSaving}
              className={status === "completed" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}
            >
               {status === "completed" ? (
                 <CheckSquare className="h-4 w-4 mr-2" />
               ) : (
                 <Square className="h-4 w-4 mr-2" />
               )}
               {isSaving ? "Saving..." : status === "completed" ? "Completed" : "Mark as Completed"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={toggleFullScreen}>
             {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Viewer Area */}
      <PremiumViewer>
        <div className={`flex-1 overflow-hidden p-2 md:p-4 pb-0 md:pb-4 ${isFullscreen ? 'h-[calc(100vh-60px)]' : 'h-[calc(100vh-130px)]'}`}>
        {viewMode === "dual" && qp && ms ? (
          /* @ts-expect-error - Prop compatibility with latest react-resizable-panels */
          <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border bg-background shadow-sm overflow-hidden">
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full flex flex-col relative group bg-muted/10">
                <div className="absolute top-2 left-2 px-2 py-1 bg-background/80 backdrop-blur border rounded text-xs font-semibold z-10 opacity-60 group-hover:opacity-100 transition-opacity">Question Paper</div>
                <iframe src={`/api/protected/pdf?url=${encodeURIComponent(qp || "")}#toolbar=0&navpanes=0`} className="w-full h-full border-0 dark:invert-[.9] dark:hue-rotate-180 transition-all duration-300 pointer-events-none sm:pointer-events-auto" />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full flex flex-col relative group bg-muted/10">
                <div className="absolute top-2 left-2 px-2 py-1 bg-background/80 backdrop-blur border rounded text-xs font-semibold z-10 opacity-60 group-hover:opacity-100 transition-opacity">Mark Scheme</div>
                <iframe src={`/api/protected/pdf?url=${encodeURIComponent(ms || "")}#toolbar=0&navpanes=0`} className="w-full h-full border-0 dark:invert-[.9] dark:hue-rotate-180 transition-all duration-300 pointer-events-none sm:pointer-events-auto" />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="h-full rounded-lg border bg-background shadow-sm overflow-hidden relative">
            <div className="absolute top-2 left-2 px-2 py-1 bg-background/80 backdrop-blur border rounded text-xs font-semibold z-10">
               {viewMode === "ms" || !qp ? "Mark Scheme" : "Question Paper"}
            </div>
            <iframe 
               src={`/api/protected/pdf?url=${encodeURIComponent((viewMode === "ms" || !qp ? ms : qp) || "")}#toolbar=0&navpanes=0`} 
               className="w-full h-full border-0 dark:invert-[.9] dark:hue-rotate-180 transition-all duration-300 pointer-events-none sm:pointer-events-auto" 
            />
          </div>
        )}
        </div>
      </PremiumViewer>

    </div>
  );
}

export default function PaperViewerPage() {
  return (
    <Suspense fallback={<div className="flex h-[calc(100vh-65px)] items-center justify-center">Loading viewer...</div>}>
      <PaperViewerInner />
    </Suspense>
  );
}
