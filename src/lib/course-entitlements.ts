import "server-only";

import { prisma } from "@/lib/prisma";

export async function hasCompletedCourseEnrollment(userId: string, courseId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId,
      courseId,
      paymentStatus: "completed",
    },
    select: { id: true },
  });

  return enrollment !== null;
}

export async function getCompletedCourseIds(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId, paymentStatus: "completed" },
    select: { courseId: true },
  });

  return enrollments.map((enrollment) => enrollment.courseId);
}
