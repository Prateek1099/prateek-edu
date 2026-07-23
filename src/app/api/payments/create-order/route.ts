import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getRazorpayClient } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { planId, courseId } = body as { planId?: unknown; courseId?: unknown };
    const hasPlanId = isNonEmptyString(planId);
    const hasCourseId = isNonEmptyString(courseId);

    if (hasPlanId === hasCourseId) {
      return NextResponse.json(
        { error: "Provide exactly one subscription plan or course." },
        { status: 400 },
      );
    }

    let amount: number;
    let purchaseId: string;
    let purchaseType: "plan" | "course";

    if (hasPlanId) {
      const plan = await prisma.subscriptionPlan.findFirst({
        where: { id: planId, isActive: true },
        select: { id: true, price: true },
      });

      if (!plan || plan.price <= 0) {
        return NextResponse.json({ error: "Subscription plan is not available." }, { status: 404 });
      }

      amount = plan.price;
      purchaseId = plan.id;
      purchaseType = "plan";
    } else {
      const course = await prisma.course.findFirst({
        where: { id: courseId as string, isPublished: true },
        select: { id: true, price: true },
      });

      if (!course) {
        return NextResponse.json({ error: "Course not found." }, { status: 404 });
      }

      if (course.price <= 0) {
        return NextResponse.json(
          { error: "Free courses must use the free enrollment flow." },
          { status: 400 },
        );
      }

      const alreadyEnrolled = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: course.id,
          },
        },
        select: { paymentStatus: true },
      });

      if (alreadyEnrolled?.paymentStatus === "completed") {
        return NextResponse.json({ error: "You already have access to this course." }, { status: 409 });
      }

      amount = course.price;
      purchaseId = course.id;
      purchaseType = "course";
    }

    const razorpay = getRazorpayClient();
    const amountInPaise = Math.round(amount * 100);
    const receipt = [
      "rcpt",
      userId.slice(0, 6),
      purchaseId.slice(0, 6),
      crypto.randomUUID().replaceAll("-", "").slice(0, 10),
    ].join("_");

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        purchaseType,
        userId,
        purchaseId,
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          userId,
          razorpayOrderId: order.id,
          amount,
          status: "pending",
          planId: purchaseType === "plan" ? purchaseId : null,
          courseId: purchaseType === "course" ? purchaseId : null,
        },
      });

      if (purchaseType === "course") {
        await tx.enrollment.upsert({
          where: {
            userId_courseId: {
              userId,
              courseId: purchaseId,
            },
          },
          create: {
            userId,
            courseId: purchaseId,
            paymentStatus: "pending",
          },
          update: {},
        });
      }
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error(
      "Razorpay create-order failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json({ error: "Unable to create payment order." }, { status: 500 });
  }
}
