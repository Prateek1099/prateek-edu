import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";
import { isAdminRole } from "@/lib/roles";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    let newQuestions: any[] = [];

    if (source === "bank") {
      const dbQuestions = await prisma.bankQuestion.findMany({
        where: {
          subjectId,
          ...(topicId ? { topicId } : {}),
          ...(difficulty !== "mixed" ? { difficulty } : {}),
        }
      });
      
      const shuffled = dbQuestions.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, questionCount);
      
      if (selected.length === 0) {
        return NextResponse.json({ error: "No questions found in the bank for these parameters." }, { status: 400 });
      }
      
      newQuestions = selected.map((q, i) => ({
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
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
       const parsed = JSON.parse(rawText);
       if (!Array.isArray(parsed)) throw new Error("AI did not return a valid JSON array");
       newQuestions = parsed.map((q: any, i: number) => ({
         questionText: q.questionText || "Missing Question",
         optionA: q.optionA || "A",
         optionB: q.optionB || "B",
         optionC: q.optionC || "C",
         optionD: q.optionD || "D",
         correctAnswer: ["A","B","C","D"].includes(q.correctAnswer) ? q.correctAnswer : "A",
         explanation: q.explanation || null,
         topicTag: q.topicTag || null,
         difficulty,
         marks: 1,
         sortOrder: i
       }));
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

    return NextResponse.json({ worksheetId: worksheet.id });
  } catch (error: any) {
    console.error("Worksheet generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
