import "server-only";

import crypto from "crypto";
import Razorpay from "razorpay";
import type { Orders } from "razorpay/dist/types/orders";
import type { Payments } from "razorpay/dist/types/payments";

import { prisma } from "@/lib/prisma";

export type StoredPayment = {
  id: string;
  userId: string;
  amount: number;
  status: string;
  planId: string | null;
  courseId: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  course: { id: string; price: number } | null;
  plan: { id: string; name: string; price: number; aiQuota: number } | null;
};

export const paymentPurchaseInclude = {
  course: { select: { id: true, price: true } },
  plan: { select: { id: true, name: true, price: true, aiQuota: true } },
} as const;

export function getRazorpayClient() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured.");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

export function isValidHmacSignature(payload: string, signature: string, secret: string) {
  const expected = Buffer.from(
    crypto.createHmac("sha256", secret).update(payload).digest("hex"),
    "utf8",
  );
  const received = Buffer.from(signature, "utf8");

  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

export function expectedPaymentAmount(payment: StoredPayment) {
  if (!payment.course && !payment.plan) {
    throw new Error("Payment is not linked to a course or subscription plan.");
  }

  const storedAmount = Math.round(payment.amount * 100);
  if (!Number.isFinite(storedAmount) || storedAmount <= 0) {
    throw new Error("Stored payment amount is invalid.");
  }

  return storedAmount;
}

export function validateCapturedPayment(
  paymentEntity: Pick<
    Payments.RazorpayPayment,
    "id" | "order_id" | "amount" | "currency" | "status" | "captured"
  >,
  storedPayment: StoredPayment,
  expectedPaymentId?: string,
) {
  const expectedAmount = expectedPaymentAmount(storedPayment);

  if (
    !storedPayment.razorpayOrderId ||
    paymentEntity.order_id !== storedPayment.razorpayOrderId ||
    (expectedPaymentId && paymentEntity.id !== expectedPaymentId) ||
    Number(paymentEntity.amount) !== expectedAmount ||
    paymentEntity.currency !== "INR" ||
    paymentEntity.status !== "captured" ||
    paymentEntity.captured !== true
  ) {
    throw new Error("Razorpay payment details did not match the stored purchase.");
  }
}

export function validatePaidOrder(
  order: Pick<Orders.RazorpayOrder, "id" | "amount" | "amount_paid" | "currency" | "status">,
  storedPayment: StoredPayment,
) {
  const expectedAmount = expectedPaymentAmount(storedPayment);

  if (
    !storedPayment.razorpayOrderId ||
    order.id !== storedPayment.razorpayOrderId ||
    Number(order.amount) !== expectedAmount ||
    Number(order.amount_paid) !== expectedAmount ||
    order.currency !== "INR" ||
    order.status !== "paid"
  ) {
    throw new Error("Razorpay order details did not match the stored purchase.");
  }
}

export async function completeStoredPayment(
  storedPaymentId: string,
  razorpayPaymentId: string,
  razorpaySignature?: string,
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: storedPaymentId },
      include: paymentPurchaseInclude,
    });

    if (!payment || (!payment.courseId && !payment.planId) || (payment.courseId && payment.planId)) {
      throw new Error("Payment purchase mapping is invalid.");
    }

    if (payment.razorpayPaymentId && payment.razorpayPaymentId !== razorpayPaymentId) {
      throw new Error("Payment ID does not match the stored payment.");
    }

    const transition = await tx.payment.updateMany({
      where: {
        id: payment.id,
        status: { not: "successful" },
      },
      data: {
        status: "successful",
        razorpayPaymentId,
        ...(razorpaySignature ? { razorpaySignature } : {}),
      },
    });

    if (transition.count === 0) {
      if (razorpaySignature && !payment.razorpaySignature) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { razorpaySignature },
        });
      }
      return { alreadyCompleted: true };
    }

    if (payment.courseId) {
      await tx.enrollment.upsert({
        where: {
          userId_courseId: {
            userId: payment.userId,
            courseId: payment.courseId,
          },
        },
        create: {
          userId: payment.userId,
          courseId: payment.courseId,
          paymentStatus: "completed",
        },
        update: {
          paymentStatus: "completed",
        },
      });
    } else if (payment.plan) {
      const durationMonths = payment.plan.name.toLowerCase().includes("year") ? 12 : 1;
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + durationMonths);

      await tx.user.update({
        where: { id: payment.userId },
        data: {
          isPremium: true,
          planId: payment.plan.id,
          subscriptionStart: new Date(),
          subscriptionExpiry: expiry,
          monthlyAIQuota: payment.plan.aiQuota,
          usageConsumed: 0,
        },
      });
    }

    return { alreadyCompleted: false };
  });
}
