import { getServerSession } from "next-auth";
import { BookOpen } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getCompletedCourseIds } from "@/lib/course-entitlements";
import { prisma } from "@/lib/prisma";
import { CourseCatalog } from "./CourseCatalog";
import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata({
  title: "Courses",
  description: "Explore Vexa's published courses and structured learning material for supported CBSE and Cambridge-focused school subjects.",
  path: "/courses",
});

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
    <div className="relative container mx-auto max-w-7xl space-y-8 px-4 py-10 md:px-8 min-h-[calc(100vh-140px)]">
      {/* Ambient top glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-72 max-w-5xl overflow-hidden blur-3xl opacity-20 bg-gradient-to-b from-indigo-500/25 via-purple-600/15 to-transparent"
      />

      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1 text-xs font-semibold text-primary">
          <BookOpen className="size-3.5" />
          <span>Course Catalog</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">Explore your courses</h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          Discover structured courses, start learning instantly, and dive into high-yield exam preparation.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 py-20 text-center text-muted-foreground">
          <BookOpen className="size-10 mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-foreground mb-1">No courses available yet</h3>
          <p className="text-xs text-muted-foreground">Check back soon for new course offerings.</p>
        </div>
      ) : (
        <CourseCatalog courses={courses} enrolledCourseIds={enrolledCourseIds} />
      )}
    </div>
  );
}
