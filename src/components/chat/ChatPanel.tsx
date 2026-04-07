"use client";

import { useRef, useEffect, useState } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "./ChatMessage";
import { useChat } from "@/hooks/useChat";
import { useAppStore } from "@/store/appStore";

export function ChatPanel() {
  const { chatOpen, setChatOpen } = useAppStore();
  const { messages, isLoading, sendMessage } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [chatOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  };

  if (!chatOpen) return null;

  return (
    <>
      {/* Mobile: full screen, Desktop: fixed panel */}
      <div
        className="fixed inset-0 sm:inset-auto sm:bottom-20 sm:right-4 z-50 sm:w-[400px] sm:h-[500px] bg-card sm:rounded-2xl sm:shadow-2xl sm:border sm:border-border flex flex-col overflow-hidden"
        role="dialog"
        aria-label="Chat with Navigator"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">
              🧭
            </span>
            <h2 className="font-heading font-semibold text-sm">
              Chat with Navigator
            </h2>
          </div>
          <button
            onClick={() => setChatOpen(false)}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-warm-100 transition-colors"
            aria-label="Close chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0" ref={scrollRef}>
          <div className="space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <p className="text-3xl mb-2" aria-hidden="true">
                  🧭
                </p>
                <p className="text-sm text-warm-400">
                  Ask me anything about Alex&apos;s pathway, benefits, or
                  services.
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-warm-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Thinking...</span>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="px-4 py-3 border-t border-border shrink-0"
        >
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1"
              aria-label="Chat message input"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
