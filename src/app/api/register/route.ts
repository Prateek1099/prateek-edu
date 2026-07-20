import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { AccountActionTokenPurpose } from "@prisma/client";
import { invalidateAccountActionTokens, isValidEmail, issueAccountActionToken, normalizeEmail } from "@/lib/account-action-tokens";
import { validatePassword } from "@/lib/passwords";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  try {
    const { name, email, password, registerAs, workspaceName } = await req.json();
    const normalizedEmail = typeof email === "string" ? normalizeEmail(email) : "";

    if (!name || !normalizedEmail || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const isTeacherReg = registerAs === "teacher";
    const role = isTeacherReg ? "TEACHER" : "STUDENT";

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { name: name.trim(), email: normalizedEmail, password: hashedPassword, role },
      });

      // Teachers get an auto-created workspace (pending admin approval)
      if (isTeacherReg) {
        const wsName = workspaceName?.trim() || `${name}'s Workspace`;
        const baseSlug = slugify(wsName);
        const slug = `${baseSlug}-${newUser.id.slice(-4)}`;
        await tx.workspace.create({
          data: { name: wsName, slug, ownerId: newUser.id, status: "PENDING_APPROVAL" },
        });
      }

      return newUser;
    });

    const { token } = await issueAccountActionToken(normalizedEmail, AccountActionTokenPurpose.EMAIL_VERIFICATION);
    try {
      await sendVerificationEmail(normalizedEmail, token);
    } catch {
      await invalidateAccountActionTokens(normalizedEmail, AccountActionTokenPurpose.EMAIL_VERIFICATION);
      console.error("Registration completed but its verification email was not delivered.", {
        userId: user.id,
        recipientDomain: normalizedEmail.split("@").at(-1),
      });
      return NextResponse.json(
        {
          error: "Your account was created, but we could not send the verification email. Please use Resend Verification Email to try again.",
          accountCreated: true,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ message: "Verification email sent", userId: user.id });
  } catch (error: unknown) {
    console.error("Registration Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
