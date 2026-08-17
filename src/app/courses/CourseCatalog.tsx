"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CheckoutButton from "@/components/CheckoutButton";
import { ArrowRight, CheckCircle2 } from "lucide-react";

type Course = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  price: number;
  subject: {
    name: string;
    slug: string;
    qualification: {
      name: string;
      title: string;
      board: { name: string; title: string };
    };
  };
};

export function CourseCatalog({ courses, enrolledCourseIds }: { courses: Course[]; enrolledCourseIds: string[] }) {


  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => {
        const isEnrolled = enrolledCourseIds.includes(course.id);
        const isFree = course.price === 0;

        return (
          <Card key={course.id} className="flex flex-col overflow-hidden transition-all duration-200 hover:shadow-lg border border-border/80 rounded-2xl bg-card">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-3 mb-2">
                <Badge variant="secondary" className="bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15 rounded-lg text-xs font-semibold px-2.5 py-0.5">
                  {course.subject.name}
                </Badge>
                {isEnrolled && (
                  <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold gap-1">
                    <CheckCircle2 className="size-3" /> Enrolled
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg sm:text-xl font-bold line-clamp-2 leading-snug">{course.title}</CardTitle>
              <CardDescription className="text-xs font-medium text-muted-foreground mt-1">
                {course.subject.qualification.board.title} · {course.subject.qualification.title}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 pb-4">
              {course.shortDescription || course.description ? (
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {(course.shortDescription || course.description!).replace(/[#*`_]/g, '')}
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground italic">Comprehensive syllabus coverage and revision notes.</p>
              )}
            </CardContent>

            <CardFooter className="pt-0 flex flex-col gap-3.5">
              <div className="flex items-center justify-between w-full border-t border-border/60 pt-3 mt-auto">
                <div className="text-base sm:text-lg font-extrabold tracking-tight">
                  {isFree ? <span className="text-emerald-600 dark:text-emerald-400">Free</span> : `₹${course.price.toLocaleString("en-IN")}`}
                </div>
              </div>

              <div className="w-full flex gap-2">
                <Link
                  href={`/courses/${course.slug}`}
                  className="inline-flex flex-1 items-center justify-center rounded-xl text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm gap-1.5"
                >
                  <span>View Details</span>
                  <ArrowRight className="size-3.5" />
                </Link>

                {!isEnrolled && !isFree && (
                  <div className="w-32 [&>button]:rounded-xl [&>button]:h-10 [&>button]:text-sm [&>button]:font-semibold">
                    <CheckoutButton courseId={course.id} price={course.price} />
                  </div>
                )}
              </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
