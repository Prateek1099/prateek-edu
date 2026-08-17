import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasCompletedCourseEnrollment } from "@/lib/course-entitlements";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Globe,
  GraduationCap,
  Layers,
  PlayCircle,
  User
} from "lucide-react";
import CheckoutButton from "@/components/CheckoutButton";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      subject: {
        include: {
          qualification: {
            include: { board: true },
          },
        },
      },
    },
  });

  if (!course || !course.isPublished) {
    notFound();
  }

  const isFree = course.price === 0;

  let isEnrolled = false;
  if (userId) {
    isEnrolled = await hasCompletedCourseEnrollment(userId, course.id);
  }

  const resourceUrl = `/resources/${course.subject.qualification.board.name}/${course.subject.qualification.name}/${course.subject.slug}`;

  // Parse list fields (split by newlines if they exist)
  const learningOutcomes = course.learningOutcomes?.split('\n').filter(Boolean) || [];
  const requirements = course.requirements?.split('\n').filter(Boolean) || [];

  return (
    <div className="relative container mx-auto max-w-6xl space-y-10 px-4 py-8 md:px-8 min-h-[calc(100vh-140px)]">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-72 max-w-4xl overflow-hidden blur-3xl opacity-20 bg-gradient-to-b from-indigo-500/25 via-purple-600/15 to-transparent"
      />

      {/* Back link */}
      <div>
        <Link href="/courses" className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-3 -ml-3 text-muted-foreground gap-1.5">
          <ChevronLeft className="size-4" />
          <span>Back to Catalog</span>
        </Link>
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 border border-primary/20 text-primary rounded-lg text-xs font-semibold px-2.5 py-0.5">
                {course.subject.name}
              </Badge>
              <Badge variant="outline" className="text-muted-foreground rounded-lg text-xs font-medium px-2.5 py-0.5">
                {course.subject.qualification.board.title}
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              {course.title}
            </h1>

            {course.shortDescription && (
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                {course.shortDescription}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm text-muted-foreground pt-2">
              {course.instructorName && (
                <div className="flex items-center gap-2">
                  <User className="size-4 text-primary" />
                  <span>By <span className="font-semibold text-foreground">{course.instructorName}</span></span>
                </div>
              )}
              {course.level && (
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  <span>{course.level}</span>
                </div>
              )}
              {course.language && (
                <div className="flex items-center gap-2">
                  <Globe className="size-4 text-primary" />
                  <span>{course.language}</span>
                </div>
              )}
            </div>
          </div>

          {/* What you'll learn */}
          {learningOutcomes.length > 0 && (
            <Card className="border border-border/80 rounded-2xl bg-card">
              <CardContent className="p-6 sm:p-7">
                <h2 className="text-lg font-bold mb-4">What you&apos;ll learn</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {learningOutcomes.map((outcome, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm leading-relaxed text-foreground/90">{outcome}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {course.description && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight">Course Description</h2>
              <div className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground text-sm sm:text-base leading-relaxed space-y-3">
                {course.description.split('\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </div>
          )}

          {/* Requirements & Target Audience */}
          <div className="space-y-6 pt-2">
            {requirements.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl font-bold">Requirements</h2>
                <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground text-sm">
                  {requirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            {course.targetAudience && (
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Who this course is for</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">{course.targetAudience}</p>
              </div>
            )}
          </div>

          {/* Clean Curriculum Section */}
          <div className="space-y-3 pt-4 border-t border-border/60">
            <h2 className="text-xl font-bold tracking-tight">Course Curriculum</h2>
            <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 py-10 text-center text-muted-foreground">
              <GraduationCap className="mx-auto size-8 mb-2 opacity-50 text-primary" />
              <p className="text-sm font-medium text-foreground">Course curriculum and modules</p>
              <p className="text-xs text-muted-foreground mt-0.5">Full modular video lessons and worksheets are available upon course access.</p>
            </div>
          </div>
        </div>

        {/* Sidebar / Floating Card */}
        <div className="relative">
          <div className="sticky top-24">
            <Card className="overflow-hidden border border-border/80 shadow-xl rounded-2xl bg-card">
              {course.imageUrl ? (
                <div className="aspect-video w-full bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={course.imageUrl} alt={course.title} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video w-full bg-gradient-to-br from-primary/15 via-primary/5 to-transparent flex items-center justify-center">
                  <BookOpen className="size-12 text-primary/40" />
                </div>
              )}

              <CardContent className="p-6 space-y-5">
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {isFree ? <span className="text-emerald-600 dark:text-emerald-400">Free</span> : `₹${course.price.toLocaleString("en-IN")}`}
                </div>

                <div className="space-y-2.5">
                  {isEnrolled ? (
                    <Link href={resourceUrl} className="inline-flex w-full items-center justify-center rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-4 py-2 shadow-sm gap-2">
                      <PlayCircle className="size-4" /> Continue Learning
                    </Link>
                  ) : isFree ? (
                    <form action={async () => {
                      "use server";
                      const { enrollInFreeCourse } = await import("@/app/actions/courses");
                      const { redirect } = await import("next/navigation");
                      await enrollInFreeCourse(course.id);
                      redirect(resourceUrl);
                    }}>
                      <Button type="submit" className="w-full font-semibold h-11 text-sm rounded-xl gap-2 shadow-sm" variant="default">
                        <BookOpen className="size-4" /> Enroll Now
                      </Button>
                    </form>
                  ) : (
                    <div className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:font-semibold [&>button]:rounded-xl">
                      <CheckoutButton courseId={course.id} price={course.price} />
                    </div>
                  )}
                </div>

                <div className="text-center text-xs text-muted-foreground font-medium">
                  {isEnrolled ? "You have full access to this course." : "30-Day Money-Back Guarantee"}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
