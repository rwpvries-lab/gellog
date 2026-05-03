"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase/client";
import type { GelatoTokens, BaseToken, DrizzleToken, CrumbleToken } from "@/src/lib/gelato-tokens";

const FALLBACK: GelatoTokens = { base: "cream", drizzle: "none", crumble: "none" };

export function useFlavourTokens(flavourName: string | undefined): {
  tokens: GelatoTokens;
  loading: boolean;
  resolved: boolean;
} {
  const [tokens, setTokens] = useState<GelatoTokens>(FALLBACK);
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const trimmed = flavourName?.trim() ?? "";
    if (!trimmed) {
      setTokens(FALLBACK);
      setResolved(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("resolve_flavour_tokens", { input: trimmed });

      if (cancelled) return;

      if (!error && Array.isArray(data) && data.length > 0 && data[0].base_token) {
        const row = data[0] as {
          base_token: string;
          drizzle_token: string | null;
          crumble_token: string | null;
        };
        setTokens({
          base: row.base_token as BaseToken,
          drizzle: (row.drizzle_token ?? "none") as DrizzleToken,
          crumble: (row.crumble_token ?? "none") as CrumbleToken,
        });
        setResolved(true);
      } else {
        setTokens(FALLBACK);
        setResolved(false);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [flavourName]);

  return { tokens, loading, resolved };
}
