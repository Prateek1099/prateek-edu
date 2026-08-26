import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";
import { WorkspaceProvider } from "@/components/WorkspaceContext";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as typeof session.user & { id: string; role?: string };
  if (user.role !== "TEACHER") redirect("/dashboard");

  const workspace = await prisma.workspace.findUnique({
    where: { ownerId: user.id },
    include: {
      _count: { select: { classes: true, members: true, content: true } },
    },
  });

  if (!workspace) redirect("/dashboard");

  // Show pending page if not active
  if (workspace.status !== "ACTIVE") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="mx-auto max-w-md text-center p-8">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Workspace Pending Approval</h1>
          <p className="text-muted-foreground mb-4">
            Your workspace <strong>&ldquo;{workspace.name}&rdquo;</strong> is awaiting approval from the Vexa admin team.
          </p>
          <p className="text-sm text-muted-foreground">
            You will receive access once your workspace has been reviewed and activated. This usually takes less than 24 hours.
          </p>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceProvider workspace={workspace}>
      <div className="min-h-screen bg-background lg:flex">
        <WorkspaceSidebar workspaceName={workspace.name} />
        <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-6 pt-20 sm:px-6 lg:p-10 print:p-0">
          {children}
        </main>
      </div>
    </WorkspaceProvider>
  );
}
