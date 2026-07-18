import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStudentSubjectOptions } from "@/lib/student-subjects";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ subjects: await getStudentSubjectOptions(userId) }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
