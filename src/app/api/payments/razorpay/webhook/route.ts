import { NextResponse } from "next/server";
import type { Payments } from "razorpay/dist/types/payments";

import {
  completeStoredPayment,
  isValidHmacSignature,
  paymentPurchaseInclude,
  validateCapturedPayment,
} from "@/lib/payments";
import { prisma } from "@/lib/prisma";

type RazorpayWebhookEvent = {
  event?: string;
  payload?: {
    payment?: {
      entity?: Payments.RazorpayPayment;
    };
  };
};

export async function POST(req: Request) {
  const bodyText = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.error("Razorpay webhook rejected: signature verification is unavailable.");
    return NextResponse.json({ error: "Webhook verification failed." }, { status: 400 });
  }

  if (!isValidHmacSignature(bodyText, signature, webhookSecret)) {
    console.warn("Razorpay webhook rejected an invalid signature.");
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  try {
    const event = JSON.parse(bodyText) as RazorpayWebhookEvent;

    if (event.event !== "payment.captured" && event.event !== "payment.failed") {
      return NextResponse.json({ status: "ignored" });
    }

    const paymentEntity = event.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;

    if (!paymentEntity || typeof orderId !== "string" || !orderId) {
      console.warn("Razorpay webhook ignored a malformed payment event.");
      return NextResponse.json({ status: "ignored" });
    }

    const storedPayment = await prisma.payment.findUnique({
      where: { razorpayOrderId: orderId },
      include: paymentPurchaseInclude,
    });

    if (!storedPayment) {
      return NextResponse.json({ status: "ignored", reason: "order_not_found" });
    }

    if (storedPayment.razorpayPaymentId && storedPayment.razorpayPaymentId !== paymentEntity.id) {
      console.warn("Razorpay webhook rejected a mismatched payment ID.", {
        orderId,
      });
      return NextResponse.json({ error: "Payment ID mismatch." }, { status: 409 });
    }

    if (event.event === "payment.failed") {
      if (storedPayment.status === "pending") {
        await prisma.payment.update({
          where: { id: storedPayment.id },
          data: {
            status: "failed",
          },
        });
      }
      return NextResponse.json({ status: "ok" });
    }

    if (storedPayment.status === "successful") {
      return NextResponse.json({ status: "ok", idempotent: true });
    }

    validateCapturedPayment(paymentEntity, storedPayment, paymentEntity.id);
    await completeStoredPayment(storedPayment.id, paymentEntity.id);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error(
      "Razorpay webhook failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
