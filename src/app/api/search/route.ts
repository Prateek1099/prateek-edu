import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const rawQuery = new URL(request.url).searchParams.get("q")?.trim();
  if (!rawQuery) return NextResponse.json({ subjects: [] });

  try {
    const subjects = await prisma.subject.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { name: { contains: rawQuery, mode: "insensitive" } },
          { code: { contains: rawQuery, mode: "insensitive" } },
        ],
      },
      include: {
        qualification: { include: { board: true } },
      },
      take: 10,
    });

    const preference = (await cookies()).get("examnest_ecosystem")?.value;
    let preferredBoard = "";
    if (preference) {
      try {
        const parsed = JSON.parse(preference) as { board?: unknown };
        if (typeof parsed.board === "string") preferredBoard = parsed.board;
      } catch {
        // Ignore malformed preference cookies and use normal result ordering.
      }
    }

    const rankedSubjects = [...subjects]
      .sort((a, b) => {
        if (!preferredBoard) return 0;
        const aPreferred = a.qualification.board.name === preferredBoard;
        const bPreferred = b.qualification.board.name === preferredBoard;
        return Number(bPreferred) - Number(aPreferred);
      })
      .slice(0, 5);

    return NextResponse.json({ subjects: rankedSubjects });
  } catch (error) {
    console.error("Search API failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
