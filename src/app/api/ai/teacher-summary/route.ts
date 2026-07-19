import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenAI } from "@google/genai";
import { isAdminRole } from "@/lib/roles";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !isAdminRole((session.user as { role?: string }).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { context } = body;

    if (!context) {
      return NextResponse.json({ error: "Context is required" }, { status: 400 });
    }

    const prompt = `
You are Vexa AI, assisting a teacher in analyzing recent student struggles.
Generate a highly concise "AI Teaching Insight" based on the aggregated class data provided below.

Context about the class:
${context}

Rules:
1. Generate concisely. Maximum 5 bullet points.
2. Use challenge analytics, mistake analytics, ask teacher requests, and revision planner progress to inform the bullets.
3. Identify the major bottleneck or most requested topic across the class.
4. Suggest a clear "Recommendation" for the teacher's next lesson based on this data.
5. Do NOT output a full essay or chat response like "Here is your insight...". Just output the bullet points directly.
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
