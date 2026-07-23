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
    <div className="container mx-auto max-w-6xl space-y-12 px-4 py-8 md:px-8">
      {/* Back link */}
      <div>
        <Link href="/courses" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-3 -ml-3 text-muted-foreground">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Catalog
        </Link>
      </div>

      <div className="grid gap-12 lg:grid-cols-3">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-10">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {course.subject.name}
              </Badge>
              <Badge variant="outline" className="text-muted-foreground">
                {course.subject.qualification.board.title}
              </Badge>
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
              {course.title}
            </h1>
            
            {course.shortDescription && (
              <p className="text-xl text-muted-foreground leading-relaxed">
                {course.shortDescription}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground pt-4">
              {course.instructorName && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>By <span className="font-medium text-foreground">{course.instructorName}</span></span>
                </div>
              )}
              {course.level && (
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  <span>{course.level}</span>
                </div>
              )}
              {course.language && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>{course.language}</span>
                </div>
              )}
            </div>
          </div>

          {/* What you'll learn */}
          {learningOutcomes.length > 0 && (
            <Card className="border-border/60 bg-muted/20">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-xl font-bold mb-6">What you&apos;ll learn</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {learningOutcomes.map((outcome, i) => (
                    <div key={i} className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                      <span className="text-sm leading-relaxed">{outcome}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {course.description && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">Course Description</h2>
              <div className="prose prose-slate dark:prose-invert max-w-none">
                {course.description.split('\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </div>
          )}

          {/* Requirements & Target Audience */}
          <div className="space-y-8 pt-4">
            {requirements.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Requirements</h2>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  {requirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {course.targetAudience && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Who this course is for</h2>
                <p className="text-muted-foreground">{course.targetAudience}</p>
              </div>
            )}
          </div>

          {/* Clean Curriculum Section (Per Requirements) */}
          <div className="space-y-4 pt-4 border-t">
            <h2 className="text-2xl font-bold tracking-tight">Course Curriculum</h2>
            <div className="rounded-xl border border-dashed bg-muted/20 py-12 text-center text-muted-foreground">
              <GraduationCap className="mx-auto h-8 w-8 mb-3 opacity-50" />
              <p>Course curriculum will appear here once lessons are added.</p>
            </div>
          </div>
        </div>

        {/* Sidebar / Floating Card */}
        <div className="relative">
          <div className="sticky top-24">
            <Card className="overflow-hidden border-border/80 shadow-lg">
              {course.imageUrl ? (
                <div className="aspect-video w-full bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={course.imageUrl} alt={course.title} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-primary/40" />
                </div>
              )}
              
              <CardContent className="p-6 space-y-6">
                <div className="text-3xl font-extrabold tracking-tight">
                  {isFree ? "Free" : `₹${course.price.toLocaleString("en-IN")}`}
                </div>

                <div className="space-y-3">
                  {isEnrolled ? (
                    <Link href={resourceUrl} className="inline-flex w-full items-center justify-center rounded-md text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-4 py-2">
                      <PlayCircle className="mr-2 h-5 w-5" /> Continue Learning
                    </Link>
                  ) : isFree ? (
                    <form action={async () => {
                      "use server";
                      const { enrollInFreeCourse } = await import("@/app/actions/courses");
                      const { redirect } = await import("next/navigation");
                      await enrollInFreeCourse(course.id);
                      redirect(resourceUrl);
                    }}>
                      <Button type="submit" className="w-full font-medium h-12 text-base" variant="default">
                        <BookOpen className="mr-2 h-5 w-5" /> Enroll Now
                      </Button>
                    </form>
                  ) : (
                    <div className="w-full [&>button]:w-full [&>button]:h-12 [&>button]:text-base">
                      <CheckoutButton courseId={course.id} price={course.price} />
                    </div>
                  )}
                </div>

                <div className="text-center text-xs text-muted-foreground">
                  {isEnrolled ? "You are already enrolled in this course." : "30-Day Money-Back Guarantee"}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
