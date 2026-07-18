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
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-2 text-center"><div className="mx-auto rounded-xl border border-primary/20 bg-primary/10 p-3"><KeyRound className="h-7 w-7 text-primary" /></div><CardTitle>Set a new password</CardTitle><CardDescription>Use at least 10 characters, with uppercase, lowercase, and a number.</CardDescription></CardHeader>
        <CardContent>
          {success ? <p className="rounded-md bg-emerald-500/10 p-4 text-center text-sm text-emerald-700 dark:text-emerald-400">Password updated. You can now log in.</p> : <form className="space-y-4" onSubmit={submit}>
            {error && <p className="rounded-md bg-destructive/10 p-3 text-center text-sm text-destructive">{error}</p>}
            <div className="grid gap-2"><Label htmlFor="password">New password</Label><Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={10} required /></div>
            <div className="grid gap-2"><Label htmlFor="confirmPassword">Confirm new password</Label><Input id="confirmPassword" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={10} required /></div>
            <Button className="w-full" type="submit" disabled={isSubmitting || !email || !token}>{isSubmitting ? "Updating..." : "Update password"}</Button>
          </form>}
        </CardContent>
        <CardFooter><Link className="mx-auto text-sm font-medium text-primary hover:underline" href="/login">Back to login</Link></CardFooter>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="flex min-h-[calc(100vh-140px)] items-center justify-center">Loading...</div>}><ResetPasswordForm /></Suspense>;
}
