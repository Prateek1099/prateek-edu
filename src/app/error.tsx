"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { AlertCircle, RefreshCcw, LogOut } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if needed
    console.error("Global Error Caught:", error);
  }, [error]);

  const handleSignOutAndRecover = async () => {
    // If the error is caused by a corrupted session cookie,
    // forcing a sign-out will clear the invalid cookies and allow a fresh start.
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-lg p-8 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-600 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Something went wrong</h2>
          <p className="text-gray-500 dark:text-zinc-400 text-sm">
            We encountered an unexpected error while loading this page. This often happens if your login session has expired or become corrupted.
          </p>
        </div>

        {error.digest && (
          <div className="bg-gray-100 dark:bg-zinc-800 p-3 rounded-lg text-xs text-gray-500 dark:text-zinc-400 font-mono break-all text-left">
            Error ID: {error.digest}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-4">
          <Button 
            onClick={() => reset()} 
            className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <RefreshCcw className="w-4 h-4" /> Try Again
          </Button>
          
          <Button 
            onClick={handleSignOutAndRecover} 
            variant="outline" 
            className="w-full gap-2 border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            <LogOut className="w-4 h-4" /> Clear Session & Log In
          </Button>
        </div>
      </div>
    </div>
  );
}
