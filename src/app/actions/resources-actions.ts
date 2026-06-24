"use server";

import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PREFERENCE_COOKIE = "examnest_ecosystem";

export async function setEcosystemPreference(board: string, qualification: string) {
  const cookieStore = await cookies();
  cookieStore.set(PREFERENCE_COOKIE, JSON.stringify({ board, qualification }), {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { preferredBoard: board, preferredQualification: qualification },
    });
  }
}

export async function clearEcosystemPreference() {
  const cookieStore = await cookies();
  cookieStore.delete(PREFERENCE_COOKIE);

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { preferredBoard: null, preferredQualification: null },
    });
  }
}

export async function getEcosystemPreference() {
  try {
    const cookieStore = await cookies();
    const pref = cookieStore.get(PREFERENCE_COOKIE);
    
    if (pref) {
      try {
        return JSON.parse(pref.value) as { board: string; qualification: string };
      } catch (e) {
        // invalid cookie JSON
      }
    }

    // If no cookie, check database for logged-in user
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferredBoard: true, preferredQualification: true },
      });
      if (user?.preferredBoard && user?.preferredQualification) {
        // Re-instate the cookie
        cookieStore.set(PREFERENCE_COOKIE, JSON.stringify({ board: user.preferredBoard, qualification: user.preferredQualification }), {
          maxAge: 60 * 60 * 24 * 365,
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
        return { board: user.preferredBoard, qualification: user.preferredQualification };
      }
    }

    return null;
  } catch (error) {
    // If session resolution or DB lookup fails (corrupted cookie, DB issue),
    // return null gracefully instead of crashing the page.
    console.error("getEcosystemPreference: Failed, returning null:", error);
    return null;
  }
}

