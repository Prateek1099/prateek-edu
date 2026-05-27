import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, courseId } = await req.json();

    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
      .update(text)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // Payment is valid, update database
    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId: razorpay_order_id, userId: (session.user as any).id },
      include: { plan: true }
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: "successful",
        },
      });

      // If it's a subscription plan
      if (payment.plan) {
        const plan = payment.plan;
        const durationMonths = plan.name.toLowerCase().includes("year") ? 12 : 1;
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + durationMonths);

        await prisma.user.update({
          where: { id: payment.userId },
          data: {
            isPremium: true,
            planId: plan.id,
            subscriptionStart: new Date(),
            subscriptionExpiry: expiry,
            monthlyAIQuota: plan.aiQuota,
            usageConsumed: 0,
          }
        });
      }
    }

    if (courseId) {
      await prisma.enrollment.updateMany({
        where: { courseId, userId: (session.user as any).id },
        data: {
          paymentStatus: "completed",
        },
      });
    }

    return NextResponse.json({ message: "Payment verified successfully" });
  } catch (error: any) {
    console.error("Razorpay Verify Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
