"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to real-time changes on the messages table via Supabase Realtime.
 * Invalidates the relevant messages query when new messages arrive,
 * so React Query refetches the latest data instantly.
 *
 * @param familyId - The family ID to filter realtime events. If undefined, no subscription is created.
 * @param queryKey - The query key to invalidate on new messages. Defaults to ["messages"].
 */
export function useRealtimeMessages(
  familyId?: string,
  queryKey: string[] = ["messages"]
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!familyId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${familyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `family_id=eq.${familyId}`,
        },
        () => {
          // Invalidate messages query to trigger refetch
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, queryClient, queryKey]);
}
