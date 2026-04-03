"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useAppStore } from "@/store/appStore";
import {
  useThreads,
  useThread,
  useSendMessage,
  useCreateThread,
  type MessageThread,
  type ThreadMessage,
} from "@/hooks/useMessages";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Send,
  Loader2,
  Plus,
  ArrowLeft,
  Inbox,
} from "lucide-react";

function roleBadgeVariant(role: string) {
  switch (role) {
    case "provider":
      return "default" as const;
    case "school":
      return "secondary" as const;
    case "therapist":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

function roleLabel(role: string) {
  switch (role) {
    case "parent":
      return "Parent";
    case "provider":
      return "Provider";
    case "school":
      return "School";
    case "therapist":
      return "Therapist";
    case "admin":
      return "Admin";
    default:
      return role;
  }
}

function relativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function MessageBubble({
  message,
  isOwn,
}: {
  message: ThreadMessage;
  isOwn: boolean;
}) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        }`}
      >
        {!isOwn && (
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-semibold">
              {message.sender_name ?? roleLabel(message.sender_role)}
            </span>
            <Badge
              variant={roleBadgeVariant(message.sender_role)}
              className="text-[8px] px-1 py-0 h-3.5"
            >
              {roleLabel(message.sender_role)}
            </Badge>
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p
          className={`text-[10px] mt-1 ${
            isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
          }`}
        >
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

function ThreadListItem({
  thread,
  isActive,
  onClick,
}: {
  thread: MessageThread;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-border transition-colors hover:bg-muted/50 ${
        isActive ? "bg-muted" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium truncate flex-1">
          {thread.thread_subject}
        </h3>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {relativeTime(thread.last_message_at)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
        {thread.last_message}
      </p>
      <div className="flex items-center gap-1.5 mt-1">
        <Badge
          variant={roleBadgeVariant(thread.last_sender_role)}
          className="text-[8px] px-1 py-0 h-3.5"
        >
          {roleLabel(thread.last_sender_role)}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {thread.message_count} message{thread.message_count !== 1 ? "s" : ""}
        </span>
      </div>
    </button>
  );
}

function ThreadView({
  threadId,
  subject,
  userId,
  onBack,
}: {
  threadId: string;
  subject: string;
  userId: string;
  onBack: () => void;
}) {
  const { data: messages, isLoading } = useThread(threadId);
  const sendMessage = useSendMessage();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    await sendMessage.mutateAsync({
      threadId,
      content: newMessage.trim(),
    });
    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          className="md:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
        <h2 className="text-sm font-medium font-heading truncate">{subject}</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages && messages.length > 0 ? (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.sender_id === userId}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No messages yet.
          </div>
        )}
      </div>

      {/* Send */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message…"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMessage.isPending}
            size="sm"
            className="h-9 px-3"
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function NewThreadDialog({ onCreated }: { onCreated: (threadId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const createThread = useCreateThread();

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) return;
    const result = await createThread.mutateAsync({
      subject: subject.trim(),
      content: message.trim(),
    });
    setSubject("");
    setMessage("");
    setOpen(false);
    if (result?.message?.thread_id) {
      onCreated(result.message.thread_id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Thread</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Subject
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Medication Update"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your first message…"
              rows={3}
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={
              !subject.trim() || !message.trim() || createThread.isPending
            }
            size="sm"
          >
            {createThread.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Send className="h-3.5 w-3.5 mr-1.5" />
            )}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const { isDemo } = useAppStore();
  const { data: threads, isLoading: threadsLoading } = useThreads();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const activeThread = threads?.find((t) => t.thread_id === activeThreadId);

  // Demo mode: use demo-parent as userId
  const userId = isDemo ? "demo-parent" : user?.id ?? "";

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user && !isDemo) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">
          Please sign in to view messages.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            Messages
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Communicate with your care team.
          </p>
        </div>
        {!isDemo && <NewThreadDialog onCreated={setActiveThreadId} />}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex h-[calc(100vh-16rem)] min-h-[400px]">
            {/* Thread list */}
            <div
              className={`w-full md:w-80 md:border-r border-border flex flex-col shrink-0 ${
                activeThreadId ? "hidden md:flex" : "flex"
              }`}
            >
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Conversations
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                {threadsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : threads && threads.length > 0 ? (
                  threads.map((thread) => (
                    <ThreadListItem
                      key={thread.thread_id}
                      thread={thread}
                      isActive={thread.thread_id === activeThreadId}
                      onClick={() => setActiveThreadId(thread.thread_id)}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <Inbox className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No conversations yet.
                    </p>
                    {!isDemo && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Start a new thread to message your care team.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Thread view */}
            <div
              className={`flex-1 flex flex-col ${
                activeThreadId ? "flex" : "hidden md:flex"
              }`}
            >
              {activeThreadId && activeThread ? (
                <ThreadView
                  threadId={activeThreadId}
                  subject={activeThread.thread_subject}
                  userId={userId}
                  onBack={() => setActiveThreadId(null)}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Select a conversation to view messages
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
