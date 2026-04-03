"use client";

import { useRef, useEffect, useState } from "react";
import { X, Send, Loader2, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "./ChatMessage";
import { useChat } from "@/hooks/useChat";
import { useAppStore } from "@/store/appStore";

const DEMO_SEEDED_MESSAGES = [
  {
    id: "demo-1",
    role: "assistant" as const,
    content:
      "Welcome to Mission Control! I'm your Navigator assistant. I help families track autism services, benefits, and programs across Ontario. How can I help you today?",
    timestamp: new Date(Date.now() - 120_000),
  },
  {
    id: "demo-2",
    role: "user" as const,
    content: "What's the status of Alex's OAP pathway?",
    timestamp: new Date(Date.now() - 90_000),
  },
  {
    id: "demo-3",
    role: "assistant" as const,
    content:
      "Alex is currently in the **Registered & Waiting** stage. The OAP Childhood Budget application was submitted on March 1, 2026. Based on current processing times, approval is expected within 4-6 weeks. I'm monitoring weekly for updates and will alert you when anything changes.",
    timestamp: new Date(Date.now() - 60_000),
  },
];

export function ChatPanel() {
  const { chatOpen, setChatOpen, isDemo } = useAppStore();
  const { messages, isLoading, sendMessage, clearMessages, markRead } =
    useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Show demo seeded messages when in demo mode and no real messages exist
  const displayMessages =
    isDemo && messages.length === 0 ? DEMO_SEEDED_MESSAGES : messages;

  useEffect(() => {
    if (chatOpen) {
      markRead();
      // Small delay to wait for panel animation
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [chatOpen, markRead]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMessages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  };

  if (!chatOpen) return null;

  return (
    <div
      className="fixed inset-0 sm:inset-auto sm:bottom-20 sm:right-4 z-50 sm:w-[400px] sm:h-[500px] bg-card sm:rounded-2xl sm:shadow-2xl sm:border sm:border-border flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-200"
      role="dialog"
      aria-label="Chat with Mission Control Assistant"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">
            🧭
          </span>
          <h2 className="font-heading font-semibold text-sm">
            Mission Control Assistant
          </h2>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="p-1.5 rounded-md hover:bg-warm-100 transition-colors text-warm-300 hover:text-warm-500"
              aria-label="Clear chat history"
              title="Clear history"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => setChatOpen(false)}
            className="p-1.5 rounded-md hover:bg-warm-100 transition-colors"
            aria-label="Minimize chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Demo disclaimer */}
      {isDemo && (
        <div className="px-4 py-2 bg-warm-100 border-b border-border text-xs text-warm-400">
          Demo mode — responses are simulated examples
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
        <div className="space-y-3">
          {displayMessages.length === 0 && (
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
          {displayMessages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-warm-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Thinking...</span>
            </div>
          )}
        </div>
      </ScrollArea>

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
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
