export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import WorkspaceClassesClient from "./WorkspaceClassesClient";
import { listActiveWorkspaceScopes } from "@/lib/workspace-academic-scope";
import { requireActiveWorkspace } from "@/lib/require-role";

export default async function WorkspaceClassesPage() {
  const user = await requireActiveWorkspace();
  const scopes = await listActiveWorkspaceScopes(user.workspaceId);
  const subjectIds = scopes.map((scope) => scope.subjectId);

  const classes = await prisma.class.findMany({
    where: { workspaceId: user.workspaceId, subjectId: { in: subjectIds } },
    include: {
      subject: { select: { name: true } },
      qualification: { select: { title: true } },
      _count: { select: { students: { where: { status: "ACTIVE" } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const subjects = scopes.map((scope) => scope.subject);
  const qualifications = Array.from(
    new Map(subjects.map((subject) => [subject.qualification.id, subject.qualification])).values(),
  );

  return <WorkspaceClassesClient classes={classes} subjects={subjects} qualifications={qualifications} hasAcademicScope={scopes.length > 0} />;
}
