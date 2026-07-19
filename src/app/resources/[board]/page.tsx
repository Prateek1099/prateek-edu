import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="container px-4 md:px-8 py-12 max-w-4xl mx-auto min-h-[calc(100vh-140px)]">
      <Link href="/resources">
        <Button 
          variant="ghost" 
          className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Ecosystem
        </Button>
      </Link>

      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-4">{boardData.title} Qualifications</h1>
        <p className="text-muted-foreground text-lg">
          Select your level to continue into your customized academic dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {boardData.qualifications.map((q) => (
          <Link 
            key={q.id} 
            href={`/resources/${boardData.name}/${q.name}`}
          >
            <Card className="h-full hover:border-primary transition-all hover:shadow-md group bg-card">
              <CardContent className="p-6 flex items-center justify-between">
                <span className="text-xl font-bold">{q.title}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
