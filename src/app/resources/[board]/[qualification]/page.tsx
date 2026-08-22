import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientPreferenceSetter } from "./ClientPreferenceSetter";
import { publicMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ board: string; qualification: string }> }) {
  const { board, qualification } = await params;
  const data = await prisma.qualification.findFirst({
    where: { name: qualification, status: "PUBLISHED", board: { name: board, status: "PUBLISHED" } },
    select: { title: true, board: { select: { title: true } } },
  });
  if (!data) return { title: "Subject Resources" };
  return publicMetadata({
    title: `${data.title} Subject Resources`,
    description: `Explore ${data.title} subjects and structured learning resources for ${data.board.title}-focused study on Vexa.`,
    path: `/resources/${board}/${qualification}`,
  });
}

export default async function QualificationPage({ params }: { params: Promise<{ board: string, qualification: string }> }) {
  const { board, qualification } = await params;

  const qualificationData = await prisma.qualification.findFirst({
    where: {
      name: qualification,
      status: "PUBLISHED",
      board: { name: board, status: "PUBLISHED" }
    },
    include: {
      board: true,
      subjects: {
        where: { status: "PUBLISHED" },
        orderBy: { sortOrder: "asc" }
      }
    },
  });

  if (!qualificationData) {
    notFound();
  }

  return (
    <div className="relative container px-4 md:px-8 py-10 max-w-6xl mx-auto min-h-[calc(100vh-140px)]">
      <ClientPreferenceSetter board={board} qualification={qualification} />

      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-72 max-w-4xl overflow-hidden blur-3xl opacity-20 bg-gradient-to-b from-indigo-500/25 via-purple-600/15 to-transparent"
      />

      <Link href={`/resources/${board}`}>
        <Button variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground hover:text-foreground gap-1.5">
          <ArrowLeft className="size-4" /> Back to Qualifications
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">{qualificationData.title} Subjects</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Select a subject to view structured notes, topical questions, worksheets, and practice.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {qualificationData.subjects.map((subject) => (
          <Link key={subject.id} href={`/resources/${board}/${qualification}/${subject.slug}`} className="group block focus-visible:outline-none">
            <Card className="border border-border/80 hover:border-primary/50 transition-all duration-200 hover:shadow-lg h-full rounded-2xl bg-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-2 min-w-0">
                    <div className="bg-primary/10 border border-primary/20 size-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                      <BookOpen className="size-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold tracking-tight line-clamp-2">{subject.name}</h2>
                      {subject.code && (
                        <span className="inline-block text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full mt-2">
                          Code: {subject.code}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-2 shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {qualificationData.subjects.length === 0 && (
        <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed border-border/80">
          <BookOpen className="size-10 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-foreground">No subjects found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Subjects and revision materials for this qualification will appear here once published.</p>
        </div>
      )}
    </div>
  );
}
