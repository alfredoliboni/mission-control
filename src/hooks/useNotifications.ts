"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface Notification {
  id: string;
  type: "message" | "invite" | "alert";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

/**
 * Fetches recent notifications for the logged-in user:
 * - Unread messages from the last 24 hours (sent by others)
 * - Pending stakeholder invites
 *
 * Returns a sorted list (newest first) and exposes standard
 * React Query states (isLoading, error, etc.).
 */
export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const notifications: Notification[] = [];

      // Fetch recent unread messages (last 24h)
      const oneDayAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();
      const { data: messages } = await supabase
        .from("messages")
        .select("id, thread_subject, sender_name, created_at")
        .eq("family_id", user.id)
        .neq("sender_id", user.id)
        .gte("created_at", oneDayAgo)
        .order("created_at", { ascending: false })
        .limit(10);

      if (messages) {
        for (const msg of messages) {
          notifications.push({
            id: `msg-${msg.id}`,
            type: "message",
            title: msg.sender_name || "New message",
            description: msg.thread_subject || "New conversation",
            timestamp: msg.created_at,
            read: false,
          });
        }
      }

      // Fetch pending invites
      const { data: invites } = await supabase
        .from("stakeholder_links")
        .select("id, name, role, status, linked_at")
        .eq("family_id", user.id)
        .eq("status", "pending");

      if (invites) {
        for (const inv of invites) {
          notifications.push({
            id: `inv-${inv.id}`,
            type: "invite",
            title: `${inv.name} — pending invite`,
            description: `Invited as ${inv.role}`,
            timestamp: inv.linked_at,
            read: false,
          });
        }
      }

      return notifications.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
