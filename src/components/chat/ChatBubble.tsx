"use client";

import { MessageCircle } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useChat } from "@/hooks/useChat";
import { ChatPanel } from "./ChatPanel";

export function ChatBubble() {
  const { chatOpen, toggleChat, sidebarOpen } = useAppStore();
  const { unreadCount, markRead } = useChat();

  const handleOpen = () => {
    toggleChat();
    if (!chatOpen) {
      markRead();
    }
  };

  // Hide bubble on mobile when sidebar is open
  if (sidebarOpen) return <ChatPanel />;

  return (
    <>
      <ChatPanel />

      {/* Floating bubble button */}
      <button
        onClick={handleOpen}
        className={`fixed bottom-4 right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 ${
          chatOpen
            ? "translate-y-4 opacity-0 pointer-events-none"
            : "translate-y-0 opacity-100"
        }`}
        aria-label="Open chat with Navigator"
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && !chatOpen && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-status-blocked text-white text-[10px] font-bold flex items-center justify-center animate-in fade-in zoom-in">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </>
  );
}
