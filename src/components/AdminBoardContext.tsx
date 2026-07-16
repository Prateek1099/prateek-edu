"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type AdminBoardContextType = {
  selectedBoard: string; // "all" | "cambridge" | "cbse"
  setSelectedBoard: (board: string) => void;
};

const AdminBoardContext = createContext<AdminBoardContextType>({
  selectedBoard: "all",
  setSelectedBoard: () => {},
});

const STORAGE_KEY = "vexa_admin_board";

export function AdminBoardProvider({ children }: { children: ReactNode }) {
  const [selectedBoard, setSelectedBoardState] = useState("all");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSelectedBoardState(stored);
    }
    setHydrated(true);
  }, []);

  const setSelectedBoard = (board: string) => {
    setSelectedBoardState(board);
    localStorage.setItem(STORAGE_KEY, board);
  };

  // Prevent flash of wrong board
  if (!hydrated) {
    return <>{children}</>;
  }

  return (
    <AdminBoardContext.Provider value={{ selectedBoard, setSelectedBoard }}>
      {children}
    </AdminBoardContext.Provider>
  );
}

export function useAdminBoard() {
  return useContext(AdminBoardContext);
}
