"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export type UserRole = "parent" | "stakeholder" | "loading";

export interface StakeholderLink {
  id: string;
  family_id: string;
  stakeholder_id: string;
  role: string;
  name: string;
  organization: string | null;
  linked_at: string;
}

/**
 * Determines whether the logged-in user is a parent or a stakeholder
 * by checking the stakeholder_links table.
 *
 * - If the user has rows where stakeholder_id = user.id => stakeholder
 * - Otherwise => parent
 */
export function useUserRole() {
  const [role, setRole] = useState<UserRole>("loading");
  const [links, setLinks] = useState<StakeholderLink[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) setRole("parent");
          return;
        }

        const { data, error } = await supabase
          .from("stakeholder_links")
          .select("*")
          .eq("stakeholder_id", user.id);

        if (error) {
          console.error("useUserRole: error querying stakeholder_links", error);
          if (!cancelled) setRole("parent");
          return;
        }

        if (!cancelled) {
          if (data && data.length > 0) {
            setLinks(data as StakeholderLink[]);
            setRole("stakeholder");
          } else {
            setRole("parent");
          }
        }
      } catch (err) {
        console.error("useUserRole: unexpected error", err);
        if (!cancelled) setRole("parent");
      }
    }

    detect();
    return () => {
      cancelled = true;
    };
  }, []);

  return { role, links };
}
