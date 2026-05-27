import { prisma } from "./prisma";

// Mock implementation of a provider-agnostic AI evaluator
// We abstract the provider (Firebase/Gemini or OpenAI) behind this interface

export interface AIEvaluationRequest {
  userId: string;
  prompt: string;
  context?: string;
}

export interface AIEvaluationResponse {
  result: string;
  success: boolean;
  error?: string;
  quotaExceeded?: boolean;
}

export async function evaluateWithAI({ userId, prompt, context }: AIEvaluationRequest): Promise<AIEvaluationResponse> {
  // 1. Check AI Quota
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { monthlyAIQuota: true, usageConsumed: true, isPremium: true }
  });

  if (!user) {
    return { success: false, result: "", error: "User not found" };
  }

  if (user.usageConsumed >= user.monthlyAIQuota) {
    return { 
      success: false, 
      result: "", 
      error: "Monthly AI quota exceeded. Please upgrade your plan for more evaluations.",
      quotaExceeded: true
    };
  }

  // 2. Call AI Provider (Gemini / Firebase AI Logic)
  let generatedText = "";
  try {
    // NOTE: This is where Firebase AI Logic / Gemini SDK would be invoked.
    // For now, since we want to keep it provider agnostic and fast:
    
    // Example pseudocode:
    // const model = getVertexAIModel("gemini-1.5-flash");
    // const response = await model.generateContent(context + prompt);
    // generatedText = response.text;

    // Simulate AI response
    generatedText = `[AI Evaluation] Feedback for your answer:\n\nBased on the mark scheme, you missed a few key points regarding the architectural advantages. Ensure you mention scalability and cost-efficiency.\n\nScore: 3/5`;
    
  } catch (error: any) {
    console.error("AI Generation failed:", error);
    return { success: false, result: "", error: "AI Evaluation failed. Please try again later." };
  }

  // 3. Increment Usage Quota
  await prisma.user.update({
    where: { id: userId },
    data: {
      usageConsumed: {
        increment: 1
      }
    }
  });

  return {
    success: true,
    result: generatedText
  };
}
