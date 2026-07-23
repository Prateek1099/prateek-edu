import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  completeStoredPayment,
  getRazorpayClient,
  isValidHmacSignature,
  paymentPurchaseInclude,
  validateCapturedPayment,
  validatePaidOrder,
} from "@/lib/payments";
import { prisma } from "@/lib/prisma";

function readPaymentFields(body: unknown) {
  if (!body || typeof body !== "object") return null;

  const candidate = body as Record<string, unknown>;
  const paymentId = candidate.razorpay_payment_id;
  const orderId = candidate.razorpay_order_id;
  const signature = candidate.razorpay_signature;

  if (
    typeof paymentId !== "string" ||
    typeof orderId !== "string" ||
    typeof signature !== "string" ||
    !paymentId ||
    !orderId ||
    !signature
  ) {
    return null;
  }

  return { paymentId, orderId, signature };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fields = readPaymentFields(await req.json());
    if (!fields) {
      return NextResponse.json({ error: "Invalid payment verification request." }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      console.error("Razorpay verify failed: payment secret is not configured.");
      return NextResponse.json({ error: "Payment verification is unavailable." }, { status: 500 });
    }

    if (
      !isValidHmacSignature(
        `${fields.orderId}|${fields.paymentId}`,
        fields.signature,
        keySecret,
      )
    ) {
      console.warn("Razorpay verify rejected an invalid signature.", {
        orderId: fields.orderId,
        userId,
      });
      return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 });
    }

    const storedPayment = await prisma.payment.findUnique({
      where: { razorpayOrderId: fields.orderId },
      include: paymentPurchaseInclude,
    });

    if (
      !storedPayment ||
      storedPayment.userId !== userId ||
      (!storedPayment.courseId && !storedPayment.planId) ||
      (storedPayment.courseId && storedPayment.planId)
    ) {
      console.warn("Razorpay verify rejected an unmapped or unauthorized order.", {
        orderId: fields.orderId,
        userId,
      });
      return NextResponse.json({ error: "Payment order was not found." }, { status: 404 });
    }

    if (storedPayment.status === "successful") {
      if (storedPayment.razorpayPaymentId !== fields.paymentId) {
        return NextResponse.json({ error: "Payment ID does not match this order." }, { status: 409 });
      }
      return NextResponse.json({ message: "Payment already verified." });
    }

    const razorpay = getRazorpayClient();
    const [paymentEntity, order] = await Promise.all([
      razorpay.payments.fetch(fields.paymentId),
      razorpay.orders.fetch(fields.orderId),
    ]);

    validateCapturedPayment(paymentEntity, storedPayment, fields.paymentId);
    validatePaidOrder(order, storedPayment);

    await completeStoredPayment(storedPayment.id, fields.paymentId, fields.signature);

    return NextResponse.json({ message: "Payment verified successfully." });
  } catch (error) {
    console.error(
      "Razorpay verify failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
  }
}
