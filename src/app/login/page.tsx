"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";

function readInternalCallbackPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  if (raw.includes("://")) return null;
  return raw;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const isVerified = searchParams.get("verified") === "true";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      if (res.error.includes("EMAIL_NOT_VERIFIED")) {
        const params = new URLSearchParams({ email, reason: "unverified" });
        const callback = readInternalCallbackPath(searchParams.get("callbackUrl"));
        if (callback) params.set("callbackUrl", callback);
        window.location.assign(`/verify-email?${params.toString()}`);
        return;
      }
      setError("Incorrect email or password.");
      setLoading(false);
    } else {
      const callback = readInternalCallbackPath(searchParams.get("callbackUrl"));
      // Full navigation so the new session cookie is always sent; `getSession()` right after
      // `signIn` often races and misses `role`, sending admins to /dashboard by mistake.
      if (callback) {
        window.location.assign(callback);
      } else {
        window.location.assign("/dashboard");
      }
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-140px)] items-center justify-center p-4">
      {/* Subtle top ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-72 max-w-4xl overflow-hidden blur-3xl opacity-20 bg-gradient-to-b from-indigo-500/20 via-purple-600/10 to-transparent"
      />

      <Card className="w-full max-w-md shadow-xl border border-border/80 rounded-2xl bg-card">
        <CardHeader className="space-y-1 text-center pb-5">
          <div className="flex justify-center mb-3">
            <div className="bg-primary/10 size-14 rounded-2xl border border-primary/20 flex items-center justify-center shadow-sm">
              <GraduationCap className="size-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome to Vexa</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Enter your credentials to access your study materials
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button
            variant="outline"
            className="w-full shadow-sm h-11 border-border hover:bg-muted/50 font-medium"
            type="button"
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          >
            <svg className="mr-2.5 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.02 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            Continue with Google
          </Button>

          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2.5 text-muted-foreground font-medium">
                Or continue with email
              </span>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            {isVerified && <div className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-sm text-center font-medium">Email successfully verified! You can now log in.</div>}
            {searchParams.get("verification") === "invalid" && <div className="text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg text-sm text-center font-medium">That verification link is invalid or has expired. Request a new one below.</div>}
            {error && <div className="text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg text-sm text-center font-medium">{error}</div>}
            <div className="grid gap-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 rounded-lg"
              />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline font-medium">Forgot password?</Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 rounded-lg"
              />
            </div>
            <Button className="w-full shadow-md h-10 font-semibold" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </Button>
            <div className="text-center text-xs">
              <Link href="/verify-email" className="text-muted-foreground hover:text-primary transition-colors underline underline-offset-4">Need to resend email verification?</Link>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col text-sm text-muted-foreground text-center pt-2 pb-6">
          <div>
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-semibold">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[calc(100vh-140px)]">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
