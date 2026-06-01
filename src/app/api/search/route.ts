import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ subjects: [], papers: [] });
  }

  try {
    // Search Subjects
    const subjects = await prisma.subject.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { code: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        qualification: {
          include: { board: true }
        }
      },
      take: 10, // take a bit more so we can sort in memory
    });

    // Search Papers
    const papers = await prisma.paper.findMany({
      where: {
        OR: [
          { subject: { name: { contains: query, mode: "insensitive" } } },
          { subject: { code: { contains: query, mode: "insensitive" } } },
        ]
      },
      include: {
        subject: {
          include: { qualification: { include: { board: true } } }
        }
      },
      orderBy: [
        { year: "desc" },
        { season: "desc" }
      ],
      take: 20,
    });

    const queryParts = query.toLowerCase().split(/\s+/);
    let filteredPapers = papers;
    
    for (const part of queryParts) {
      if (part.match(/20\d\d/)) {
        filteredPapers = filteredPapers.filter(p => p.year.toString() === part);
      } else if (part.match(/p\d/)) {
        const num = part.replace('p', '');
        filteredPapers = filteredPapers.filter(p => p.paperNumber.toString() === num);
      }
    }

    // Read Ecosystem Preference Cookie for Boosting
    const cookieStore = await cookies();
    const prefCookie = cookieStore.get("examnest_ecosystem");
    let prefBoard = "";
    if (prefCookie) {
      try {
        const parsed = JSON.parse(prefCookie.value);
        prefBoard = parsed.board;
      } catch (e) {}
    }

    // Boost logic: Sort items so that the preferred board appears first
    const sortWithBoost = (a: any, b: any) => {
      if (!prefBoard) return 0;
      
      const aBoard = a.subject?.qualification?.board?.name || a.qualification?.board?.name;
      const bBoard = b.subject?.qualification?.board?.name || b.qualification?.board?.name;
      
      if (aBoard === prefBoard && bBoard !== prefBoard) return -1;
      if (bBoard === prefBoard && aBoard !== prefBoard) return 1;
      return 0;
    };

    const finalSubjects = subjects.sort(sortWithBoost).slice(0, 5);
    const finalPapers = filteredPapers.sort(sortWithBoost).slice(0, 5);

    return NextResponse.json({ 
      subjects: finalSubjects, 
      papers: finalPapers 
    });
  } catch (error: any) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
