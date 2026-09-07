import "server-only";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-role";
import { createAssessmentEngine } from "./engine";

// A0 has no HTTP routes or Server Actions. Future entry points must call this
// authenticated service, not supply an actor to the internal engine factory.
export const assessmentService = createAssessmentEngine(prisma, async () => {
  const user = await requireAuth();
  return { id: user.id };
});
