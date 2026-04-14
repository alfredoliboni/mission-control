"use client";

import { create } from "zustand";

interface AppState {
  sidebarOpen: boolean;
  chatOpen: boolean;
  activeChildIndex: number;
  setSidebarOpen: (open: boolean) => void;
  setChatOpen: (open: boolean) => void;
  setActiveChildIndex: (index: number) => void;
  toggleSidebar: () => void;
  toggleChat: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: false,
  chatOpen: false,
  activeChildIndex: 0,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setChatOpen: (open) => set({ chatOpen: open }),
  setActiveChildIndex: (index) => set({ activeChildIndex: index }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
}));
