export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Briefcase, Users, BookOpen, FileText } from "lucide-react";
import Link from "next/link";
import ArchiveWorkspaceButton from "./ArchiveWorkspaceButton";

export default async function AdminWorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true, createdAt: true } },
      classes: {
        include: {
          subject: { select: { name: true } },
          qualification: { select: { title: true } },
          _count: { select: { students: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      content: { orderBy: { createdAt: "desc" }, take: 20 },
      _count: { select: { classes: true, members: true, content: true } },
    },
  });

  if (!workspace) notFound();

  const statusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-emerald-600";
      case "PENDING_APPROVAL": return "bg-amber-600";
      case "SUSPENDED": return "bg-red-600";
      case "ARCHIVED": return "bg-slate-600";
      default: return "";
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/workspaces">
          <Button variant="ghost" size="sm" className="-ml-2 mb-4 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4 mr-2" /> Back to Workspaces
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Briefcase className="size-8 text-primary" />
              {workspace.name}
            </h1>
            <p className="text-muted-foreground mt-1">Owned by {workspace.owner.name} ({workspace.owner.email})</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={statusColor(workspace.status)}>
              {workspace.status === "PENDING_APPROVAL" ? "Pending" : workspace.status}
            </Badge>
            <ArchiveWorkspaceButton
              workspaceId={workspace.id}
              workspaceName={workspace.name}
              isArchived={workspace.status === "ARCHIVED"}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="size-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{workspace._count.classes}</p>
              <p className="text-xs text-muted-foreground">Classes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="size-5 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold">{workspace._count.members}</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="size-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{workspace._count.content}</p>
              <p className="text-xs text-muted-foreground">Content Items</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Classes</CardTitle>
          <CardDescription>All classes in this workspace.</CardDescription>
        </CardHeader>
        <div className="border-t overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Join Code</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspace.classes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">No classes yet.</TableCell>
                </TableRow>
              ) : (
                workspace.classes.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.name}</TableCell>
                    <TableCell className="text-muted-foreground">{cls.subject?.name || "—"}</TableCell>
                    <TableCell>{cls._count.students}</TableCell>
                    <TableCell className="font-mono text-xs">{cls.joinCode}</TableCell>
                    <TableCell>
                      <Badge variant={cls.status === "ACTIVE" ? "default" : "secondary"} className={cls.status === "ACTIVE" ? "bg-emerald-600" : ""}>
                        {cls.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
