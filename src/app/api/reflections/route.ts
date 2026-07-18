import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentSubjectOptions } from "@/lib/student-subjects";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { subjectId, topicIds, message, context } = body;

    if (typeof subjectId !== "string" || !Array.isArray(topicIds) || !topicIds.every((id) => typeof id === "string")) {
      return NextResponse.json({ error: "A subject and valid topic selection are required." }, { status: 400 });
    }

    const subject = (await getStudentSubjectOptions(userId)).find((option) => option.id === subjectId);
    if (!subject) return NextResponse.json({ error: "That subject is not available for your account." }, { status: 403 });

    const selectedTopics = subject.topics.filter((topic) => topicIds.includes(topic.id));
    if (selectedTopics.length !== topicIds.length) {
      return NextResponse.json({ error: "One or more selected topics are invalid." }, { status: 400 });
    }
    if (selectedTopics.length === 0 && (!message || !String(message).trim())) {
      return NextResponse.json({ error: "Select a topic or describe your doubt." }, { status: 400 });
    }

    const reflection = await prisma.studentReflection.create({
      data: {
        userId,
        subjectId,
        topicId: selectedTopics[0]?.id || null,
        challengingTopics: selectedTopics.map((topic) => topic.name),
        message: typeof message === "string" && message.trim() ? message.trim() : null,
        context: context || null,
      }
    });
    
    return NextResponse.json(reflection);
  } catch (error: unknown) {
    console.error("Reflection API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
