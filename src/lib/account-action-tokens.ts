import crypto from "crypto";
import { AccountActionTokenPurpose } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const TOKEN_BYTES = 32;
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function ttlFor(purpose: AccountActionTokenPurpose): number {
  return purpose === "EMAIL_VERIFICATION" ? VERIFICATION_TTL_MS : PASSWORD_RESET_TTL_MS;
}

export async function issueAccountActionToken(
  identifier: string,
  purpose: AccountActionTokenPurpose,
): Promise<{ token: string; expires: Date }> {
  const normalizedIdentifier = normalizeEmail(identifier);
  const now = new Date();
  const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  const expires = new Date(now.getTime() + ttlFor(purpose));

  await prisma.$transaction(async (tx) => {
    await tx.accountActionToken.deleteMany({
      where: { identifier: normalizedIdentifier, purpose },
    });
    await tx.accountActionToken.create({
      data: {
        identifier: normalizedIdentifier,
        tokenHash: hashToken(token),
        purpose,
        expires,
      },
    });
  });

  return { token, expires };
}

export async function canIssueAccountActionToken(
  identifier: string,
  purpose: AccountActionTokenPurpose,
): Promise<boolean> {
  const existing = await prisma.accountActionToken.findFirst({
    where: { identifier: normalizeEmail(identifier), purpose },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return !existing || Date.now() - existing.createdAt.getTime() >= RESEND_COOLDOWN_MS;
}

export async function invalidateAccountActionTokens(
  identifier: string,
  purpose: AccountActionTokenPurpose,
): Promise<void> {
  await prisma.accountActionToken.deleteMany({
    where: { identifier: normalizeEmail(identifier), purpose },
  });
}

export async function consumeAccountActionToken(
  identifier: string,
  token: string,
  purpose: AccountActionTokenPurpose,
): Promise<boolean> {
  const result = await prisma.accountActionToken.deleteMany({
    where: {
      identifier: normalizeEmail(identifier),
      tokenHash: hashToken(token),
      purpose,
      expires: { gt: new Date() },
    },
  });

  return result.count === 1;
}
