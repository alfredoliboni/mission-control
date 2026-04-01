"use client";

import { MessageCircle } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { ChatPanel } from "./ChatPanel";

export function ChatBubble() {
  const { chatOpen, toggleChat } = useAppStore();

  return (
    <>
      <ChatPanel />

      {/* Floating bubble button */}
      {!chatOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-4 right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          aria-label="Open chat with Navigator"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
    </>
  );
}
