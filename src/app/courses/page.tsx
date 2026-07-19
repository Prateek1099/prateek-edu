import { getServerSession } from "next-auth";
import { BookOpen } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CourseCatalog, type CourseArea } from "./CourseCatalog";

export default async function CoursesPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const [courses, enrollments] = await Promise.all([
    prisma.course.findMany({
      include: { subject: { include: { qualification: { include: { board: true } } } } },
      orderBy: { title: "asc" },
    }),
    userId ? prisma.enrollment.findMany({ where: { userId }, select: { courseId: true } }) : Promise.resolve([]),
  ]);

  const areasBySubject = new Map<string, CourseArea>();
  for (const course of courses) {
    const subject = course.subject;
    const current = areasBySubject.get(subject.id) || {
      id: subject.id,
      name: subject.name,
      qualification: subject.qualification.title,
      board: subject.qualification.board.title,
      courses: [],
    };
    current.courses.push({
      id: course.id,
      title: course.title,
      description: course.description,
      resourceUrl: `/resources/${subject.qualification.board.name}/${subject.qualification.name}/${subject.slug}`,
    });
    areasBySubject.set(subject.id, current);
  }

  const areas = [...areasBySubject.values()];
  return <div className="container mx-auto max-w-7xl space-y-8 px-4 py-10 md:px-8"><div className="max-w-3xl space-y-3"><span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"><BookOpen className="h-4 w-4" /> Learning areas</span><h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Explore your courses</h1><p className="text-lg text-muted-foreground">Pick a subject area, start any course for free, and move directly into its resources and practice.</p></div>{areas.length === 0 ? <div className="rounded-xl border border-dashed bg-muted/20 py-20 text-center text-muted-foreground">No courses are available yet. Check back soon.</div> : <CourseCatalog areas={areas} enrolledCourseIds={enrollments.map((enrollment) => enrollment.courseId)} />}</div>;
}
