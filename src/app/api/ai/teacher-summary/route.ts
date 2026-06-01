import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { context } = body;

    if (!context) {
      return NextResponse.json({ error: "Context is required" }, { status: 400 });
    }

    const prompt = `
You are ExamNest AI, assisting a teacher in analyzing recent student struggles.
Generate a highly concise "AI Teaching Insight" based on the aggregated class data provided below.

Context about the class:
${context}

Rules:
1. Keep the output extremely concise (max 4-5 short sentences).
2. Do NOT output a full essay or chat response like "Hello! Here is your insight...". Just output the raw insight directly.
3. Identify the major bottleneck or most requested topic across the class.
4. Suggest a clear "Suggested next focus" for the teacher's next lesson based on this data.
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
