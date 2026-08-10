import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";
import { isAdminRole } from "@/lib/roles";
import { revalidatePath } from "next/cache";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type GeneratedWorksheetQuestion = {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string | null;
  topicTag: string | null;
  bankQuestionId?: string;
  difficulty: string;
  marks: number;
  sortOrder: number;
};

function stringOrFallback(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !isAdminRole((session.user as { role?: string }).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subjectId, topicId, customTopic, questionCount = 10, difficulty = "mixed", source = "bank", title } = await req.json();

    if (!subjectId) {
      return NextResponse.json({ error: "Subject ID is required" }, { status: 400 });
    }
    if (source !== "bank" && source !== "ai") {
      return NextResponse.json(
        { error: "Worksheet source must be the question bank or AI." },
        { status: 400 },
      );
    }

    let newQuestions: GeneratedWorksheetQuestion[] = [];

    if (source === "bank") {
      const dbQuestions = await prisma.bankQuestion.findMany({
        where: {
          subjectId,
          workspaceId: null,
          questionType: "MCQ",
          ...(topicId ? { topicId } : {}),
          ...(difficulty !== "mixed" ? { difficulty } : {}),
        }
      });

      const completeMcqs = dbQuestions.filter(
        (question) =>
          question.optionA?.trim() &&
          question.optionB?.trim() &&
          question.optionC?.trim() &&
          question.optionD?.trim() &&
          question.correctAnswer &&
          ["A", "B", "C", "D"].includes(question.correctAnswer.trim().toUpperCase()),
      );
      const shuffled = completeMcqs.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, questionCount);
      
      if (selected.length === 0) {
        return NextResponse.json({ error: "No questions found in the bank for these parameters." }, { status: 400 });
      }
      
      newQuestions = selected.map((q, i) => ({
        questionText: q.questionText,
        optionA: q.optionA!,
        optionB: q.optionB!,
        optionC: q.optionC!,
        optionD: q.optionD!,
        correctAnswer: q.correctAnswer!,
        explanation: q.explanation,
        topicTag: q.topicTag,
        bankQuestionId: q.id,
        difficulty: q.difficulty,
        marks: q.marks,
        sortOrder: i
      }));
    } else if (source === "ai") {
       const prompt = `Generate ${questionCount} multiple choice questions about "${customTopic || "the specified topic"}" at a ${difficulty} difficulty level.
       Respond ONLY with a valid JSON array. Each object must have exactly these keys:
       {
         "questionText": "...",
         "optionA": "...",
         "optionB": "...",
         "optionC": "...",
         "optionD": "...",
         "correctAnswer": "A", // Must be "A", "B", "C", or "D"
         "explanation": "...",
         "topicTag": "${customTopic || "Mixed"}"
       }`;
       const response = await ai.models.generateContent({
         model: 'gemini-2.5-flash',
         contents: prompt,
       });
       const rawText = response.text ? response.text.replace(/```json/g, '').replace(/```/g, '').trim() : "[]";
       const parsed: unknown = JSON.parse(rawText);
       if (!Array.isArray(parsed)) throw new Error("AI did not return a valid JSON array");
       newQuestions = parsed.map((item: unknown, i: number) => {
         const q =
           typeof item === "object" && item !== null
             ? (item as Record<string, unknown>)
             : {};
         const correctAnswer =
           typeof q.correctAnswer === "string" &&
           ["A", "B", "C", "D"].includes(q.correctAnswer)
             ? q.correctAnswer
             : "A";

         return {
           questionText: stringOrFallback(q.questionText, "Missing Question"),
           optionA: stringOrFallback(q.optionA, "A"),
           optionB: stringOrFallback(q.optionB, "B"),
           optionC: stringOrFallback(q.optionC, "C"),
           optionD: stringOrFallback(q.optionD, "D"),
           correctAnswer,
           explanation: typeof q.explanation === "string" ? q.explanation : null,
           topicTag: typeof q.topicTag === "string" ? q.topicTag : null,
           difficulty,
           marks: 1,
           sortOrder: i
         };
       });
    }

    if (newQuestions.length === 0) {
      return NextResponse.json(
        { error: "A generated worksheet needs at least one question." },
        { status: 400 },
      );
    }

    const worksheet = await prisma.challenge.create({
      data: {
        title: title || `Worksheet: ${customTopic || 'Practice'}`,
        subjectId,
        topicId: topicId || null,
        difficulty,
        estimatedTime: newQuestions.length * 2,
        isPublished: true,
        type: "WORKSHEET",
        questions: {
          create: newQuestions
        }
      }
    });

    revalidatePath("/admin/worksheets");
    revalidatePath("/resources", "layout");

    return NextResponse.json({ worksheetId: worksheet.id });
  } catch (error: unknown) {
    console.error("Worksheet generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Worksheet generation failed" },
      { status: 500 },
    );
  }
}
