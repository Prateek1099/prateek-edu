import "server-only";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-role";
import { createAssessmentEngine } from "./engine";

// Authenticated assessment routes and Server Actions call this service. They
// never accept an actor identity from the browser; engine injection is test-only.
export const assessmentService = createAssessmentEngine(prisma, async () => {
  const user = await requireAuth();
  return { id: user.id };
});
