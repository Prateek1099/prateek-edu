"use client";

import { createContext, useContext, ReactNode } from "react";

type WorkspaceData = {
  id: string;
  name: string;
  slug: string;
  status: string;
  _count: { classes: number; members: number; content: number };
};

const WorkspaceContext = createContext<WorkspaceData | null>(null);

export function WorkspaceProvider({ workspace, children }: { workspace: WorkspaceData; children: ReactNode }) {
  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
