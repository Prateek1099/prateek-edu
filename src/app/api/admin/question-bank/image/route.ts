import crypto from "node:crypto";

import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { resolveBlobReadWriteToken } from "@/lib/blob-token";
import {
  MAX_BANK_QUESTION_IMAGE_BYTES,
  validateBankQuestionImageFile,
} from "@/lib/question-bank-image";
import { isSuperAdmin } from "@/lib/roles";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdmin((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = resolveBlobReadWriteToken();
  if (!token) {
    return NextResponse.json({ error: "Question image storage is not configured." }, { status: 503 });
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BANK_QUESTION_IMAGE_BYTES + 256_000) {
    return NextResponse.json({ error: "Choose an image up to 5 MB." }, { status: 413 });
  }

  const formData = await request.formData();
  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  }
  if (file.size < 1 || file.size > MAX_BANK_QUESTION_IMAGE_BYTES) {
    return NextResponse.json({ error: "Choose a PNG, JPG, or WebP image up to 5 MB." }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateBankQuestionImageFile({
    filename: file.name,
    contentType: file.type,
    size: file.size,
    bytes,
  });
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 415 });
  }

  try {
    const blob = await put(
      `question-bank/${crypto.randomUUID()}.${validation.imageType.extension}`,
      file,
      {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: validation.imageType.contentType,
        token,
      },
    );
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Question Bank image upload failed:", error);
    return NextResponse.json({ error: "Unable to upload the supporting image." }, { status: 500 });
  }
}
