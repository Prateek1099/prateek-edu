"use client";

import { useSession } from "next-auth/react";
import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

interface PremiumViewerProps {
  children: React.ReactNode;
  isPremiumContent?: boolean;
}

export function PremiumViewer({ children, isPremiumContent = true }: PremiumViewerProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const isPremiumUser = (session?.user as any)?.isPremium === true;

  // Anti-Copy & Anti-Right-Click
  useEffect(() => {
    if (!isPremiumContent || !isPremiumUser) return;
    
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleCopy = (e: ClipboardEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Cmd+P / Ctrl+P
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
      }
      // Prevent Cmd+C / Ctrl+C
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
      }
    };

    const el = containerRef.current;
    if (el) {
      el.addEventListener("contextmenu", handleContextMenu);
      el.addEventListener("copy", handleCopy);
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      if (el) {
        el.removeEventListener("contextmenu", handleContextMenu);
        el.removeEventListener("copy", handleCopy);
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPremiumContent, isPremiumUser]);

  if (isPremiumContent && !isPremiumUser) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-muted/20 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 group-hover:from-indigo-500/10 group-hover:to-purple-500/10 transition-colors" />
        <div className="w-16 h-16 bg-background border shadow-sm rounded-full flex items-center justify-center mb-6 relative z-10">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2 relative z-10 flex items-center gap-2">
          Premium Access Required
          <Crown className="w-5 h-5 text-amber-500" />
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-8 relative z-10">
          This content is exclusive to Vexa Premium members. Upgrade to unlock all past papers, AI evaluations, and distraction-free viewing.
        </p>
        <Button size="lg" className="relative z-10 font-semibold" onClick={() => router.push("/premium")}>
          Unlock Premium Now
        </Button>
      </div>
    );
  }

  // Generate Watermark Text
  const userName = session?.user?.name || "Student";
  const userEmail = session?.user?.email || "";
  const userId = (session?.user as any)?.id?.substring(0, 8) || "";
  const timestamp = new Date().toISOString().split("T")[0];
  const watermarkText = `Premium Access — ${userName} — ${userEmail} — ID:${userId} — ${timestamp}`;

  return (
    <div 
      ref={containerRef} 
      className="relative select-none"
      style={{ WebkitUserSelect: "none" }} // extra measure
    >
      {/* Watermark Overlay (Pointer-events-none ensures it doesn't block clicks) */}
      {isPremiumContent && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden mix-blend-multiply dark:mix-blend-overlay opacity-[0.03]">
          <div className="flex flex-wrap w-[150%] h-[150%] -rotate-12 -translate-x-1/4 -translate-y-1/4">
            {Array.from({ length: 50 }).map((_, i) => (
              <div key={i} className="p-8 text-lg font-bold whitespace-nowrap">
                {watermarkText}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Actual Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
