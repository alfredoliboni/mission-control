"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/appStore";
import {
  getDemoThreads,
  getDemoThreadMessages,
  type DemoThread,
  type DemoMessage,
} from "@/data/demoMessages";

export interface MessageThread {
  thread_id: string;
  thread_subject: string;
  family_id: string;
  last_message: string;
  last_message_at: string;
  last_sender_role: string;
  last_sender_name?: string;
  message_count: number;
  participants?: { name: string; role: string }[];
}

export interface ThreadMessage {
  id: string;
  thread_id: string;
  thread_subject: string;
  family_id: string;
  sender_id: string;
  sender_name?: string;
  sender_role: string;
  content: string;
  created_at: string;
}

function mapDemoThread(t: DemoThread): MessageThread {
  return {
    thread_id: t.thread_id,
    thread_subject: t.thread_subject,
    family_id: t.family_id,
    last_message: t.last_message,
    last_message_at: t.last_message_at,
    last_sender_role: t.last_sender_role,
    last_sender_name: t.last_sender_name,
    message_count: t.message_count,
    participants: t.participants,
  };
}

function mapDemoMessage(m: DemoMessage): ThreadMessage {
  return {
    id: m.id,
    thread_id: m.thread_id,
    thread_subject: m.thread_subject,
    family_id: m.family_id,
    sender_id: m.sender_id,
    sender_name: m.sender_name,
    sender_role: m.sender_role,
    content: m.content,
    created_at: m.created_at,
  };
}

async function fetchThreads(): Promise<MessageThread[]> {
  const res = await fetch("/api/messages");
  if (!res.ok) throw new Error("Failed to fetch threads");
  const data = await res.json();
  return data.threads ?? [];
}

async function fetchThread(threadId: string): Promise<ThreadMessage[]> {
  const res = await fetch(`/api/messages/${threadId}`);
  if (!res.ok) throw new Error("Failed to fetch thread");
  const data = await res.json();
  return data.messages ?? [];
}

export function useThreads() {
  const { isDemo } = useAppStore();

  return useQuery<MessageThread[]>({
    queryKey: ["message-threads"],
    queryFn: () => {
      if (isDemo) return getDemoThreads().map(mapDemoThread);
      return fetchThreads();
    },
    refetchInterval: isDemo ? false : 15_000,
  });
}

export function useThread(threadId: string | null) {
  const { isDemo } = useAppStore();

  return useQuery<ThreadMessage[]>({
    queryKey: ["message-thread", threadId],
    queryFn: () => {
      if (!threadId) return [];
      if (isDemo) return getDemoThreadMessages(threadId).map(mapDemoMessage);
      return fetchThread(threadId);
    },
    enabled: !!threadId,
    refetchInterval: isDemo ? false : 10_000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      threadId,
      content,
      familyId,
      threadSubject,
    }: {
      threadId?: string;
      content: string;
      familyId?: string;
      threadSubject?: string;
    }) => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: threadId,
          thread_subject: threadSubject,
          family_id: familyId,
          content,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to send message");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      if (variables.threadId) {
        queryClient.invalidateQueries({
          queryKey: ["message-thread", variables.threadId],
        });
      }
    },
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subject,
      content,
      familyId,
    }: {
      subject: string;
      content: string;
      familyId?: string;
    }) => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_subject: subject,
          family_id: familyId,
          content,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create thread");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
    },
  });
}
