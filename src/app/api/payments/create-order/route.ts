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

    const { courseId } = await req.json();

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Initialize Razorpay Order
    const amountInPaise = Math.round(course.price * 100);
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_${(session.user as any).id.substring(0, 5)}_${courseId.substring(0, 5)}`,
    };

    const order = await razorpay.orders.create(options);

    // Create a pending payment record
    await prisma.payment.create({
      data: {
        userId: (session.user as any).id,
        razorpayOrderId: order.id,
        amount: course.price,
        status: "pending",
      },
    });

    // Create a pending enrollment record
    await prisma.enrollment.create({
      data: {
        userId: (session.user as any).id,
        courseId: course.id,
        paymentStatus: "pending",
      },
    });

    return NextResponse.json(order);
  } catch (error: any) {
    console.error("Razorpay Create Order Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
