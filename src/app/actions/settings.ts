"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { validatePassword } from "@/lib/passwords";

export async function updateProfile(name: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    if (!name || name.trim() === "") {
      return { success: false, error: "Name cannot be empty" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    
    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating profile:", error);
    return { success: false, error: "Failed to update profile. Please try again." };
  }
}

export async function changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { success: false, error: "Unauthorized" };
  if (newPassword !== confirmPassword) return { success: false, error: "New passwords do not match." };

  const passwordError = validatePassword(newPassword);
  if (passwordError) return { success: false, error: passwordError };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
  if (!user?.password) return { success: false, error: "This account uses an external sign-in provider." };

  const currentPasswordMatches = await bcrypt.compare(currentPassword, user.password);
  if (!currentPasswordMatches) return { success: false, error: "Your current password is incorrect." };

  await prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(newPassword, 12) } });
  return { success: true };
}
