"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await response.json();
      setMessage(body.message || "If an eligible account matches that email, we sent a reset link.");
    } catch {
      setMessage("We could not process the request. Please try again.");
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
            <Mail className="size-7 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-extrabold tracking-tight">Forgot password?</CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Enter your account email and we&apos;ll send a password reset link.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10 rounded-xl bg-background border-border/80"
                required
              />
            </div>
            <Button className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold shadow-md" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send reset link"}
            </Button>
            {message && (
              <p className="rounded-xl border border-border/60 bg-muted/40 p-3 text-center text-xs sm:text-sm text-muted-foreground">
                {message}
              </p>
            )}
          </form>
        </CardContent>
        <CardFooter className="pt-0 justify-center">
          <Link className="inline-flex items-center text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors" href="/login">
            <ArrowLeft className="mr-1.5 size-3.5" /> Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
