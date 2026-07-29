"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { rejectIfNotAdmin } from "@/lib/require-role";

export async function markContactQueryResolved(queryId: string) {
  const denied = await rejectIfNotAdmin();
  if (denied) {
    return { success: false as const, error: denied };
  }

  try {
    const result = await prisma.contactQuery.updateMany({
      where: {
        id: queryId,
        resolved: false,
      },
      data: {
        resolved: true,
      },
    });

    if (result.count === 0) {
      return {
        success: false as const,
        error: "Query was not found or is already resolved.",
      };
    }

    revalidatePath("/admin/queries");
    return { success: true as const };
  } catch (error) {
    console.error("Failed to resolve contact query:", error);
    return {
      success: false as const,
      error: "Failed to mark the query as resolved.",
    };
  }
}
