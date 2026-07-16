import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  try {
    const { name, email, password, registerAs, workspaceName } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isTeacherReg = registerAs === "teacher";
    const role = isTeacherReg ? "TEACHER" : "STUDENT";

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { name, email, password: hashedPassword, role },
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

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    await sendVerificationEmail(email, token);

    return NextResponse.json({ message: "User registered successfully", userId: user.id });
  } catch (error: any) {
    console.error("Registration Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
