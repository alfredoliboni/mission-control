"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useActiveAgent } from "@/hooks/useActiveAgent";
import { Send, Plus, MessageSquare, Loader2, ArrowLeft } from "lucide-react";
import { useWorkspaceFile } from "@/hooks/useWorkspace";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { MarkdownRenderer } from "@/components/workspace/MarkdownRenderer";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { ThreadSummary, MessageRow } from "@/app/api/messages/route";

// ── Data fetching ────────────────────────────────────────────────────────

async function fetchThreads(): Promise<{ threads: ThreadSummary[] }> {
  const res = await fetch("/api/messages");
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

async function sendMessage(body: {
  thread_id?: string;
  new_thread_subject?: string;
  recipient_id?: string;
  recipient_name?: string;
  content: string;
}): Promise<{ success: boolean; message: { id: string; content: string; created_at: string } }> {
  const res = await fetch("/api/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}

// ── Care team contact type ─────────────────────────────────────────────

interface CareTeamContact {
  id: string;
  stakeholder_id: string;
  name: string;
  role: string;
  organization?: string;
}

// Contacts come from useTeamMembers() — no hardcoded demo data

// ── Helpers ──────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function displayName(msg: { sender_role: string; sender_name?: string }): string {
  if (msg.sender_role === "parent") return "You";
  if (msg.sender_name) return msg.sender_name;
  // Fallback to role label
  const labels: Record<string, string> = {
    doctor: "Doctor",
    therapist: "Therapist",
    school: "School",
    navigator: "Navigator",
  };
  return labels[msg.sender_role] ?? msg.sender_role;
}

function roleColor(role: string): string {
  const colors: Record<string, string> = {
    doctor: "text-status-current",
    therapist: "text-status-success",
    school: "text-status-caution",
    navigator: "text-status-gap-filler",
  };
  return colors[role] ?? "text-warm-400";
}

function senderInitial(name: string, role: string): string {
  // Use first letter of the real name if available
  if (name && name !== role) {
    return name.charAt(0).toUpperCase();
  }
  const initials: Record<string, string> = {
    parent: "Y",
    doctor: "D",
    therapist: "T",
    school: "S",
    navigator: "N",
  };
  return initials[role] ?? "?";
}

// ── Build Navigator thread from workspace messages.md ────────────────────

function buildNavigatorThread(markdownContent: string): ThreadSummary | null {
  if (!markdownContent?.trim()) return null;

  const navigatorMsg: MessageRow = {
    id: "navigator-workspace",
    family_id: "",
    thread_id: "navigator-thread",
    thread_subject: "Navigator Updates",
    sender_id: "navigator",
    sender_role: "navigator",
    content: markdownContent,
    attachments: null,
    created_at: new Date().toISOString(),
  };

  return {
    id: "navigator-thread",
    subject: "Navigator Updates",
    messages: [navigatorMsg],
    lastMessage: navigatorMsg,
  };
}

// ── Components ───────────────────────────────────────────────────────────

function ThreadListItem({
  thread,
  isSelected,
  onClick,
}: {
  thread: ThreadSummary;
  isSelected: boolean;
  onClick: () => void;
}) {
  const last = thread.lastMessage;
  const isNavigator = thread.id === "navigator-thread";
  const preview =
    last.content.length > 80
      ? last.content.slice(0, 80) + "..."
      : last.content;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-border transition-colors",
        isSelected
          ? "bg-primary/5 border-l-2 border-l-primary"
          : "hover:bg-warm-50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white",
              isNavigator
                ? "bg-status-gap-filler"
                : last.sender_role === "doctor"
                  ? "bg-status-current"
                  : last.sender_role === "school"
                    ? "bg-status-caution"
                    : last.sender_role === "therapist"
                      ? "bg-status-success"
                      : "bg-primary"
            )}
          >
            {isNavigator ? "N" : senderInitial(last.sender_name || "", last.sender_role)}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm text-foreground truncate">
              {thread.subject}
            </p>
            <p className="text-xs text-warm-400 truncate mt-0.5">{preview}</p>
          </div>
        </div>
        <span className="text-[10px] text-warm-300 whitespace-nowrap shrink-0 mt-0.5">
          {formatDate(last.created_at)}
        </span>
      </div>
    </button>
  );
}

function MessageBubble({
  message,
  isOwn,
}: {
  message: MessageRow;
  isOwn: boolean;
}) {
  const isNavigator = message.sender_role === "navigator";

  return (
    <div
      className={cn("flex mb-3", isOwn ? "justify-end" : "justify-start")}
    >
      <div className={cn("max-w-[80%]", isOwn ? "items-end" : "items-start")}>
        {/* Sender label */}
        <div
          className={cn(
            "flex items-center gap-1.5 mb-1 text-[11px]",
            isOwn ? "justify-end" : "justify-start"
          )}
        >
          <span className={cn("font-medium", roleColor(message.sender_role))}>
            {displayName(message)}
          </span>
          <span className="text-warm-300">
            {formatTime(message.created_at)}
          </span>
        </div>

        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isOwn
              ? "bg-primary/10 text-foreground"
              : isNavigator
                ? "bg-status-gap-filler/10 text-foreground border border-status-gap-filler/20"
                : "bg-warm-100 text-foreground"
          )}
        >
          {isNavigator ? (
            <div className="text-sm [&_p]:mb-1 [&_p:last-child]:mb-0 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:ml-3 [&_li]:text-sm">
              <MarkdownRenderer content={message.content} />
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* Attachments */}
        {message.attachments &&
          Array.isArray(message.attachments) &&
          message.attachments.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {(message.attachments as { name: string }[]).map((att, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-[11px] text-warm-400 bg-warm-50 rounded px-2 py-0.5 border border-border"
                >
                  <span>📎</span>
                  {att.name}
                </span>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

function NewThreadForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (threadId: string) => void;
}) {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const queryClient = useQueryClient();

  // Contacts from family_team_members (Supabase) — filtered by active child
  const { data: teamData, isLoading: contactsLoading } = useTeamMembers();
  const effectiveContacts: CareTeamContact[] = (teamData?.active ?? []).map((m) => ({
    id: m.id,
    stakeholder_id: m.id,
    name: m.name,
    role: m.role,
    organization: m.organization ?? undefined,
  }));

  const selectedContact = effectiveContacts.find(
    (c) => c.stakeholder_id === selectedContactId
  );

  const mutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      onCreated(data.message.id);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !content.trim() || !selectedContact) return;
    mutation.mutate({
      new_thread_subject: subject.trim(),
      recipient_id: selectedContact.stakeholder_id,
      recipient_name: selectedContact.name,
      content: content.trim(),
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <button
          onClick={onCancel}
          className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-warm-100 transition-colors sm:hidden"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="font-heading font-semibold text-sm">New Message</h2>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-4 gap-3">
        {/* Contact picker */}
        <div>
          <label
            htmlFor="new-thread-recipient"
            className="block text-xs font-medium text-warm-400 mb-1"
          >
            To
          </label>
          {contactsLoading ? (
            <div className="flex items-center gap-2 h-8 px-2.5 text-sm text-warm-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading care team...
            </div>
          ) : effectiveContacts.length === 0 ? (
            <p className="text-xs text-warm-400 py-2">
              No care team members found. Invite members in Settings first.
            </p>
          ) : (
            <div className="space-y-1.5">
              {effectiveContacts.map((contact) => {
                const isSelected = selectedContactId === contact.stakeholder_id;
                return (
                  <button
                    key={contact.stakeholder_id}
                    type="button"
                    onClick={() => setSelectedContactId(contact.stakeholder_id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg border transition-colors flex items-center gap-3",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:border-warm-200 hover:bg-warm-50"
                    )}
                  >
                    <div
                      className={cn(
                        "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white",
                        contact.role.toLowerCase().includes("doctor") || contact.role.toLowerCase() === "md" || contact.role.toLowerCase() === "physician"
                          ? "bg-status-current"
                          : contact.role.toLowerCase().includes("school") || contact.role.toLowerCase().includes("teacher")
                            ? "bg-status-caution"
                            : contact.role.toLowerCase().includes("ot") || contact.role.toLowerCase().includes("therapist") || contact.role.toLowerCase().includes("slp") || contact.role.toLowerCase().includes("aba")
                              ? "bg-status-success"
                              : "bg-primary"
                      )}
                    >
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {contact.name}
                      </p>
                      <p className="text-[11px] text-warm-400 truncate">
                        {contact.role}
                        {contact.organization ? ` — ${contact.organization}` : ""}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Subject */}
        <div>
          <label
            htmlFor="new-thread-subject"
            className="block text-xs font-medium text-warm-400 mb-1"
          >
            Subject
          </label>
          <input
            id="new-thread-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., Follow-up on assessment"
            className="w-full h-8 rounded-lg border border-input bg-warm-50 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        {/* Message */}
        <div className="flex-1">
          <label
            htmlFor="new-thread-content"
            className="block text-xs font-medium text-warm-400 mb-1"
          >
            Message
          </label>
          <textarea
            id="new-thread-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your message..."
            rows={5}
            className="w-full rounded-lg border border-input bg-warm-50 px-2.5 py-2 text-sm outline-none resize-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 px-4 rounded-lg text-sm font-medium text-warm-400 hover:bg-warm-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              !selectedContactId || !subject.trim() || !content.trim() || mutation.isPending
            }
            className="h-11 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function ConversationView({
  thread,
  onBack,
}: {
  thread: ThreadSummary;
  onBack: () => void;
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const isNavigator = thread.id === "navigator-thread";

  const mutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: () => {
      setInput("");
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [thread.messages, scrollToBottom]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || mutation.isPending) return;
    mutation.mutate({
      thread_id: thread.id,
      content: input.trim(),
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
        <button
          onClick={onBack}
          className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-warm-100 transition-colors sm:hidden"
          aria-label="Back to threads"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="font-heading font-semibold text-sm">
            {thread.subject}
          </h2>
          <p className="text-[11px] text-warm-300">
            {thread.messages.length} message
            {thread.messages.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {thread.messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.sender_role === "parent"}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input — hidden for navigator thread */}
      {!isNavigator && (
        <form
          onSubmit={handleSubmit}
          className="px-4 py-3 border-t border-border shrink-0"
        >
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a reply..."
              disabled={mutation.isPending}
              className="flex-1 h-8 rounded-lg border border-input bg-warm-50 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              aria-label="Reply message"
            />
            <button
              type="submit"
              disabled={!input.trim() || mutation.isPending}
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Send reply"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showNewThread, setShowNewThread] = useState(false);
  const [familyId, setFamilyId] = useState<string | undefined>(undefined);

  // Active child agent — used to scope threads and trigger refetch on child switch
  const agentId = useActiveAgent();
  const prevAgentRef = useRef<string | undefined>(agentId);

  // Reset thread state when switching children
  useEffect(() => {
    if (agentId !== prevAgentRef.current) {
      prevAgentRef.current = agentId;
      setSelectedThreadId(null);
      setShowNewThread(false);
    }
  }, [agentId]);

  // Resolve the current user's ID (used as family_id for realtime)
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled && user) setFamilyId(user.id);
    });
    return () => { cancelled = true; };
  }, []);

  // Subscribe to realtime message inserts — instant updates
  useRealtimeMessages(familyId);

  // Fetch threads from API (long fallback interval since realtime handles updates)
  // Include agentId in query key so threads refetch when child switches
  const {
    data: threadsData,
    isLoading: threadsLoading,
  } = useQuery({
    queryKey: ["messages", agentId],
    queryFn: fetchThreads,
    refetchInterval: 60_000,
  });

  // Fetch workspace messages.md for Navigator thread
  const { data: workspaceMessages } = useWorkspaceFile("messages.md");

  // Build combined thread list
  const navigatorThread = buildNavigatorThread(workspaceMessages ?? "");
  const allThreads = useMemo<ThreadSummary[]>(() => {
    const threads = threadsData?.threads ?? [];
    return [
      ...threads,
      ...(navigatorThread ? [navigatorThread] : []),
    ];
  }, [threadsData, navigatorThread]);

  // Auto-select first thread if none selected
  const effectiveThreadId = selectedThreadId || (!showNewThread && allThreads.length > 0 ? allThreads[0].id : null);
  const selectedThread = allThreads.find((t) => t.id === effectiveThreadId);

  const handleNewThreadCreated = () => {
    setShowNewThread(false);
    // Threads will refresh via React Query invalidation
  };

  // Loading state
  if (threadsLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">
            💬
          </span>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Messages
          </h1>
        </div>
        <div className="bg-card border border-border rounded-xl h-[calc(100dvh-12rem)] flex items-center justify-center">
          <div className="flex items-center gap-2 text-warm-300">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading messages...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden="true">
          💬
        </span>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Messages
        </h1>
      </div>

      {/* Two-panel layout */}
      <div className="bg-card border border-border rounded-xl overflow-hidden h-[calc(100dvh-12rem)] flex">
        {/* Left panel — Thread list */}
        <div
          className={cn(
            "border-r border-border flex flex-col shrink-0",
            // On mobile: full width when no thread selected, hidden when thread selected
            selectedThreadId || showNewThread
              ? "hidden sm:flex sm:w-80"
              : "w-full sm:w-80"
          )}
        >
          {/* New message button */}
          <div className="px-4 py-3 border-b border-border shrink-0">
            <button
              onClick={() => {
                setShowNewThread(true);
                setSelectedThreadId(null);
              }}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              New Message
            </button>
          </div>

          {/* Thread list */}
          <div className="flex-1 overflow-y-auto">
            {allThreads.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="h-8 w-8 text-warm-200 mx-auto mb-2" />
                <p className="text-sm text-warm-400">No messages yet</p>
                <p className="text-xs text-warm-300 mt-1">
                  Start a conversation with your care team
                </p>
              </div>
            ) : (
              allThreads.map((thread) => (
                <ThreadListItem
                  key={thread.id}
                  thread={thread}
                  isSelected={selectedThreadId === thread.id}
                  onClick={() => {
                    setSelectedThreadId(thread.id);
                    setShowNewThread(false);
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Right panel — Conversation or New Thread form */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0",
            // On mobile: hidden when no thread selected
            !selectedThreadId && !showNewThread
              ? "hidden sm:flex"
              : "flex"
          )}
        >
          {showNewThread ? (
            <NewThreadForm
              onCancel={() => {
                setShowNewThread(false);
                if (allThreads.length > 0) {
                  setSelectedThreadId(allThreads[0].id);
                }
              }}
              onCreated={handleNewThreadCreated}
            />
          ) : selectedThread ? (
            <ConversationView
              thread={selectedThread}
              onBack={() => setSelectedThreadId(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-10 w-10 text-warm-200 mx-auto mb-3" />
                <p className="text-sm text-warm-400">
                  Select a conversation to view
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
