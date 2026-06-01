"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { updateProfile } from "@/app/actions/settings";
import { setEcosystemPreference } from "@/app/actions/resources-actions";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, ShieldCheck, Sun, Moon, Laptop, Mail, CreditCard, Sparkles, Loader2, Target } from "lucide-react";

export default function SettingsClient({ user }: { user: any }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Profile State
  const [name, setName] = useState(user.name || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Preference State
  const [board, setBoard] = useState(user.preferredBoard || "");
  const [qualification, setQualification] = useState(user.preferredQualification || "");
  const [subject, setSubject] = useState(user.preferredSubject || "");
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const res = await updateProfile(name);
      if (res.success) {
        toast.success("Profile updated successfully.");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update profile.");
      }
    } catch (e) {
      toast.error("Something went wrong.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    try {
      await setEcosystemPreference(board, qualification);
      toast.success("Study preferences saved.");
      router.refresh();
    } catch (e) {
      toast.error("Failed to save preferences.");
    } finally {
      setIsSavingPrefs(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. PROFILE SECTION */}
      <Card className="bg-card shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Profile</CardTitle>
          <CardDescription>Manage your personal information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border">
              {user.image ? (
                <img src={user.image} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-primary/50" />
              )}
            </div>
            <div>
              <p className="font-medium text-sm">Avatar</p>
              <p className="text-xs text-muted-foreground">Managed by your auth provider.</p>
            </div>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" value={user.email} disabled className="bg-muted/50" />
              <p className="text-xs text-muted-foreground px-1">Email cannot be changed currently.</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/20 px-6 py-4">
          <Button onClick={handleSaveProfile} disabled={isSavingProfile || name === user.name}>
            {isSavingProfile ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>

      {/* 2. STUDY PREFERENCES */}
      <Card className="bg-card shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> Study Preferences</CardTitle>
          <CardDescription>Set your default board and qualification to tailor your dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Preferred Board</Label>
              <Select value={board} onValueChange={setBoard}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Board" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cambridge">Cambridge International</SelectItem>
                  <SelectItem value="cbse">CBSE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Qualification</Label>
              <Select value={qualification} onValueChange={setQualification}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Qualification" />
                </SelectTrigger>
                <SelectContent>
                  {board === "cambridge" ? (
                    <>
                      <SelectItem value="igcse">IGCSE</SelectItem>
                      <SelectItem value="o-level">O Level</SelectItem>
                      <SelectItem value="as-a-level">AS & A Level</SelectItem>
                    </>
                  ) : board === "cbse" ? (
                    <>
                      <SelectItem value="class-10">Class 10</SelectItem>
                      <SelectItem value="class-12">Class 12</SelectItem>
                    </>
                  ) : (
                    <SelectItem value="none" disabled>Select a board first</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {/* Optional Subject */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="subject">Preferred Subject (Optional)</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. ICT 0417" />
              <p className="text-xs text-muted-foreground px-1">Helps us recommend relevant resources faster.</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/20 px-6 py-4">
          <Button onClick={handleSavePreferences} disabled={isSavingPrefs || (!board && !qualification)}>
            {isSavingPrefs ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Preferences"}
          </Button>
        </CardFooter>
      </Card>

      {/* 3. SUBSCRIPTION / BILLING */}
      <Card className="bg-card shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> Subscription & Billing</CardTitle>
          <CardDescription>Manage your plan and premium features.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-xl bg-background gap-4">
            <div>
              <p className="font-semibold text-lg flex items-center gap-2">
                Current Plan: {user.isPremium ? <span className="text-primary flex items-center gap-1"><Sparkles className="w-4 h-4"/> Premium</span> : "Free"}
              </p>
              {!user.isPremium && (
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Upgrade to Premium to unlock advanced notes, AI tools, and an enhanced study experience.
                </p>
              )}
            </div>
            {!user.isPremium && (
              <Button className="shrink-0 group">
                Upgrade Plan <Sparkles className="w-4 h-4 ml-2 group-hover:text-yellow-400 transition-colors" />
              </Button>
            )}
            {user.isPremium && (
              <Button variant="outline" className="shrink-0">
                Manage Subscription
              </Button>
            )}
          </div>
          <div className="grid sm:grid-cols-3 gap-4 text-sm text-muted-foreground pt-2">
            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Premium Notes</div>
            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Dual PDF Viewer</div>
            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Unlimited AI Tracking</div>
          </div>
        </CardContent>
      </Card>

      {/* 4. APPEARANCE */}
      <Card className="bg-card shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Moon className="w-5 h-5 text-primary" /> Appearance</CardTitle>
          <CardDescription>Customize how ExamNest looks on your device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 max-w-lg">
            <button
              onClick={() => setTheme("light")}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${theme === "light" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50 text-muted-foreground"}`}
            >
              <Sun className="w-6 h-6 mb-2" />
              <span className="text-sm font-medium">Light</span>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${theme === "dark" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50 text-muted-foreground"}`}
            >
              <Moon className="w-6 h-6 mb-2" />
              <span className="text-sm font-medium">Dark</span>
            </button>
            <button
              onClick={() => setTheme("system")}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${theme === "system" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50 text-muted-foreground"}`}
            >
              <Laptop className="w-6 h-6 mb-2" />
              <span className="text-sm font-medium">System</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 5. SECURITY */}
      <Card className="bg-card shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> Security</CardTitle>
          <CardDescription>Review your account security and connected providers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Email Verification</p>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <span className="font-medium">{user.emailVerified ? "Verified" : "Unverified"}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Connected Provider</p>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="font-medium">{user.authProvider}</span>
              </div>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <p className="text-sm font-medium text-muted-foreground">Member Since</p>
              <p className="font-medium">{new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
          
          {user.authProvider === "Credentials" && (
            <div className="pt-4 border-t">
              <Button variant="outline">Change Password</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
