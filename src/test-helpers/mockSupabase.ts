import { vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

type TableHandler = {
  insert?: (...args: unknown[]) => unknown;
  select?: (...args: unknown[]) => unknown;
  update?: (...args: unknown[]) => unknown;
  delete?: (...args: unknown[]) => unknown;
};

export function createMockSupabase(handlers: Record<string, TableHandler> = {}): SupabaseClient {
  const defaultChain = {
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  const from = vi.fn((table: string) => {
    const handler = handlers[table] ?? {};
    return {
      insert: handler.insert ?? vi.fn().mockReturnValue(defaultChain),
      select: handler.select ?? vi.fn().mockReturnValue(defaultChain),
      update: handler.update ?? vi.fn().mockReturnValue(defaultChain),
      delete: handler.delete ?? vi.fn().mockReturnValue(defaultChain),
    };
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "test@example.com" } } }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      signInWithIdToken: vi.fn().mockResolvedValue({ error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: "user-1/photo.webp" }, error: null }),
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    from,
  } as unknown as SupabaseClient;
}
