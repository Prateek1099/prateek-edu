import { StudentWorkspaceNav } from "@/components/student/StudentWorkspaceNav";

export default function StudentDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <StudentWorkspaceNav />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
