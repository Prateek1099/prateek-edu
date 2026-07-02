import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, subjectId, topicId, difficulty, pdfUrl, pdfAnswerUrl } = await req.json();

    if (!title || !subjectId || !pdfUrl) {
      return NextResponse.json({ error: "Title, subject, and Questions PDF are required" }, { status: 400 });
    }

    const worksheet = await prisma.challenge.create({
      data: {
        title,
        subjectId,
        topicId: topicId || null,
        difficulty: difficulty || "mixed",
        estimatedTime: 30,
        isPublished: true,
        type: "PDF_WORKSHEET",
        pdfUrl,
        pdfAnswerUrl: pdfAnswerUrl || null,
      },
    });

    return NextResponse.json({ worksheetId: worksheet.id });
  } catch (error: any) {
    console.error("PDF Worksheet creation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
