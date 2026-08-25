"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, ChevronLeft, CheckCircle2 } from "lucide-react";
import { joinClassByCode } from "@/app/actions/class";
import { toast } from "sonner";
import Link from "next/link";

export default function JoinClassPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ className: string; workspaceName: string } | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await joinClassByCode(code);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuccess({ className: result.className, workspaceName: result.workspaceName });
      toast.success("Successfully joined class!");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to join";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="relative flex min-h-[calc(100vh-140px)] items-center justify-center p-4">
        {/* Ambient background glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/4 -z-10 mx-auto h-72 max-w-2xl overflow-hidden blur-3xl opacity-20 bg-gradient-to-b from-indigo-500/25 via-purple-600/15 to-transparent"
        />
        <Card className="max-w-md w-full rounded-2xl border border-border/80 bg-card shadow-xl">
          <CardContent className="p-8 sm:p-10 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-7" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight mb-2">You&apos;re In!</h2>
            <p className="text-sm text-muted-foreground mb-1 leading-relaxed">
              You&apos;ve successfully joined <strong className="text-foreground font-semibold">{success.className}</strong>
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              in <strong className="text-foreground font-semibold">{success.workspaceName}</strong>
            </p>
            <Link href="/dashboard">
              <Button className="h-11 w-full rounded-xl text-sm font-semibold shadow-md">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100vh-140px)] items-center justify-center p-4">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/4 -z-10 mx-auto h-72 max-w-2xl overflow-hidden blur-3xl opacity-20 bg-gradient-to-b from-indigo-500/25 via-purple-600/15 to-transparent"
      />
      <Card className="max-w-md w-full rounded-2xl border border-border/80 bg-card shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
            <Users className="size-6" />
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight">Join a Class</CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground">
            Enter the 6-10 character join code provided by your teacher.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <Input
                required
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  if (error) setError(null);
                }}
                placeholder="VX-XXXX-XX"
                className="text-center text-lg font-mono font-bold tracking-widest h-12 rounded-xl bg-background border-border/80"
                maxLength={10}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "join-class-error" : undefined}
              />
            </div>
            {error ? (
              <p
                id="join-class-error"
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-center text-sm font-medium text-destructive"
              >
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full h-11 rounded-xl text-sm font-semibold shadow-md" disabled={loading}>
              {loading ? "Joining class..." : "Join Class"}
            </Button>
          </form>
          <div className="mt-5 text-center">
            <Link href="/dashboard" className="inline-flex items-center text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="size-3.5 mr-1" /> Back to Dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
