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
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto rounded-xl border border-primary/20 bg-primary/10 p-3"><Mail className="h-7 w-7 text-primary" /></div>
          <CardTitle>Forgot password?</CardTitle>
          <CardDescription>Enter your email and we&apos;ll send a reset link if the account supports password login.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
            <Button className="w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? "Sending..." : "Send reset link"}</Button>
            {message && <p className="rounded-md bg-muted p-3 text-center text-sm text-muted-foreground">{message}</p>}
          </form>
        </CardContent>
        <CardFooter><Link className="mx-auto inline-flex items-center text-sm font-medium text-primary hover:underline" href="/login"><ArrowLeft className="mr-1 h-4 w-4" /> Back to login</Link></CardFooter>
      </Card>
    </div>
  );
}
