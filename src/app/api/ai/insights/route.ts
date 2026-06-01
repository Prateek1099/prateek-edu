import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { context } = body;

    if (!context) {
      return NextResponse.json({ error: "Context is required" }, { status: 400 });
    }

    const prompt = `
You are ExamNest AI, a helpful, encouraging, and highly concise educational assistant.
Generate a smart, personalized study insight based on the student's recent platform activity.

Context about the student:
${context}

Rules:
1. Keep the output extremely concise (max 4-5 short sentences).
2. Use bullet points if listing things.
3. Keep the tone encouraging but practical.
4. Do NOT output a full essay or chat response like "Hello! Here is your insight...". Just output the raw insight directly.
5. Highlight a specific pattern if visible (e.g. "You are practicing a lot of X but ignoring Y").
6. Provide a clear, specific Next Step recommendation based on the context.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini AI API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate AI insight" }, { status: 500 });
  }
}
