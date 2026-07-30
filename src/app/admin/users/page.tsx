export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-role";
import { isAdminRole, isSuperAdmin } from "@/lib/roles";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const admin = await requireSuperAdmin();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      enrollments: {
        select: { paymentStatus: true },
      },
    }
  });

  return (
    <AdminUsersClient
      users={users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        completedEnrollments: user.enrollments.filter((enrollment) => enrollment.paymentStatus === "completed").length,
        pendingEnrollments: user.enrollments.filter((enrollment) => enrollment.paymentStatus === "pending").length,
        disabledReason:
          user.id === admin.id
            ? "You cannot delete your own administrator account."
            : isSuperAdmin(user.role)
              ? "SUPER_ADMIN accounts cannot be deleted here."
              : undefined,
        canViewPerformance: !isAdminRole(user.role),
      }))}
    />
  );
}
