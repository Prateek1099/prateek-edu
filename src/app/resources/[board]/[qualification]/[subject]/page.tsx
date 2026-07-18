import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SubjectTabsClient from "./SubjectTabsClient";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";

export default async function SubjectDashboardPage({ params }: { params: Promise<{ board: string, qualification: string, subject: string }> }) {
  const { board, qualification, subject } = await params;
  
  const subjectData = await prisma.subject.findFirst({
    where: { 
      slug: subject,
      status: "PUBLISHED",
      qualification: {
        name: qualification,
        status: "PUBLISHED",
        board: { name: board, status: "PUBLISHED" }
      }
    },
    include: {
      qualification: { include: { board: true } },
      papers: {
        orderBy: [
          { year: 'desc' },
          { season: 'desc' },
          { paperNumber: 'asc' },
          { variant: 'asc' }
        ]
      },
      topics: {
        where: { status: "PUBLISHED" },
        orderBy: { sortOrder: 'asc' }
      },
      notes: true,
      challenges: {
        where: { 
          isPublished: true,
          workspaceId: null // Critical: Only fetch global Vexa challenges
        },
        include: {
          topic: true,
          _count: { select: { questions: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    }
  });

  if (!subjectData) {
    notFound();
  }

  // Group papers by Year -> Season
  // e.g., { "2023": { "May/June": [paper1, paper2] } }
  const papersByYear: Record<number, Record<string, any[]>> = {};
  
  subjectData.papers.forEach((paper) => {
    if (!papersByYear[paper.year]) {
      papersByYear[paper.year] = {};
    }
    const season = paper.season || "Other";
    if (!papersByYear[paper.year][season]) {
      papersByYear[paper.year][season] = [];
    }
    papersByYear[paper.year][season].push(paper);
  });

  return (
    <div className="container px-4 md:px-8 py-12 max-w-6xl mx-auto min-h-[calc(100vh-140px)]">
      <Link href={`/resources/${board}/${qualification}`}>
        <Button variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to {subjectData.qualification.title} Subjects
        </Button>
      </Link>

      <div className="mb-8 flex items-center gap-4">
        <div className="bg-primary/10 p-4 rounded-xl">
          <BookOpen className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-1">{subjectData.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            {subjectData.code && (
              <span className="text-sm font-semibold text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full">
                {subjectData.code}
              </span>
            )}
            <span className="text-sm text-muted-foreground font-medium">{subjectData.qualification.title} • {subjectData.qualification.board.title}</span>
          </div>
        </div>
      </div>

      <SubjectTabsClient 
        papersByYear={papersByYear}
        topics={subjectData.topics}
        notes={subjectData.notes}
        subject={subjectData}
        challenges={subjectData.challenges}
        board={board}
        qualification={qualification}
      />
    </div>
  );
}

