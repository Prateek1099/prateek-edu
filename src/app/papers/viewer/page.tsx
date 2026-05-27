"use client";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Maximize2, Download, BookOpen, CheckSquare } from "lucide-react";
import { Suspense, useState } from "react";
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
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const markCompleted = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId: id, completed: true }),
      });
      if (res.ok) {
        setIsCompleted(true);
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
    <div className="flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-muted/20">
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
          <Button variant="outline" size="sm" className="hidden md:flex">
             <Download className="h-4 w-4 mr-2" /> Download PDF
          </Button>
          {id && (
            <Button 
              variant={isCompleted ? "default" : "secondary"} 
              size="sm" 
              onClick={markCompleted}
              disabled={isSaving || isCompleted}
              className={isCompleted ? "bg-emerald-500 hover:bg-emerald-600" : ""}
            >
               <CheckSquare className="h-4 w-4 mr-2" /> 
               {isSaving ? "Saving..." : isCompleted ? "Completed" : "Mark as Completed"}
            </Button>
          )}
          <Button variant="outline" size="sm">
             <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Viewer Area */}
      <PremiumViewer isPremiumContent={true}>
        <div className="flex-1 overflow-hidden p-2 md:p-4 pb-0 md:pb-4 h-[calc(100vh-130px)]">
        {viewMode === "dual" && qp && ms ? (
          /* @ts-ignore - Prop compatibility with latest react-resizable-panels */
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
