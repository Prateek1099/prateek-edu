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
  const { deviceFingerprint, userAgent } = await req.json();

  if (!deviceFingerprint) {
    return NextResponse.json({ error: "Missing fingerprint" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        plan: true,
        deviceSessions: {
          orderBy: { lastActive: 'desc' }
        }
      }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const maxDevices = user.plan?.maxDevices || 1; // Default to 1 device if no plan
    const activeSessions = user.deviceSessions;

    const existingSession = activeSessions.find(s => s.deviceFingerprint === deviceFingerprint);

    if (existingSession) {
      // Update last active
      await prisma.deviceSession.update({
        where: { id: existingSession.id },
        data: { lastActive: new Date(), userAgent }
      });
      return NextResponse.json({ status: "ok" });
    }

    // New device
    if (activeSessions.length >= maxDevices) {
      // Netflix style: we do NOT auto-kick. We return limit reached.
      return NextResponse.json({ 
        status: "limit_reached", 
        devices: activeSessions,
        maxDevices 
      });
    }

    // Register new device
    await prisma.deviceSession.create({
      data: {
        userId,
        deviceFingerprint,
        userAgent: userAgent || "Unknown",
      }
    });

    return NextResponse.json({ status: "ok" });
  } catch (e: any) {
    console.error("Device check error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
