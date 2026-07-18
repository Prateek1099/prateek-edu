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

  return <div className="space-y-8 pb-12">
    <Card className="border-border/50 bg-card shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Profile</CardTitle><CardDescription>Manage your personal information and avatar.</CardDescription></CardHeader><CardContent className="space-y-6"><div className="flex items-center gap-4"><Avatar className="h-16 w-16 border"><AvatarImage src={avatarUrl} alt="Your avatar" /><AvatarFallback className="bg-primary/10 text-primary"><User className="h-8 w-8" /></AvatarFallback></Avatar><div><p className="text-sm font-medium">Avatar</p><p className="text-xs text-muted-foreground">JPG, PNG, or WebP up to 2 MB.</p><Label htmlFor="avatar" className="mt-2 inline-flex cursor-pointer items-center text-sm font-medium text-primary hover:underline"><Upload className="mr-1 h-4 w-4" /> {isUploadingAvatar ? "Uploading..." : "Upload new avatar"}</Label><Input id="avatar" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} disabled={isUploadingAvatar} /></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="name">Full Name</Label><Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></div><div className="space-y-2"><Label htmlFor="email">Email Address</Label><Input id="email" value={user.email} disabled className="bg-muted/50" /><p className="px-1 text-xs text-muted-foreground">Email cannot be changed currently.</p></div></div></CardContent><CardFooter className="border-t bg-muted/20 px-6 py-4"><Button onClick={handleSaveProfile} disabled={isSavingProfile || name === user.name}>{isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes</Button></CardFooter></Card>

    <Card className="border-border/50 bg-card shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Study Preferences</CardTitle><CardDescription>Set your default board and qualification to tailor your learning journey.</CardDescription></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Preferred Board</Label><Select value={board} onValueChange={(value) => { setBoard(value || ""); setQualification(""); }}><SelectTrigger><SelectValue placeholder="Select Board" /></SelectTrigger><SelectContent><SelectItem value="cambridge">Cambridge International</SelectItem><SelectItem value="cbse">CBSE</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Qualification</Label><Select value={qualification} onValueChange={(value) => setQualification(value || "")} disabled={!board}><SelectTrigger><SelectValue placeholder="Select Qualification" /></SelectTrigger><SelectContent>{board === "cambridge" ? <><SelectItem value="igcse">IGCSE</SelectItem><SelectItem value="o-level">O Level</SelectItem><SelectItem value="as-a-level">AS &amp; A Level</SelectItem></> : <><SelectItem value="class-10">Class 10</SelectItem><SelectItem value="class-12">Class 12</SelectItem></>}</SelectContent></Select></div></div></CardContent><CardFooter className="border-t bg-muted/20 px-6 py-4"><Button onClick={handleSavePreferences} disabled={isSavingPrefs || !board || !qualification}>{isSavingPrefs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save preferences</Button></CardFooter></Card>

    <Card className="border-border/50 bg-card shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><Moon className="h-5 w-5 text-primary" /> Appearance</CardTitle><CardDescription>Customize how Vexa looks on your device.</CardDescription></CardHeader><CardContent>{mounted ? <div className="grid max-w-lg grid-cols-3 gap-4">{([['light', Sun, 'Light'], ['dark', Moon, 'Dark'], ['system', Laptop, 'System']] as const).map(([value, Icon, label]) => <button key={value} onClick={() => setTheme(value)} className={`flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all ${theme === value ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}><Icon className="mb-2 h-6 w-6" /><span className="text-sm font-medium">{label}</span></button>)}</div> : <div className="grid max-w-lg grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-xl border-2 border-border bg-muted/50" />)}</div>}</CardContent></Card>

    <Card className="border-border/50 bg-card shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Security</CardTitle><CardDescription>Review your account security and connected providers.</CardDescription></CardHeader><CardContent className="space-y-6"><div className="grid gap-6 sm:grid-cols-2"><div><p className="text-sm font-medium text-muted-foreground">Email Verification</p><div className="mt-1 flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /><span className="font-medium">{user.emailVerified ? "Verified" : "Unverified"}</span></div></div><div><p className="text-sm font-medium text-muted-foreground">Connected Provider</p><div className="mt-1 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /><span className="font-medium">{user.authProvider}</span></div></div><div className="sm:col-span-2"><p className="text-sm font-medium text-muted-foreground">Member Since</p><p className="mt-1 font-medium">{new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p></div></div>{user.authProvider === "Credentials" && <div className="space-y-4 border-t pt-5"><div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /><p className="font-medium">Change password</p></div><div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label htmlFor="current-password">Current password</Label><Input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={10} /></div><div className="space-y-2"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={10} /></div></div><p className="text-xs text-muted-foreground">Use at least 10 characters, including uppercase, lowercase, and a number.</p><Button variant="outline" onClick={handleChangePassword} disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}>{isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Change password</Button></div>}</CardContent></Card>
  </div>;
}
