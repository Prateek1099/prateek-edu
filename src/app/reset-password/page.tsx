"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password, confirmPassword }),
      });
      const body = await response.json();
      if (!response.ok) setError(body.error || "Unable to reset your password.");
      else setSuccess(true);
    } catch {
      setError("Unable to reset your password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-140px)] items-center justify-center p-4">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/4 -z-10 mx-auto h-72 max-w-2xl overflow-hidden blur-3xl opacity-20 bg-gradient-to-b from-indigo-500/25 via-purple-600/15 to-transparent"
      />
      <Card className="w-full max-w-md rounded-2xl border border-border/80 bg-card shadow-xl">
        <CardHeader className="space-y-3 text-center pb-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-2xs">
            <KeyRound className="size-7 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-extrabold tracking-tight">Set a new password</CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Use at least 10 characters, with uppercase, lowercase, and a number.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Password updated successfully. You can now log in.
            </div>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              {error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-center text-xs sm:text-sm font-semibold text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={10}
                  className="h-10 rounded-xl bg-background border-border/80"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={10}
                  className="h-10 rounded-xl bg-background border-border/80"
                  required
                />
              </div>
              <Button className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold shadow-md" type="submit" disabled={isSubmitting || !email || !token}>
                {isSubmitting ? "Updating..." : "Update password"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="pt-0 justify-center">
          <Link className="inline-flex items-center text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors" href="/login">
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100vh-140px)] items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
