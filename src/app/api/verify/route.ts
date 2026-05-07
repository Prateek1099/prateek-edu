import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const email = url.searchParams.get("email");

    if (!token || !email) {
      return NextResponse.json({ error: "Missing token or email" }, { status: 400 });
    }

    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: email,
          token,
        },
      },
    });

    if (!verificationToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    if (new Date() > verificationToken.expires) {
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    await prisma.user.update({
      where: { email },
      data: {
        emailVerified: new Date(),
      },
    });

    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token,
        },
      },
    });

    // Redirect to a success page or login
    return NextResponse.redirect(new URL("/login?verified=true", req.url));
  } catch (error: any) {
    console.error("Verification Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
