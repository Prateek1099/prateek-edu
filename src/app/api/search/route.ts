import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q");

  if (!rawQuery || rawQuery.trim() === "") {
    return NextResponse.json({ subjects: [], papers: [] });
  }

  try {
    let query = rawQuery.toLowerCase().trim();

    // 1. Smart Query Parsing
    let parsedYear: number | undefined = undefined;
    let parsedSeason: string | undefined = undefined;
    let parsedPaperNumber: number | undefined = undefined;
    let parsedVariant: number | undefined = undefined;

    // --- Parse Season ---
    if (query.match(/\b(oct(ober)?\s*nov(ember)?|o\/?n|oct|nov)\b/)) {
      parsedSeason = "Oct/Nov";
      query = query.replace(/\b(oct(ober)?\s*nov(ember)?|o\/?n|oct|nov)\b/g, " ");
    } else if (query.match(/\b(may\s*june|m\/?j|may|june)\b/)) {
      parsedSeason = "May/June";
      query = query.replace(/\b(may\s*june|m\/?j|may|june)\b/g, " ");
    } else if (query.match(/\b(feb(ruary)?\s*march|f\/?m|feb|march)\b/)) {
      parsedSeason = "Feb/March";
      query = query.replace(/\b(feb(ruary)?\s*march|f\/?m|feb|march)\b/g, " ");
    }

    // --- Parse Year ---
    const yearMatch = query.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      parsedYear = parseInt(yearMatch[1]);
      query = query.replace(yearMatch[0], " ");
    } else {
      // Look for 2-digit years like '23' assuming 2000s
      const shortYearMatch = query.match(/\b([1-9]\d)\b/); // avoid matching paper 1, 2, 3 as years
      // Wait, let's only do short year if it's explicitly > 15 (e.g. 2015+) to avoid colliding with paper numbers
      const possibleYear = shortYearMatch ? parseInt(shortYearMatch[1]) : 0;
      if (possibleYear > 10 && possibleYear < 99) {
         parsedYear = 2000 + possibleYear;
         query = query.replace(shortYearMatch![0], " ");
      }
    }

    // --- Parse Paper & Variant ---
    // e.g. "paper 3", "p3", "paper3"
    const paperMatch = query.match(/\b(paper\s*|p)(\d)\b/);
    if (paperMatch) {
      parsedPaperNumber = parseInt(paperMatch[2]);
      query = query.replace(paperMatch[0], " ");
    }

    // e.g. "variant 2", "v2"
    const variantMatch = query.match(/\b(variant\s*|v)(\d)\b/);
    if (variantMatch) {
      parsedVariant = parseInt(variantMatch[2]);
      query = query.replace(variantMatch[0], " ");
    }

    // Combine paper and variant if written together like "32" meaning paper 3, variant 2
    if (!parsedPaperNumber && !parsedVariant) {
      const combinedMatch = query.match(/\b([1-9])([1-9])\b/);
      // Ensure it's not actually the subject code (if subject code is 4 digits, \b[1-9][1-9]\b won't match 4 digits)
      if (combinedMatch) {
        parsedPaperNumber = parseInt(combinedMatch[1]);
        parsedVariant = parseInt(combinedMatch[2]);
        query = query.replace(combinedMatch[0], " ");
      }
    }

    // The remaining query is assumed to be the subject (code or name)
    const subjectQuery = query.replace(/\s+/g, " ").trim();

    // 2. Query Subjects
    let subjects: any[] = [];
    if (subjectQuery) {
      subjects = await prisma.subject.findMany({
        where: {
          OR: [
            { name: { contains: subjectQuery, mode: "insensitive" } },
            { code: { contains: subjectQuery, mode: "insensitive" } },
          ],
        },
        include: {
          qualification: {
            include: { board: true }
          }
        },
        take: 10,
      });
    }

    // 3. Query Papers
    // Build dynamic where clause for papers
    const paperWhere: any = {};
    
    if (subjectQuery) {
      paperWhere.subject = {
        OR: [
          { name: { contains: subjectQuery, mode: "insensitive" } },
          { code: { contains: subjectQuery, mode: "insensitive" } },
        ]
      };
    }
    
    if (parsedYear) paperWhere.year = parsedYear;
    if (parsedSeason) paperWhere.season = parsedSeason;
    if (parsedPaperNumber) paperWhere.paperNumber = parsedPaperNumber;
    if (parsedVariant) paperWhere.variant = parsedVariant;

    // If absolutely nothing was parsed and no subject query remains, return empty
    if (Object.keys(paperWhere).length === 0) {
      return NextResponse.json({ subjects: [], papers: [] });
    }

    let papers = await prisma.paper.findMany({
      where: paperWhere,
      include: {
        subject: {
          include: { qualification: { include: { board: true } } }
        }
      },
      orderBy: [
        { year: "desc" },
        { season: "desc" },
        { paperNumber: "asc" },
        { variant: "asc" }
      ],
      take: 20,
    });

    // 4. Boost by Ecosystem Preference
    const cookieStore = await cookies();
    const prefCookie = cookieStore.get("examnest_ecosystem");
    let prefBoard = "";
    if (prefCookie) {
      try {
        const parsed = JSON.parse(prefCookie.value);
        prefBoard = parsed.board;
      } catch (e) {}
    }

    const sortWithBoost = (a: any, b: any) => {
      if (!prefBoard) return 0;
      
      const aBoard = a.subject?.qualification?.board?.name || a.qualification?.board?.name;
      const bBoard = b.subject?.qualification?.board?.name || b.qualification?.board?.name;
      
      if (aBoard === prefBoard && bBoard !== prefBoard) return -1;
      if (bBoard === prefBoard && aBoard !== prefBoard) return 1;
      return 0;
    };

    const finalSubjects = subjects.sort(sortWithBoost).slice(0, 5);
    const finalPapers = papers.sort(sortWithBoost).slice(0, 5);

    return NextResponse.json({ 
      subjects: finalSubjects, 
      papers: finalPapers 
    });
  } catch (error: any) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
