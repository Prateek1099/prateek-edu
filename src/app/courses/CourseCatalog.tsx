"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, ArrowRight, PlayCircle, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { enrollInFreeCourse } from "@/app/actions/courses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CheckoutButton from "@/components/CheckoutButton";

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
  const router = useRouter();

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => {
        const isEnrolled = enrolledCourseIds.includes(course.id);
        const isFree = course.price === 0;

        return (
          <Card key={course.id} className="flex flex-col overflow-hidden transition-all hover:shadow-md border-border/80 bg-background/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start gap-4 mb-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 rounded-md">
                  {course.subject.name}
                </Badge>
                {isEnrolled && (
                  <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/20">
                    Enrolled
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl line-clamp-2 leading-tight">{course.title}</CardTitle>
              <CardDescription className="text-xs font-medium">
                {course.subject.qualification.board.title} · {course.subject.qualification.title}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 pb-4">
              {course.shortDescription || course.description ? (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {(course.shortDescription || course.description!).replace(/[#*`_]/g, '')}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No description available.</p>
              )}
            </CardContent>
            
            <CardFooter className="pt-0 flex flex-col gap-4">
              <div className="flex items-center justify-between w-full border-t border-border/50 pt-4 mt-auto">
                <div className="text-lg font-bold">
                  {isFree ? "Free" : `₹${course.price.toLocaleString("en-IN")}`}
                </div>
              </div>
              
              <div className="w-full flex gap-2">
                <Link 
                  href={`/courses/${course.slug}`}
                  className="inline-flex flex-1 items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                  View Details
                </Link>
                
                {!isEnrolled && !isFree && (
                  <div className="w-32">
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
