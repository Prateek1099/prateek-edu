import { NextResponse } from "next/server";
import { AccountActionTokenPurpose } from "@prisma/client";
import { canIssueAccountActionToken, isValidEmail, issueAccountActionToken, normalizeEmail } from "@/lib/account-action-tokens";
import { sendVerificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const RESPONSE = { message: "If an unverified account matches that email address, we sent a verification link." };

export async function POST(request: Request) {
  const { email } = await request.json().catch(() => ({ email: "" }));
  if (typeof email !== "string" || !isValidEmail(email)) return NextResponse.json(RESPONSE);

  const identifier = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: identifier },
    select: { email: true, emailVerified: true },
  });

  if (!user || user.emailVerified || !(await canIssueAccountActionToken(identifier, AccountActionTokenPurpose.EMAIL_VERIFICATION))) {
    return NextResponse.json(RESPONSE);
  }

  const { token } = await issueAccountActionToken(identifier, AccountActionTokenPurpose.EMAIL_VERIFICATION);
  await sendVerificationEmail(identifier, token);
  return NextResponse.json(RESPONSE);
}
