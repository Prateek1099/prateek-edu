import { prisma } from "@/lib/prisma";
import PapersClient from "./PapersClient";

export const dynamic = "force-dynamic"; // Ensure fresh data on reload

export default async function PastPapersPage() {
  const papers = await prisma.paper.findMany({
    orderBy: [
      { year: "desc" },
      { subject: "asc" },
      { paperNumber: "asc" }
    ]
  });

  return (
    <div className="w-full">
      <div className="bg-muted/20 border-b">
        <div className="container px-4 md:px-8 py-12 max-w-7xl mx-auto text-center space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
            Past Papers <span className="text-primary">Library</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Search, filter, and practice past papers with our side-by-side split view.
          </p>
        </div>
      </div>
      <PapersClient initialPapers={papers} />
    </div>
  );
}
