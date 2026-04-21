"use client";

import { create } from "zustand";
import type { FamilyAgent } from "@/lib/family-agents";

interface AppState {
  sidebarOpen: boolean;
  chatOpen: boolean;
  activeChildIndex: number;
  resolvedFamily: FamilyAgent | null;
  pendingChatMessage: string | null;
  setSidebarOpen: (open: boolean) => void;
  setChatOpen: (open: boolean) => void;
  setActiveChildIndex: (index: number) => void;
  setResolvedFamily: (family: FamilyAgent) => void;
  setPendingChatMessage: (msg: string | null) => void;
  toggleSidebar: () => void;
  toggleChat: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: false,
  chatOpen: false,
  activeChildIndex: 0,
  resolvedFamily: null,
  pendingChatMessage: null,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setChatOpen: (open) => set({ chatOpen: open }),
  setActiveChildIndex: (index) => set({ activeChildIndex: index }),
  setResolvedFamily: (family) => set({ resolvedFamily: family }),
  setPendingChatMessage: (msg) => set({ pendingChatMessage: msg }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
}));
