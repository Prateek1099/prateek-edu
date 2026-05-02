import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { paperId, completed } = body;

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
                completed: completed !== undefined ? completed : true,
                lastViewed: new Date(),
            }
        });
    } else {
        progress = await prisma.userProgress.create({
            data: {
                userId,
                paperId,
                completed: completed !== undefined ? completed : true,
            }
        });
    }
    
    return NextResponse.json(progress);
  } catch (error: any) {
    console.error("Progress API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
