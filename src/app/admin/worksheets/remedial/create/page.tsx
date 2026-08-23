import { requireSuperAdmin } from "@/lib/require-role";
import { getRemedialWorksheetAvailability } from "@/lib/remedial-worksheets/service";
import type { RemedialScopeInput } from "@/lib/remedial-worksheets/types";

import RemedialWorksheetClient from "./RemedialWorksheetClient";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function RemedialWorksheetCreatePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireSuperAdmin();
  const query = await searchParams;
  const scope: RemedialScopeInput = {
    boardId: firstString(query.boardId),
    qualificationId: firstString(query.qualificationId),
    subjectId: firstString(query.subjectId),
    topicId: firstString(query.topicId),
    dateRange: firstString(query.dateRange) === "30" ? "30" : "7",
  };
  const availability = await getRemedialWorksheetAvailability(scope);

  return (
    <RemedialWorksheetClient
      scope={scope}
      initialAvailability={availability.success ? availability.data : null}
      initialError={availability.success ? null : availability.error}
    />
  );
}
