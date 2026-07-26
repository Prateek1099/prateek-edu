import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/roles";
import { revalidatePath } from "next/cache";

function isValidDocumentUrl(value: unknown) {
  if (typeof value !== "string" || !value) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !isAdminRole((session.user as { role?: string }).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, subjectId, topicId, difficulty, pdfUrl, pdfAnswerUrl } = await req.json();

    if (!title || !subjectId || !pdfUrl) {
      return NextResponse.json({ error: "Title, subject, and Questions PDF are required" }, { status: 400 });
    }
    if (!isValidDocumentUrl(pdfUrl)) {
      return NextResponse.json(
        { error: "Questions PDF must use a valid URL." },
        { status: 400 },
      );
    }
    if (pdfAnswerUrl && !isValidDocumentUrl(pdfAnswerUrl)) {
      return NextResponse.json(
        { error: "Solutions PDF must use a valid URL." },
        { status: 400 },
      );
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

    revalidatePath("/admin/worksheets");
    revalidatePath("/resources", "layout");

    return NextResponse.json({ worksheetId: worksheet.id });
  } catch (error: unknown) {
    console.error("PDF Worksheet creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PDF worksheet creation failed" },
      { status: 500 },
    );
  }
}
