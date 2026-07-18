import { NextResponse } from "next/server";
import { AccountActionTokenPurpose } from "@prisma/client";
import { canIssueAccountActionToken, isValidEmail, issueAccountActionToken, normalizeEmail } from "@/lib/account-action-tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const RESPONSE = { message: "If an account with a password matches that email address, we sent a reset link." };

export async function POST(request: Request) {
  const { email } = await request.json().catch(() => ({ email: "" }));
  if (typeof email !== "string" || !isValidEmail(email)) return NextResponse.json(RESPONSE);

  const identifier = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: identifier },
    select: { password: true },
  });

  if (!user?.password || !(await canIssueAccountActionToken(identifier, AccountActionTokenPurpose.PASSWORD_RESET))) {
    return NextResponse.json(RESPONSE);
  }

  const { token } = await issueAccountActionToken(identifier, AccountActionTokenPurpose.PASSWORD_RESET);
  await sendPasswordResetEmail(identifier, token);
  return NextResponse.json(RESPONSE);
}
