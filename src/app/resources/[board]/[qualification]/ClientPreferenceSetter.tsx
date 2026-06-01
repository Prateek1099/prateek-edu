"use client";

import { useEffect } from "react";
import { setEcosystemPreference } from "@/app/actions/resources-actions";

export function ClientPreferenceSetter({ board, qualification }: { board: string; qualification: string }) {
  useEffect(() => {
    setEcosystemPreference(board, qualification);
  }, [board, qualification]);
  return null;
}
