"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BarChart3, Code2, Layers3, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { enrollInFreeCourse } from "@/app/actions/courses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Course = { id: string; title: string; description: string | null; resourceUrl: string };
export type CourseArea = { id: string; name: string; qualification: string; board: string; courses: Course[] };

const AREA_STYLES = [
  { icon: BarChart3, className: "from-violet-600/25 via-violet-500/10 to-transparent border-violet-500/25", iconClass: "text-violet-500" },
  { icon: Code2, className: "from-blue-600/25 via-blue-500/10 to-transparent border-blue-500/25", iconClass: "text-blue-500" },
  { icon: Layers3, className: "from-amber-600/25 via-amber-500/10 to-transparent border-amber-500/25", iconClass: "text-amber-500" },
];

export function CourseCatalog({ areas, enrolledCourseIds }: { areas: CourseArea[]; enrolledCourseIds: string[] }) {
  const router = useRouter();
  const [expandedAreaIds, setExpandedAreaIds] = useState<string[]>([]);
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const startCourse = (course: Course) => {
    setPendingCourseId(course.id);
    startTransition(async () => {
      const result = await enrollInFreeCourse(course.id);
      setPendingCourseId(null);
      if (!result.success) {
        toast.error(result.error || "Unable to start this course.");
        return;
      }
      toast.success("Course added to your learning journey.");
      router.push(course.resourceUrl);
      router.refresh();
    });
  };

  return <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{areas.map((area, index) => {
    const style = AREA_STYLES[index % AREA_STYLES.length];
    const Icon = style.icon;
    const expanded = expandedAreaIds.includes(area.id);
    const visibleCourses = expanded ? area.courses : area.courses.slice(0, 3);
    const remainingCourses = area.courses.length - visibleCourses.length;
    return <Card key={area.id} className={`group overflow-hidden border bg-gradient-to-br transition-all hover:-translate-y-0.5 hover:shadow-lg ${style.className}`}><CardHeader className="space-y-4"><div className="flex items-start justify-between gap-4"><div className="rounded-xl border bg-background/30 p-3 backdrop-blur-sm"><Icon className={`h-7 w-7 ${style.iconClass}`} /></div><span className="rounded-full bg-background/35 px-2.5 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">{area.qualification}</span></div><div><CardTitle className="text-xl">{area.name}</CardTitle><CardDescription className="mt-1">{area.board} · {area.courses.length} {area.courses.length === 1 ? "course" : "courses"}</CardDescription></div></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-2">{visibleCourses.map((course) => { const isEnrolled = enrolledCourseIds.includes(course.id); return <button key={course.id} type="button" onClick={() => isEnrolled ? router.push(course.resourceUrl) : startCourse(course)} disabled={isPending} title={course.description || course.title} className="rounded-full border border-background/35 bg-background/30 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-background/55 disabled:cursor-wait disabled:opacity-60">{pendingCourseId === course.id ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : <>{course.title}{isEnrolled && " ✓"}</>}</button>; })}</div>{remainingCourses > 0 && <Button variant="secondary" size="sm" className="w-full bg-background/25 hover:bg-background/50" onClick={() => setExpandedAreaIds((ids) => [...ids, area.id])}>+ {remainingCourses} more</Button>}{expanded && area.courses.length > 3 && <Button variant="ghost" size="sm" className="w-full" onClick={() => setExpandedAreaIds((ids) => ids.filter((id) => id !== area.id))}>Show less</Button>}<div className="flex items-center justify-between border-t border-background/20 pt-3"><span className="flex items-center gap-1.5 text-sm font-medium"><Sparkles className="h-4 w-4 text-emerald-500" /> Free access</span><Link href={area.courses[0].resourceUrl} className="text-sm font-medium text-primary hover:underline">Open subject</Link></div></CardContent></Card>;
  })}</div>;
}
