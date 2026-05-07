import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, LayoutGrid, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubjectTabs } from "./SubjectTabs"; // Client component for tabs

export default async function SubjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ board: string; qualification: string; subjectSlug: string }>;
}) {
  const { board, qualification, subjectSlug } = await params;

  const subjectData = await prisma.subject.findFirst({
    where: {
      slug: subjectSlug,
      qualification: {
        name: qualification,
        board: { name: board },
      },
    },
    include: {
      qualification: {
        include: { board: true },
      },
    },
  });

  if (!subjectData) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-background">
      {/* Subject Header */}
      <div className="bg-card border-b">
        <div className="container px-4 md:px-8 py-8 max-w-7xl mx-auto">
          <Link href={`/board/${board}/${qualification}`}>
            <Button variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to {subjectData.qualification.title}
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{subjectData.name}</h1>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className="font-semibold text-foreground/80 bg-muted px-2 py-0.5 rounded-md text-sm">
                  {subjectData.qualification.title}
                </span>
                {subjectData.code && (
                  <>
                    <span>•</span>
                    <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-md text-sm font-semibold">
                      {subjectData.code}
                    </span>
                  </>
                )}
                <span>•</span>
                <span>{subjectData.qualification.board.title}</span>
              </div>
            </div>
          </div>
          
          <SubjectTabs board={board} qualification={qualification} subjectSlug={subjectSlug} />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 container px-4 md:px-8 py-8 max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
}
