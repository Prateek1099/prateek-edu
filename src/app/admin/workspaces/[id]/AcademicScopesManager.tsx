"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addWorkspaceAcademicScope,
  deactivateWorkspaceAcademicScope,
} from "@/app/actions/workspace-academic-scopes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AcademicOption = {
  id: string;
  title: string;
  qualifications: Array<{
    id: string;
    title: string;
    subjects: Array<{ id: string; name: string; code: string | null }>;
  }>;
};

type ScopeItem = {
  id: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date | string;
  deactivatedAt: Date | string | null;
  subject: {
    id: string;
    name: string;
    code: string | null;
    qualification: { title: string; board: { title: string } };
  };
  assignedBy: { name: string | null; email: string | null };
  dependencyCount: number;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatScopeDate(value: Date | string) {
  const date = new Date(value);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export default function AcademicScopesManager({
  workspaceId,
  academicOptions,
  scopes,
}: {
  workspaceId: string;
  academicOptions: AcademicOption[];
  scopes: ScopeItem[];
}) {
  const [boardId, setBoardId] = useState("");
  const [qualificationId, setQualificationId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [pending, startTransition] = useTransition();

  const qualifications = useMemo(
    () => academicOptions.find((board) => board.id === boardId)?.qualifications ?? [],
    [academicOptions, boardId],
  );
  const subjects = useMemo(
    () => qualifications.find((qualification) => qualification.id === qualificationId)?.subjects ?? [],
    [qualificationId, qualifications],
  );

  const addScope = () => {
    startTransition(async () => {
      const result = await addWorkspaceAcademicScope({ workspaceId, boardId, qualificationId, subjectId });
      if (result.success) toast.success(result.message);
      else toast.error(result.error);
      if (result.success) setSubjectId("");
    });
  };

  const deactivate = (scopeId: string) => {
    startTransition(async () => {
      const result = await deactivateWorkspaceAcademicScope(scopeId);
      if (result.success) toast.success(result.message);
      else toast.error(result.error);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Academic Scopes</CardTitle>
        <CardDescription>
          Teachers can use only active subjects assigned here. At least one active scope is required before approval.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-4">
          <Select value={boardId} onValueChange={(value) => { setBoardId(value ?? ""); setQualificationId(""); setSubjectId(""); }}>
            <SelectTrigger><SelectValue placeholder="Board" /></SelectTrigger>
            <SelectContent>{academicOptions.map((board) => <SelectItem key={board.id} value={board.id}>{board.title}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={qualificationId} onValueChange={(value) => { setQualificationId(value ?? ""); setSubjectId(""); }} disabled={!boardId}>
            <SelectTrigger><SelectValue placeholder="Qualification / class" /></SelectTrigger>
            <SelectContent>{qualifications.map((qualification) => <SelectItem key={qualification.id} value={qualification.id}>{qualification.title}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={subjectId} onValueChange={(value) => setSubjectId(value ?? "")} disabled={!qualificationId}>
            <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>{subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.name}{subject.code ? ` (${subject.code})` : ""}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={addScope} disabled={pending || !boardId || !qualificationId || !subjectId}>Add scope</Button>
        </div>

        {scopes.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No academic scopes assigned yet.
          </div>
        ) : (
          <div className="space-y-3">
            {scopes.map((scope) => (
              <div key={scope.id} className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{scope.subject.qualification.board.title} · {scope.subject.qualification.title} · {scope.subject.name}</p>
                    <Badge variant={scope.status === "ACTIVE" ? "default" : "secondary"}>{scope.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Assigned {formatScopeDate(scope.createdAt)} by {scope.assignedBy.name || scope.assignedBy.email || "Administrator"}
                    {scope.deactivatedAt ? ` · Deactivated ${formatScopeDate(scope.deactivatedAt)}` : ""}
                  </p>
                  {scope.status === "ACTIVE" && scope.dependencyCount > 0 ? (
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                      Deactivation is blocked while {scope.dependencyCount} active dependent record{scope.dependencyCount === 1 ? " exists" : "s exist"}.
                    </p>
                  ) : null}
                </div>
                {scope.status === "ACTIVE" ? (
                  <Button variant="outline" onClick={() => deactivate(scope.id)} disabled={pending}>Deactivate</Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
