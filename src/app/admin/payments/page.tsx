export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import AdminPaymentsClient from "./AdminPaymentsClient";

export default async function AdminPaymentsPage() {
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: true,
      course: { select: { title: true } },
      plan: { select: { name: true } },
    }
  });

  return (
    <AdminPaymentsClient
      payments={payments.map((payment) => ({
        id: payment.id,
        userLabel: payment.user.name || payment.user.email || "Unknown user",
        amount: payment.amount,
        status: payment.status,
        purchase: payment.course?.title || payment.plan?.name || "Legacy / unmapped",
        purchaseType: payment.course ? "course" : payment.plan ? "subscription" : "legacy",
        paymentId: payment.razorpayPaymentId,
        createdAt: payment.createdAt.toISOString(),
      }))}
    />
  );
}
