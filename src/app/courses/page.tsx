import { getServerSession } from "next-auth";
import { BookOpen } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getCompletedCourseIds } from "@/lib/course-entitlements";
import { prisma } from "@/lib/prisma";
import { CourseCatalog } from "./CourseCatalog";

export default async function CoursesPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  
  const [courses, enrollments] = await Promise.all([
    prisma.course.findMany({
      where: { isPublished: true },
      include: { subject: { include: { qualification: { include: { board: true } } } } },
      orderBy: { title: "asc" },
    }),
    userId ? getCompletedCourseIds(userId) : Promise.resolve([]),
  ]);

  const enrolledCourseIds = enrollments;

  return (
    <div className="container mx-auto max-w-7xl space-y-8 px-4 py-10 md:px-8">
      <div className="max-w-3xl space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          <BookOpen className="h-4 w-4" /> Course Catalog
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Explore your courses</h1>
        <p className="text-lg text-muted-foreground">
          Discover courses, start learning instantly, and dive into comprehensive resources.
        </p>
      </div>
      
      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 py-20 text-center text-muted-foreground">
          No courses are available yet. Check back soon.
        </div>
      ) : (
        <CourseCatalog courses={courses} enrolledCourseIds={enrolledCourseIds} />
      )}
    </div>
  );
}
