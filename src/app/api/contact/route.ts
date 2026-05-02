import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const query = await prisma.contactQuery.create({
      data: {
        name,
        email,
        message: `[Subject: ${subject}]\n\n${message}`,
      },
    });

    return NextResponse.json({ success: true, id: query.id });
  } catch (error: any) {
    console.error("Contact API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
