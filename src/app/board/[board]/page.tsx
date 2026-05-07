import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronRight, GraduationCap } from "lucide-react";

export default async function BoardPage({ params }: { params: Promise<{ board: string }> }) {
  const { board } = await params;
  
  const boardData = await prisma.board.findUnique({
    where: { name: board },
    include: {
      qualifications: true,
    },
  });

  if (!boardData) {
    notFound();
  }

  return (
    <div className="container px-4 md:px-8 py-12 max-w-6xl mx-auto min-h-[calc(100vh-140px)]">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">{boardData.title}</h1>
        <p className="text-muted-foreground text-lg">Select a qualification to continue</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {boardData.qualifications.map((qual) => (
          <Link key={qual.id} href={`/board/${board}/${qual.name}`}>
            <Card className="hover:border-primary/50 transition-all hover:shadow-md h-full group bg-card">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-xl group-hover:scale-110 transition-transform">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{qual.title}</h2>
                    <p className="text-sm text-muted-foreground">{qual.name.toUpperCase()}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
