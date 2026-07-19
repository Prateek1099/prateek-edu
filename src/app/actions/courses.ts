"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function enrollInFreeCourse(courseId: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { success: false, error: "Please log in to start this course." };

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
  if (!course) return { success: false, error: "Course not found." };

  const existingEnrollment = await prisma.enrollment.findFirst({
    where: { userId, courseId },
    select: { id: true },
  });
  if (existingEnrollment) {
    await prisma.enrollment.update({ where: { id: existingEnrollment.id }, data: { paymentStatus: "completed" } });
  } else {
    await prisma.enrollment.create({ data: { userId, courseId, paymentStatus: "completed" } });
  }
  revalidatePath("/courses");
  revalidatePath("/dashboard");
  return { success: true };
}
