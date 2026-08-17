"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { KeyRound, Laptop, Loader2, Mail, Moon, ShieldCheck, Sun, Target, Upload, User } from "lucide-react";
import { changePassword, updateProfile } from "@/app/actions/settings";
import { setEcosystemPreference } from "@/app/actions/resources-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type SettingsUser = {
  name: string;
  email: string;
  image: string;
  preferredBoard: string;
  preferredQualification: string;
  emailVerified: boolean;
  createdAt: string;
  authProvider: string;
};

export default function SettingsClient({ user }: { user: SettingsUser }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.image);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [board, setBoard] = useState(user.preferredBoard);
  const [qualification, setQualification] = useState(user.preferredQualification);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const result = await updateProfile(name);
      if (!result.success) return toast.error(result.error || "Failed to update profile.");
      toast.success("Profile updated successfully.");
      router.refresh();
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      toast.error("Choose a JPG, PNG, or WebP image up to 2 MB.");
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const response = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to upload avatar.");
      setAvatarUrl(data.url);
      toast.success("Avatar updated successfully.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload avatar.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    try {
      await setEcosystemPreference(board, qualification);
      toast.success("Study preferences saved.");
      router.refresh();
    } catch {
      toast.error("Failed to save preferences.");
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleChangePassword = async () => {
    setIsChangingPassword(true);
    try {
      const result = await changePassword(currentPassword, newPassword, confirmPassword);
      if (!result.success) return toast.error(result.error || "Unable to change password.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      toast.success("Password changed successfully.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Profile Card */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2.5 text-lg font-bold">
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <User className="size-4" />
            </div>
            <span>Profile Information</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground">
            Manage your personal display name and avatar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border-2 border-primary/20 ring-2 ring-primary/10">
              <AvatarImage src={avatarUrl} alt="Your avatar" />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                <User className="size-8" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs sm:text-sm font-semibold">Avatar Photo</p>
              <p className="text-[11px] text-muted-foreground">JPG, PNG, or WebP up to 2 MB.</p>
              <Label
                htmlFor="avatar"
                className="mt-2 inline-flex cursor-pointer items-center text-xs font-semibold text-primary hover:underline"
              >
                <Upload className="mr-1 size-3.5" /> {isUploadingAvatar ? "Uploading..." : "Upload new avatar"}
              </Label>
              <Input
                id="avatar"
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                disabled={isUploadingAvatar}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                className="h-10 rounded-xl bg-background border-border/80 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="h-10 rounded-xl bg-muted/40 border-border/80 text-sm text-muted-foreground"
              />
              <p className="px-1 text-[11px] text-muted-foreground">Email cannot be changed currently.</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t border-border/60 bg-muted/10 px-6 py-4 rounded-b-2xl">
          <Button
            onClick={handleSaveProfile}
            disabled={isSavingProfile || name === user.name}
            className="rounded-xl text-xs sm:text-sm font-semibold shadow-sm"
          >
            {isSavingProfile && <Loader2 className="mr-2 size-3.5 animate-spin" />}
            Save profile changes
          </Button>
        </CardFooter>
      </Card>

      {/* Study Preferences */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2.5 text-lg font-bold">
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Target className="size-4" />
            </div>
            <span>Academic Ecosystem</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground">
            Set your default board and qualification to tailor your learning journey across Vexa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preferred Board</Label>
              <Select value={board} onValueChange={(value) => { setBoard(value || ""); setQualification(""); }}>
                <SelectTrigger className="h-10 rounded-xl bg-background border-border/80 text-sm">
                  <SelectValue placeholder="Select Board" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/80">
                  <SelectItem value="cambridge">Cambridge International</SelectItem>
                  <SelectItem value="cbse">CBSE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Qualification</Label>
              <Select value={qualification} onValueChange={(value) => setQualification(value || "")} disabled={!board}>
                <SelectTrigger className="h-10 rounded-xl bg-background border-border/80 text-sm">
                  <SelectValue placeholder="Select Qualification" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/80">
                  {board === "cambridge" ? (
                    <>
                      <SelectItem value="igcse">IGCSE</SelectItem>
                      <SelectItem value="o-level">O Level</SelectItem>
                      <SelectItem value="as-a-level">AS &amp; A Level</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="class-10">Class 10</SelectItem>
                      <SelectItem value="class-12">Class 12</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t border-border/60 bg-muted/10 px-6 py-4 rounded-b-2xl">
          <Button
            onClick={handleSavePreferences}
            disabled={isSavingPrefs || !board || !qualification}
            className="rounded-xl text-xs sm:text-sm font-semibold shadow-sm"
          >
            {isSavingPrefs && <Loader2 className="mr-2 size-3.5 animate-spin" />}
            Save academic preferences
          </Button>
        </CardFooter>
      </Card>

      {/* Appearance */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2.5 text-lg font-bold">
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Moon className="size-4" />
            </div>
            <span>Appearance &amp; Theme</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground">
            Customize how Vexa looks on your device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mounted ? (
            <div className="grid max-w-lg grid-cols-3 gap-3">
              {([['light', Sun, 'Light'], ['dark', Moon, 'Dark'], ['system', Laptop, 'System']] as const).map(([value, Icon, label]) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-2xl border p-4 transition-all duration-150 outline-none select-none cursor-pointer",
                    theme === value
                      ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                      : "border-border/80 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <Icon className="mb-2 size-5" />
                  <span className="text-xs sm:text-sm font-semibold">{label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid max-w-lg grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl border border-border/80 bg-muted/40" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2.5 text-lg font-bold">
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ShieldCheck className="size-4" />
            </div>
            <span>Security &amp; Account</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground">
            Review your authentication provider, verification status, and password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Verification</p>
              <div className="mt-1.5 flex items-center gap-2">
                <Mail className="size-4 text-primary" />
                <span className="text-xs sm:text-sm font-semibold">
                  {user.emailVerified ? (
                    <span className="text-emerald-600 dark:text-emerald-400">Verified ✓</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">Unverified</span>
                  )}
                </span>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Connected Provider</p>
              <div className="mt-1.5 flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <span className="text-xs sm:text-sm font-semibold">{user.authProvider}</span>
              </div>
            </div>
            <div className="sm:col-span-2 p-3.5 rounded-xl bg-muted/30 border border-border/60">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Member Since</p>
              <p className="mt-1 text-xs sm:text-sm font-semibold">
                {new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>

          {user.authProvider === "Credentials" && (
            <div className="space-y-4 border-t border-border/60 pt-5">
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-primary" />
                <p className="text-xs sm:text-sm font-bold">Change Password</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="current-password" className="text-xs font-bold text-muted-foreground">Current password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="h-10 rounded-xl bg-background border-border/80 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-xs font-bold text-muted-foreground">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    minLength={10}
                    className="h-10 rounded-xl bg-background border-border/80 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-xs font-bold text-muted-foreground">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={10}
                    className="h-10 rounded-xl bg-background border-border/80 text-sm"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">Use at least 10 characters, including uppercase, lowercase, and a number.</p>
              <Button
                variant="outline"
                onClick={handleChangePassword}
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="rounded-xl text-xs font-semibold h-9"
              >
                {isChangingPassword && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                Update password
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
