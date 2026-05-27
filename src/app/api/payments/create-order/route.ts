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

    const { planId } = await req.json();

    if (!planId) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Initialize Razorpay Order
    const amountInPaise = Math.round(plan.price * 100);
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_${(session.user as any).id.substring(0, 5)}_${planId.substring(0, 5)}`,
    };

    const order = await razorpay.orders.create(options);

    // Create a pending payment record linked to the plan
    await prisma.payment.create({
      data: {
        userId: (session.user as any).id,
        razorpayOrderId: order.id,
        amount: plan.price,
        status: "pending",
        planId: plan.id,
      },
    });

    return NextResponse.json(order);
  } catch (error: any) {
    console.error("Razorpay Create Order Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
