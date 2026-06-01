"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProfile(name: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

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
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return { success: false, error: "Failed to update profile. Please try again." };
  }
}
