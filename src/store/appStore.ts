"use client";

import { create } from "zustand";

interface AppState {
  sidebarOpen: boolean;
  isDemo: boolean;
  chatOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setIsDemo: (demo: boolean) => void;
  setChatOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  toggleChat: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: false,
  isDemo: false,
  chatOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setIsDemo: (demo) => set({ isDemo: demo }),
  setChatOpen: (open) => set({ chatOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
}));
