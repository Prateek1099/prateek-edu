"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, ArrowLeft, CheckCircle } from "lucide-react";
import { joinClassByCode } from "@/app/actions/class";
import { toast } from "sonner";
import Link from "next/link";

export default function JoinClassPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ className: string; workspaceName: string } | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await joinClassByCode(code);
      setSuccess(result);
      toast.success("Successfully joined class!");
    } catch (err: any) {
      toast.error(err.message || "Failed to join");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">You're In!</h2>
            <p className="text-muted-foreground mb-1">
              You've successfully joined <strong>{success.className}</strong>
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              in <strong>{success.workspaceName}</strong>
            </p>
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Join a Class</CardTitle>
          <CardDescription>Enter the join code provided by your teacher.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <Input
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VX-XXXX-XX"
                className="text-center text-lg font-mono tracking-widest h-12"
                maxLength={10}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Joining..." : "Join Class"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-3 inline mr-1" /> Back to Dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
