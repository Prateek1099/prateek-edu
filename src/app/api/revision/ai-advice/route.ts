import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * POST /api/revision/ai-advice
 * Generate AI study advice using Gemini based on the student's revision plan data.
 * Body: { context: string }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { context } = body;

    if (!context) {
      return Response.json(
        { error: "Context is required" },
        { status: 400 }
      );
    }

    const prompt = `
You are Vexa AI, a helpful, encouraging, and highly concise educational assistant specialising in exam revision planning.
Based on the student's revision plan data, give 3-4 specific, actionable study recommendations.

Student's revision context:
${context}

Rules:
1. Keep each recommendation to 1-2 sentences max.
2. Use numbered list format (1. 2. 3. 4.).
3. Be specific — reference actual subjects, topics, or score patterns from the context.
4. Prioritise weak areas (low challenge scores, high mistake counts) first.
5. Suggest concrete next steps (e.g. "Revise [topic] notes then re-attempt the challenge").
6. Keep the tone encouraging but direct. No greetings, no filler.
7. If the student is doing well overall, suggest pushing to the next difficulty level.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return Response.json({ advice: response.text });
  } catch (error: any) {
    console.error("Gemini AI Revision Advice Error:", error);
    return Response.json(
      { error: error.message || "Failed to generate AI advice" },
      { status: 500 }
    );
  }
}
