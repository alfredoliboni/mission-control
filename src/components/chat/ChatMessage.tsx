"use client";

import type { ChatMessage as ChatMessageType } from "@/types/workspace";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/workspace/MarkdownRenderer";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-warm-100 text-foreground"
        )}
      >
        {message.isFallback && !isUser && (
          <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-amber-600 font-medium">
            <span aria-hidden="true">&#9888;</span>
            <span>Navigator offline — cached response</span>
          </div>
        )}
        {isUser ? (
          <p className="text-sm">{message.content}</p>
        ) : (
          <div className="text-sm [&_p]:mb-1 [&_p:last-child]:mb-0 [&_strong]:text-foreground">
            <MarkdownRenderer content={message.content} />
          </div>
        )}
        <p
          className={cn(
            "text-[10px] mt-1",
            isUser ? "text-primary-foreground/60" : "text-warm-300"
          )}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
