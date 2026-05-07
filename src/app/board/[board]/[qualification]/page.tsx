import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronRight, BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function QualificationPage({ params }: { params: Promise<{ board: string, qualification: string }> }) {
  const { board, qualification } = await params;
  
  const qualificationData = await prisma.qualification.findFirst({
    where: { 
      name: qualification,
      board: { name: board }
    },
    include: {
      board: true,
      subjects: {
        orderBy: { name: 'asc' }
      }
    },
  });

  if (!qualificationData) {
    notFound();
  }

  return (
    <div className="container px-4 md:px-8 py-12 max-w-6xl mx-auto min-h-[calc(100vh-140px)]">
      <Link href={`/board/${board}`}>
        <Button variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to {qualificationData.board.title}
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">{qualificationData.title} Subjects</h1>
        <p className="text-muted-foreground text-lg">Select a subject to view past papers, notes, and resources.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {qualificationData.subjects.map((subject) => (
          <Link key={subject.id} href={`/board/${board}/${qualification}/${subject.slug}`}>
            <Card className="hover:border-primary/50 transition-all hover:shadow-md h-full group bg-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="bg-primary/10 w-fit p-2 rounded-lg mb-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold line-clamp-2">{subject.name}</h2>
                    {subject.code && (
                      <span className="text-sm font-semibold text-primary/80 bg-primary/10 w-fit px-2 py-0.5 rounded-full mt-1">
                        {subject.code}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mt-2" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      
      {qualificationData.subjects.length === 0 && (
        <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground">No subjects found</h3>
          <p className="text-muted-foreground">Subjects for this qualification will be added soon.</p>
        </div>
      )}
    </div>
  );
}
