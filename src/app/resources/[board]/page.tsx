import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, ArrowLeft, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ board: string }> }) {
  const { board } = await params;
  const boardData = await prisma.board.findUnique({ where: { name: board }, select: { title: true, status: true } });
  if (!boardData || boardData.status !== "PUBLISHED") return { title: "Learning Resources" };
  return publicMetadata({
    title: `${boardData.title} Learning Resources`,
    description: `Browse Vexa's ${boardData.title}-focused qualifications, subjects, notes, worksheets, topical questions, and practice resources.`,
    path: `/resources/${board}`,
  });
}

export default async function BoardQualificationSelection({
  params,
}: {
  params: Promise<{ board: string }>;
}) {
  const { board } = await params;

  const boardData = await prisma.board.findUnique({
    where: { name: board, status: "PUBLISHED" },
    include: {
      qualifications: {
        where: { status: "PUBLISHED" },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!boardData) {
    notFound();
  }

  return (
    <div className="relative container px-4 md:px-8 py-10 max-w-4xl mx-auto min-h-[calc(100vh-140px)]">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-72 max-w-3xl overflow-hidden blur-3xl opacity-20 bg-gradient-to-b from-indigo-500/25 via-purple-600/15 to-transparent"
      />

      <Link href="/resources">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 -ml-2 text-muted-foreground hover:text-foreground gap-1.5"
        >
          <ArrowLeft className="size-4" /> Back to Ecosystem
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">{boardData.title} Qualifications</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Select your qualification level to view available subjects and study material.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {boardData.qualifications.map((q) => (
          <Link
            key={q.id}
            href={`/resources/${boardData.name}/${q.name}`}
            className="group block focus-visible:outline-none"
          >
            <Card className="h-full border border-border/80 hover:border-primary/50 transition-all duration-200 hover:shadow-lg rounded-2xl bg-card">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <GraduationCap className="size-5 text-primary" />
                  </div>
                  <span className="text-base sm:text-lg font-bold tracking-tight truncate">{q.title}</span>
                </div>
                <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
