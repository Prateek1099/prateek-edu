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
      topics: {
        where: { status: "PUBLISHED" },
        orderBy: { sortOrder: 'asc' }
      },
      notes: {
        where: { isPublished: true },
        include: { topic: true },
        orderBy: [{ topicId: "asc" }, { title: "asc" }],
      },
      topicalQuestions: {
        where: { isPublished: true },
        include: { topic: true },
        orderBy: [{ topicId: "asc" }, { title: "asc" }],
      },
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

  return (
    <div className="relative isolate min-h-[calc(100vh-140px)]">
      {/* Subtle top ambient glow for dark theme */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-12 -z-10 mx-auto h-96 max-w-6xl overflow-hidden blur-3xl opacity-30 bg-gradient-to-b from-indigo-500/20 via-purple-600/10 to-transparent"
      />

      <div className="container px-4 md:px-8 py-10 md:py-12 max-w-6xl mx-auto">
        <Link href={`/resources/${board}/${qualification}`}>
          <Button variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to {subjectData.qualification.title} Subjects
          </Button>
        </Link>

        <div className="mb-8 flex items-center gap-4">
          <div className="bg-primary/10 border border-primary/20 p-3.5 rounded-2xl shadow-sm">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-1">{subjectData.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              {subjectData.code && (
                <span className="text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                  {subjectData.code}
                </span>
              )}
              <span className="text-sm text-muted-foreground font-medium">{subjectData.qualification.title} • {subjectData.qualification.board.title}</span>
            </div>
          </div>
        </div>

        <SubjectTabsClient
          topics={subjectData.topics}
          notes={subjectData.notes}
          topicals={subjectData.topicalQuestions.map((resource) => ({
            id: resource.id,
            title: resource.title,
            description: resource.description,
            hasSolutions: Boolean(resource.answersPdfUrl),
            topic: resource.topic
              ? { id: resource.topic.id, topicName: resource.topic.topicName }
              : null,
          }))}
          subject={{
            slug: subjectData.slug,
            name: subjectData.name,
            syllabusPdfUrl: subjectData.syllabusPdfUrl,
          }}
          challenges={subjectData.challenges}
          board={board}
          qualification={qualification}
        />
      </div>
    </div>
  );
}
