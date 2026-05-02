import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, BookOpen } from "lucide-react";
import CheckoutButton from "@/components/CheckoutButton";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function CoursesPage() {
  const session = await getServerSession(authOptions);
  const courses = await prisma.course.findMany();
  
  let enrolledCourseIds: string[] = [];
  if (session?.user) {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: (session.user as any).id, paymentStatus: "completed" },
      select: { courseId: true }
    });
    enrolledCourseIds = enrollments.map((e: any) => e.courseId);
  }

  return (
    <div className="container px-4 py-12 max-w-7xl mx-auto space-y-8">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Premium <span className="text-primary">Courses</span>
        </h1>
        <p className="text-xl text-muted-foreground">
          Expert-led courses designed to help you ace your IGCSE, AS, and CBSE exams.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-xl border">
          <p className="text-muted-foreground">No courses available at the moment. Check back later!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
          {courses.map((course: any) => {
            const isEnrolled = enrolledCourseIds.includes(course.id);
            
            return (
              <Card key={course.id} className="flex flex-col overflow-hidden transition-all hover:shadow-md border-primary/10">
                <div className="h-40 bg-gradient-to-br from-primary/20 via-primary/5 to-background flex items-center justify-center p-6 text-center border-b">
                  <h3 className="text-2xl font-bold tracking-tight">{course.title}</h3>
                </div>
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">{course.level}</Badge>
                    <span className="text-sm font-medium text-muted-foreground">{course.subject}</span>
                  </div>
                  <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                  <CardDescription className="line-clamp-3 mt-2">{course.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <span>Comprehensive Syllabus Coverage</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Topic-wise Past Papers Included</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>Lifetime Access</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-4 pt-4 border-t bg-muted/10">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-muted-foreground line-through text-sm">₹{course.price * 1.5}</span>
                    <span className="text-2xl font-bold">₹{course.price}</span>
                  </div>
                  {isEnrolled ? (
                    <Link href="/dashboard" className="w-full">
                      <div className="w-full text-center py-2 bg-secondary text-secondary-foreground font-semibold rounded-md hover:bg-secondary/80 transition-colors">
                        Go to Dashboard
                      </div>
                    </Link>
                  ) : (
                    <CheckoutButton courseId={course.id} price={course.price} />
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
