import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature || !process.env.RAZORPAY_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(bodyText)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(bodyText);

    if (event.event === "payment.captured") {
      const paymentData = event.payload.payment.entity;
      const orderId = paymentData.order_id;

      // Find the pending payment in our DB
      const payment = await prisma.payment.findFirst({
        where: { razorpayOrderId: orderId, status: "pending" },
        include: { plan: true }
      });

      if (!payment) {
        // Could be already processed, or order not found
        return NextResponse.json({ status: "ignored" });
      }

      const plan = payment.plan;
      if (!plan) {
        return NextResponse.json({ error: "Plan not found for payment" }, { status: 400 });
      }

      // Calculate expiry date (assuming 1 month by default for monthly plans, 1 year for yearly)
      const durationMonths = plan.name.toLowerCase().includes("year") ? 12 : 1;
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + durationMonths);

      // 1. Update Payment Status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "successful",
          razorpayPaymentId: paymentData.id,
        },
      });

      // 2. Unlock Premium User
      await prisma.user.update({
        where: { id: payment.userId },
        data: {
          isPremium: true,
          planId: plan.id,
          subscriptionStart: new Date(),
          subscriptionExpiry: expiry,
          monthlyAIQuota: plan.aiQuota,
          usageConsumed: 0, // Reset usage
        }
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
