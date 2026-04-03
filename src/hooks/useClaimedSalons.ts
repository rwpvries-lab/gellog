"use client";

import { createClient } from "@/src/lib/supabase/client";
import { useEffect, useState } from "react";

export type ClaimedSalon = {
  place_id: string;
  salon_name: string;
};

/**
 * Claimed salon rows for the signed-in user (owner + is_claimed).
 * `ready` is false until the first fetch completes.
 */
export function useClaimedSalons(): {
  salons: ClaimedSalon[];
  ready: boolean;
} {
  const [salons, setSalons] = useState<ClaimedSalon[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setSalons([]);
        return;
      }
      const { data, error } = await supabase
        .from("salon_profiles")
        .select("place_id, salon_name")
        .eq("owner_id", user.id)
        .eq("is_claimed", true)
        .order("salon_name", { ascending: true });
      if (!cancelled) {
        if (error) setSalons([]);
        else setSalons((data ?? []) as ClaimedSalon[]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { salons: salons ?? [], ready: salons !== null };
}
