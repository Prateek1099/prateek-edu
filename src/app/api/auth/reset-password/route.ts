import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { AccountActionTokenPurpose } from "@prisma/client";
import { consumeAccountActionToken, isValidEmail, normalizeEmail } from "@/lib/account-action-tokens";
import { validatePassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { email, token, password, confirmPassword } = await request.json().catch(() => ({}));
  if (typeof email !== "string" || typeof token !== "string" || typeof password !== "string" || typeof confirmPassword !== "string") {
    return NextResponse.json({ error: "Invalid password reset request." }, { status: 400 });
  }
  if (!isValidEmail(email) || !token || password !== confirmPassword) {
    return NextResponse.json({ error: "Check the reset link and matching passwords." }, { status: 400 });
  }
  const passwordError = validatePassword(password);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

  const identifier = normalizeEmail(email);
  const consumed = await consumeAccountActionToken(identifier, token, AccountActionTokenPurpose.PASSWORD_RESET);
  if (!consumed) return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });

  await prisma.user.update({
    where: { email: identifier },
    data: { password: await bcrypt.hash(password, 12) },
  });
  return NextResponse.json({ message: "Password updated successfully." });
}
