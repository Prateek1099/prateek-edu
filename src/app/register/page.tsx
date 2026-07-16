"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Briefcase } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [registerAs, setRegisterAs] = useState("student");
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          name, 
          email, 
          password, 
          registerAs,
          workspaceName: registerAs === "teacher" ? workspaceName : undefined
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }

      // Automatically log in the user after successful registration
      const loginRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (loginRes?.error) {
        setError("Account created, but automatic login failed. Please log in manually.");
        setLoading(false);
      } else {
        toast.success(
          registerAs === "teacher" 
            ? "Teacher account created! Your workspace is pending admin approval."
            : "Account created! Please check your email to verify your account.", 
          { duration: 5000 }
        );
        router.push(registerAs === "teacher" ? "/workspace" : "/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center p-4 bg-muted/20">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-1 text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-xl border border-primary/20">
              {registerAs === "teacher" ? (
                <Briefcase className="h-8 w-8 text-primary" />
              ) : (
                <GraduationCap className="h-8 w-8 text-primary" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Create an Account</CardTitle>
          <CardDescription>
            Join Vexa to manage your learning journey
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Tabs defaultValue="student" onValueChange={(v) => setRegisterAs(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="teacher">Teacher</TabsTrigger>
            </TabsList>
            
            <form onSubmit={handleRegister} className="space-y-4">
              {error && <div className="text-destructive text-sm text-center font-medium">{error}</div>}
              
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  type="text" 
                  placeholder={registerAs === "teacher" ? "Jane Smith" : "John Doe"} 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder={registerAs === "teacher" ? "jane.smith@school.edu" : "student@example.com"} 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>

              {registerAs === "teacher" && (
                <div className="grid gap-2">
                  <Label htmlFor="workspace">Workspace Name</Label>
                  <Input 
                    id="workspace" 
                    type="text" 
                    placeholder="e.g. Mrs. Smith's Science Classes" 
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    required 
                  />
                  <p className="text-xs text-muted-foreground">
                    This is your personalized area where you will manage your classes and content.
                  </p>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  minLength={6}
                />
              </div>
              <Button className="w-full shadow-sm mt-2" type="submit" disabled={loading}>
                {loading ? "Creating Account..." : "Sign Up"}
              </Button>
            </form>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col text-sm text-muted-foreground text-center space-y-2">
          <div>
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-semibold">
              Log in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
