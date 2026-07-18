import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccountActionTokenPurpose } from "@prisma/client";
import { consumeAccountActionToken, normalizeEmail } from "@/lib/account-action-tokens";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const email = url.searchParams.get("email");

    if (!token || !email) {
      return NextResponse.json({ error: "Missing token or email" }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    const consumed = await consumeAccountActionToken(
      normalizedEmail,
      token,
      AccountActionTokenPurpose.EMAIL_VERIFICATION,
    );

    if (!consumed) {
      return NextResponse.redirect(new URL("/login?verification=invalid", req.url));
    }

    await prisma.user.update({ where: { email: normalizedEmail }, data: { emailVerified: new Date() } });

    // Redirect to a success page or login
    return NextResponse.redirect(new URL("/login?verified=true", req.url));
  } catch (error: unknown) {
    console.error("Verification Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
