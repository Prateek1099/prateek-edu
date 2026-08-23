import InsightsClient from "./InsightsClient";

import { requireSuperAdmin } from "@/lib/require-role";
import {
  InsightsScopeError,
  getAdminInsightsFilterOptions,
  getScopedTeachingInsights,
  type ScopedTeachingInsights,
} from "@/lib/teaching-intelligence";
import type { InsightsDateRange, InsightsScope } from "@/lib/admin-insights-rules";

export const dynamic = "force-dynamic";

type InsightsSearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstString(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function TeachingInsightsPage({
  searchParams,
}: {
  searchParams: InsightsSearchParams;
}) {
  await requireSuperAdmin();

  const query = await searchParams;
  const dateRange: InsightsDateRange = firstString(query.dateRange) === "30" ? "30" : "7";
  const selection = {
    boardId: firstString(query.boardId),
    qualificationId: firstString(query.qualificationId),
    subjectId: firstString(query.subjectId),
    topicId: firstString(query.topicId),
    challengeId: firstString(query.challengeId),
    dateRange,
  };

  const options = await getAdminInsightsFilterOptions();
  const hasRequiredScope = Boolean(
    selection.boardId && selection.qualificationId && selection.subjectId,
  );
  let insights: ScopedTeachingInsights | null = null;
  let scopeError: string | null = null;

  if (hasRequiredScope) {
    const scope: InsightsScope = {
      boardId: selection.boardId,
      qualificationId: selection.qualificationId,
      subjectId: selection.subjectId,
      dateRange,
      ...(selection.topicId ? { topicId: selection.topicId } : {}),
      ...(selection.challengeId ? { challengeId: selection.challengeId } : {}),
    };

    try {
      insights = await getScopedTeachingInsights(scope);
    } catch (error) {
      if (error instanceof InsightsScopeError) scopeError = error.message;
      else throw error;
    }
  }

  return (
    <InsightsClient
      options={options}
      initialSelection={selection}
      insights={insights}
      scopeError={scopeError}
    />
  );
}
