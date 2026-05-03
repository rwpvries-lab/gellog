"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase/client";
import type { GelatoTokens, BaseToken, DrizzleToken, CrumbleToken } from "@/src/lib/gelato-tokens";

export type SalonVitrineFlavour = {
  id: string;
  inputName: string;
  displayName: string;
  tokens: GelatoTokens;
  resolved: boolean;
};

const FALLBACK_TOKENS: GelatoTokens = { base: "cream", drizzle: "none", crumble: "none" };

export function useSalonVitrine(salonPlaceId: string | null | undefined): {
  flavours: SalonVitrineFlavour[];
  loading: boolean;
  enabled: boolean;
} {
  const [flavours, setFlavours] = useState<SalonVitrineFlavour[]>([]);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!salonPlaceId) {
      setFlavours([]);
      setEnabled(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setFlavours([]);
    setEnabled(false);
    setLoading(true);

    void (async () => {
      const supabase = createClient();

      const [salonRes, flavoursRes] = await Promise.all([
        supabase
          .from("salon_profiles")
          .select("vitrine_enabled")
          .eq("place_id", salonPlaceId)
          .maybeSingle(),
        supabase
          .from("vitrine_flavours_resolved")
          .select(
            "vitrine_flavour_id, input_name, canonical_name_en, canonical_name_nl, base_token, drizzle_token, crumble_token",
          )
          .eq("salon_place_id", salonPlaceId)
          .eq("is_visible", true)
          .order("input_name"),
      ]);

      if (cancelled) return;

      const isEnabled = salonRes.data?.vitrine_enabled === true;
      setEnabled(isEnabled);

      const rows = flavoursRes.data ?? [];
      setFlavours(
        rows.map((row) => ({
          id: row.vitrine_flavour_id as string,
          inputName: row.input_name as string,
          displayName:
            (row.canonical_name_nl as string | null)?.trim() ||
            (row.canonical_name_en as string | null)?.trim() ||
            (row.input_name as string) ||
            "Flavour",
          tokens: row.base_token
            ? {
                base: row.base_token as BaseToken,
                drizzle: (row.drizzle_token ?? "none") as DrizzleToken,
                crumble: (row.crumble_token ?? "none") as CrumbleToken,
              }
            : FALLBACK_TOKENS,
          resolved: row.base_token != null,
        })),
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [salonPlaceId]);

  return { flavours, loading, enabled };
}
