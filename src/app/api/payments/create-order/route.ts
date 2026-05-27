import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: "Razorpay keys are not configured." }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const { planId, courseId } = await req.json();

    if (!planId && !courseId) {
      return NextResponse.json({ error: "Plan ID or Course ID is required" }, { status: 400 });
    }

    let amount = 0;
    let receiptStr = "";

    if (planId) {
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: planId },
      });
      if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
      amount = plan.price;
      receiptStr = `rcpt_${(session.user as any).id.substring(0, 5)}_${planId.substring(0, 5)}`;
    } else if (courseId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });
      if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
      amount = course.price;
      receiptStr = `rcpt_${(session.user as any).id.substring(0, 5)}_${courseId.substring(0, 5)}`;
    }

    // Initialize Razorpay Order
    const amountInPaise = Math.round(amount * 100);
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: receiptStr,
    };

    const order = await razorpay.orders.create(options);

    // Create a pending payment record
    await prisma.payment.create({
      data: {
        userId: (session.user as any).id,
        razorpayOrderId: order.id,
        amount: amount,
        status: "pending",
        planId: planId || null,
      },
    });

    if (courseId) {
      // Create a pending enrollment record for courses
      await prisma.enrollment.create({
        data: {
          userId: (session.user as any).id,
          courseId: courseId,
          paymentStatus: "pending",
        },
      });
    }

    return NextResponse.json(order);
  } catch (error: any) {
    console.error("Razorpay Create Order Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
