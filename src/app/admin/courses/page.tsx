export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import AdminCoursesClient from "./AdminCoursesClient";

export default async function AdminCoursesPage() {
  const courses = await prisma.course.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return <AdminCoursesClient courses={courses} />;
}
