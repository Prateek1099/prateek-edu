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

    const userId = (session.user as any).id;
    const body = await req.json();
    const { challengingTopics, message } = body;

    if (!challengingTopics || !Array.isArray(challengingTopics)) {
      return NextResponse.json({ error: "challengingTopics array is required" }, { status: 400 });
    }

    const reflection = await prisma.studentReflection.create({
      data: {
        userId,
        challengingTopics,
        message: message || null,
      }
    });
    
    return NextResponse.json(reflection);
  } catch (error: any) {
    console.error("Reflection API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
