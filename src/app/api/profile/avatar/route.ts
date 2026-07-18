import crypto from "crypto";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveBlobReadWriteToken } from "@/lib/blob-token";
import { prisma } from "@/lib/prisma";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function getImageType(bytes: Uint8Array): { extension: "jpg" | "png" | "webp"; contentType: string } | null {
  const isPng = bytes.length >= 8 && bytes.slice(0, 8).every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  if (isPng) return { extension: "png", contentType: "image/png" };
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { extension: "jpg", contentType: "image/jpeg" };
  const isWebp = bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (isWebp) return { extension: "webp", contentType: "image/webp" };
  return null;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = resolveBlobReadWriteToken();
  if (!token) return NextResponse.json({ error: "Avatar storage is not configured." }, { status: 503 });

  const formData = await request.formData();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: "Choose a JPG, PNG, or WebP image up to 2 MB." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const imageType = getImageType(bytes);
  if (!imageType) return NextResponse.json({ error: "Choose a valid JPG, PNG, or WebP image." }, { status: 400 });

  try {
    const blob = await put(`avatars/${userId}/${crypto.randomUUID()}.${imageType.extension}`, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: imageType.contentType,
      token,
    });
    await prisma.user.update({ where: { id: userId }, data: { image: blob.url } });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Avatar upload failed:", error);
    return NextResponse.json({ error: "Unable to upload your avatar." }, { status: 500 });
  }
}
