"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, MailCheck } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <main className="flex min-h-[calc(100vh-140px)] items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-lg border-primary/10 shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
            <MailCheck className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">
              {isUnverifiedLogin ? "Your email has not been verified." : "Check your inbox"}
            </CardTitle>
            <CardDescription className="text-sm leading-6">
              We&apos;ve sent a verification email to your inbox. Please verify your email before logging in.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <p>The link is valid for 24 hours and can only be used once. Check Spam or Promotions if it is not in your inbox.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verification-email">Email address</Label>
            <Input
              id="verification-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          {message && (
            <p className={status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-600"} role="status" aria-live="polite">
              {message}
            </p>
          )}

          <Button className="w-full" onClick={resend} disabled={!email || status === "sending" || cooldown > 0}>
            {status === "sending" ? "Sending..." : cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend Verification Email"}
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <Link href={loginHref} className={buttonVariants({ variant: "ghost" })}>Back to Login</Link>
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
