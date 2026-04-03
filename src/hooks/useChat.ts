"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { ChatMessage } from "@/types/workspace";

const STORAGE_KEY = "companion-chat-history";
const MAX_HISTORY = 50;

function loadMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return parsed.map((m: ChatMessage & { timestamp: string }) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]) {
  try {
    const trimmed = messages.slice(-MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage full or unavailable
  }
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const initializedRef = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      const stored = loadMessages();
      if (stored.length > 0) {
        setMessages(stored);
      }
    }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (initializedRef.current && messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages]);

  const markRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const history = messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            history,
            context: { page: pathname },
          }),
        });

        if (!res.ok) throw new Error("Chat request failed");

        const data = await res.json();

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setUnreadCount((c) => c + 1);
      } catch {
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Sorry, I couldn't process that right now. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, pathname]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setUnreadCount(0);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { messages, isLoading, sendMessage, clearMessages, unreadCount, markRead };
}
