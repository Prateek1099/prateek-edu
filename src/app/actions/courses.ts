"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function enrollInFreeCourse(courseId: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { success: false, error: "Please log in to start this course." };

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, price: true, isPublished: true },
  });
  if (!course) return { success: false, error: "Course not found." };
  if (!course.isPublished) return { success: false, error: "Course is not available." };
  if (course.price !== 0) {
    return { success: false, error: "Paid courses require a verified payment." };
  }

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId, paymentStatus: "completed" },
    update: { paymentStatus: "completed" },
  });
  revalidatePath("/courses");
  revalidatePath("/dashboard");
  return { success: true };
}
