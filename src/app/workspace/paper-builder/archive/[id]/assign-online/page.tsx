import { notFound } from "next/navigation";

import { getAssignOnlineContext } from "@/lib/assessments/teacher-queries";
import { requireActiveWorkspace } from "@/lib/require-role";
import AssignOnlineClient from "./AssignOnlineClient";

export const dynamic="force-dynamic";

export default async function AssignOnlinePage({params}:{params:Promise<{id:string}>}) {
  await requireActiveWorkspace();
  const context=await getAssignOnlineContext((await params).id);
  if(!context) notFound();
  return <AssignOnlineClient context={context}/>;
}
