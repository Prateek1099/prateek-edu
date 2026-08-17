"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, MailCheck } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const COOLDOWN_SECONDS = 60;

function readInternalCallbackPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) return null;
  return raw;
}

function VerificationPending() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(searchParams.get("sent") === "true" ? COOLDOWN_SECONDS : 0);
  const isUnverifiedLogin = searchParams.get("reason") === "unverified";
  const callback = readInternalCallbackPath(searchParams.get("callbackUrl"));
  const loginHref = callback ? `/login?callbackUrl=${encodeURIComponent(callback)}` : "/login";

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const resend = async () => {
    setStatus("sending");
    setMessage("");
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        setStatus("error");
        setMessage(body.error || "We could not send a verification email. Please try again.");
        return;
      }
      setStatus("sent");
      setMessage(body.message || "If the account is eligible, a verification email has been sent.");
      setCooldown(COOLDOWN_SECONDS);
    } catch {
      setStatus("error");
      setMessage("We could not reach the email service. Please try again.");
    }
  };

  return (
    <main className="relative flex min-h-[calc(100vh-140px)] items-center justify-center p-4">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/4 -z-10 mx-auto h-72 max-w-2xl overflow-hidden blur-3xl opacity-20 bg-gradient-to-b from-indigo-500/25 via-purple-600/15 to-transparent"
      />
      <Card className="w-full max-w-lg rounded-2xl border border-border/80 bg-card shadow-xl">
        <CardHeader className="space-y-3 text-center pb-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-2xs">
            <MailCheck className="size-7 text-primary" aria-hidden="true" />
          </div>
          <div>
            <CardTitle className="text-2xl font-extrabold tracking-tight">
              {isUnverifiedLogin ? "Your email has not been verified" : "Check your inbox"}
            </CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              We&apos;ve sent a verification link to your email address. Please verify your email to log in.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <p>The link is valid for 24 hours. Check your Spam or Promotions folder if it is not in your primary inbox.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="verification-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email address</Label>
            <Input
              id="verification-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-10 rounded-xl bg-background border-border/80"
              required
            />
          </div>

          {message && (
            <p className={status === "error" ? "text-xs sm:text-sm font-semibold text-destructive" : "text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400"} role="status" aria-live="polite">
              {message}
            </p>
          )}

          <Button className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold shadow-md" onClick={resend} disabled={!email || status === "sending" || cooldown > 0}>
            {status === "sending" ? "Sending..." : cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend Verification Email"}
          </Button>
        </CardContent>
        <CardFooter className="pt-0 justify-center">
          <Link href={loginHref} className={cn(buttonVariants({ variant: "ghost" }), "rounded-xl text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground")}>
            Back to Login
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100vh-140px)] items-center justify-center">Loading...</div>}>
      <VerificationPending />
    </Suspense>
  );
}
