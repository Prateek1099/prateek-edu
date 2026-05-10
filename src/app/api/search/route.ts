import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ subjects: [], papers: [] });
  }

  try {
    // 1. Search Subjects (e.g. "Computer Science", "0478")
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
      take: 5,
    });

    // 2. Search Papers (e.g. "0478 2023", "0478 p2")
    // Very simple heuristic search: just check if subject matches or year string matches
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
      take: 10,
    });

    // We can manually filter papers down based on year / paper number if present in query string
    const queryParts = query.toLowerCase().split(/\s+/);
    let filteredPapers = papers;
    
    // Simple filter to check if query contains year or paper number
    for (const part of queryParts) {
      if (part.match(/20\d\d/)) {
        filteredPapers = filteredPapers.filter(p => p.year.toString() === part);
      } else if (part.match(/p\d/)) {
        const num = part.replace('p', '');
        filteredPapers = filteredPapers.filter(p => p.paperNumber.toString() === num);
      }
    }

    return NextResponse.json({ 
      subjects, 
      papers: filteredPapers.slice(0, 5) 
    });
  } catch (error: any) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
