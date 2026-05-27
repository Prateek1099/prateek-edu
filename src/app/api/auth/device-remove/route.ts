import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { deviceId } = await req.json();

  if (!deviceId) {
    return NextResponse.json({ error: "Missing deviceId" }, { status: 400 });
  }

  try {
    await prisma.deviceSession.deleteMany({
      where: {
        id: deviceId,
        userId: userId, // Ensure user owns this device session
      }
    });

    return NextResponse.json({ status: "ok" });
  } catch (e: any) {
    console.error("Device remove error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
