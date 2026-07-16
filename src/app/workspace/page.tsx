export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, FileText, Briefcase } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function WorkspaceDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user as any;

  const workspace = await prisma.workspace.findUnique({
    where: { ownerId: user.id },
    include: {
      classes: {
        where: { status: "ACTIVE" },
        include: {
          subject: { select: { name: true } },
          _count: { select: { students: { where: { status: "ACTIVE" } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      _count: {
        select: {
          classes: { where: { status: "ACTIVE" } },
          members: true,
          content: true,
        },
      },
    },
  });

  if (!workspace) redirect("/dashboard");

  // Count total students across all classes
  const totalStudents = await prisma.classStudent.count({
    where: {
      class: { workspaceId: workspace.id },
      status: "ACTIVE",
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Briefcase className="size-8 text-primary" />
          {workspace.name}
        </h1>
        <p className="text-muted-foreground mt-1">Welcome to your teaching workspace.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BookOpen className="size-5 text-primary" />
              <span className="text-3xl font-bold">{workspace._count.classes}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="size-5 text-emerald-600" />
              <span className="text-3xl font-bold">{totalStudents}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Content Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-blue-600" />
              <span className="text-3xl font-bold">{workspace._count.content}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Classes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Classes</h2>
          <Link href="/workspace/classes">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </div>
        {workspace.classes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <BookOpen className="size-10 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-1">No classes yet</h3>
              <p className="text-muted-foreground mb-4">Create your first class to get started.</p>
              <Link href="/workspace/classes">
                <Button>Create Class</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspace.classes.map((cls) => (
              <Link key={cls.id} href={`/workspace/classes/${cls.id}`}>
                <Card className="hover:border-primary/50 transition-all hover:shadow-md h-full group">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{cls.name}</h3>
                    {cls.subject && (
                      <p className="text-sm text-muted-foreground mt-1">{cls.subject.name}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" /> {cls._count.students} students
                      </span>
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{cls.joinCode}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
