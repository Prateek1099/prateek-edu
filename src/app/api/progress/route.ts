import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const paperId = searchParams.get("paperId");

    if (!paperId) {
      return NextResponse.json({ error: "Paper ID is required" }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const progress = await prisma.userProgress.findUnique({
      where: {
        userId_paperId: {
          userId,
          paperId,
        },
      },
    });

    return NextResponse.json({ status: progress?.status || "not_started" });
  } catch (error) {
    console.error("Progress GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { paperId, status } = body;

    if (!paperId) {
      return NextResponse.json({ error: "Paper ID is required" }, { status: 400 });
    }

    let existing = await prisma.userProgress.findFirst({
        where: { userId, paperId }
    });

    let progress;
    if (existing) {
        progress = await prisma.userProgress.update({
            where: { id: existing.id },
            data: {
                status: status !== undefined ? status : "completed",
                lastViewed: new Date(),
            }
        });
    } else {
        progress = await prisma.userProgress.create({
            data: {
                userId,
                paperId,
                status: status !== undefined ? status : "completed",
            }
        });
    }
    
    return NextResponse.json(progress);
  } catch (error: any) {
    console.error("Progress API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

