"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Briefcase } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [registerAs, setRegisterAs] = useState("student");
  const [error, setError] = useState("");
  const [accountNeedsVerification, setAccountNeedsVerification] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAccountNeedsVerification(false);

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
        setAccountNeedsVerification(data.accountCreated === true);
        setLoading(false);
        return;
      }

      toast.success(
        "Account created. We sent your verification email.",
        { duration: 5000 },
      );
      router.push(`/verify-email?email=${encodeURIComponent(email)}&sent=true`);
    } catch {
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
          <TabsPrimitive.Root defaultValue="student" value={registerAs} onValueChange={(v) => v && setRegisterAs(v)} className="w-full">
            <TabsPrimitive.List className="mb-4 grid w-full grid-cols-2 gap-1.5 rounded-xl border border-zinc-200/80 bg-zinc-100/80 p-1.5 backdrop-blur-md shadow-sm ring-1 ring-zinc-200/60 dark:border-white/10 dark:bg-[#11111a]/80 dark:ring-white/5">
              <TabsPrimitive.Tab
                value="student"
                className="group relative inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-all duration-200 cursor-pointer select-none outline-none hover:text-zinc-950 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/10 data-[active]:bg-gradient-to-r data-[active]:from-indigo-600 data-[active]:to-indigo-500 data-[active]:text-white data-[active]:font-semibold data-[active]:shadow-md data-[active]:shadow-indigo-500/20 data-[active]:border-indigo-400/30 border border-transparent"
              >
                Student
              </TabsPrimitive.Tab>
              <TabsPrimitive.Tab
                value="teacher"
                className="group relative inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-all duration-200 cursor-pointer select-none outline-none hover:text-zinc-950 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/10 data-[active]:bg-gradient-to-r data-[active]:from-indigo-600 data-[active]:to-indigo-500 data-[active]:text-white data-[active]:font-semibold data-[active]:shadow-md data-[active]:shadow-indigo-500/20 data-[active]:border-indigo-400/30 border border-transparent"
              >
                Teacher
              </TabsPrimitive.Tab>
            </TabsPrimitive.List>
            
            <form onSubmit={handleRegister} className="space-y-4">
              {error && (
                <div className="space-y-3 rounded-lg bg-destructive/10 p-3 text-center text-sm font-medium text-destructive">
                  <p>{error}</p>
                  {accountNeedsVerification && (
                    <Link
                      href={`/verify-email?email=${encodeURIComponent(email)}`}
                      className={buttonVariants({ variant: "outline", className: "bg-background text-foreground" })}
                    >
                      Open verification page
                    </Link>
                  )}
                </div>
              )}
              
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
                  minLength={10}
                />
                <p className="text-xs text-muted-foreground">Use at least 10 characters, including uppercase, lowercase, and a number.</p>
              </div>
              <Button className="w-full shadow-sm mt-2" type="submit" disabled={loading}>
                {loading ? "Creating Account..." : "Sign Up"}
              </Button>
            </form>
          </TabsPrimitive.Root>
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
