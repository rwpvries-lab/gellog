import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultWeekHours } from "./opening-hours";

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}));

vi.mock("@/src/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

import { computeSalonPeakGrid } from "./salonPeakGrid";

describe("computeSalonPeakGrid", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ current: { temperature_2m: 24, weathercode: 0 } }),
    }) as unknown as typeof fetch;
  });

  it("builds a masked peak grid from density and opening hours", async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "salon_hourly_density") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { salon_place_id: "place-1", dow: 1, hour: 14, log_count: 10 },
                  { salon_place_id: "place-1", dow: 1, hour: 22, log_count: 2 },
                ],
              }),
            }),
          };
        }
        if (table === "salon_total_logs_90d") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { total_count: 12 } }),
              }),
            }),
          };
        }
        if (table === "salon_profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    salon_lat: 52.1,
                    salon_lng: 5.1,
                    hours_override: defaultWeekHours(),
                    hours_google: null,
                  },
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const payload = await computeSalonPeakGrid("place-1");

    expect(payload.total_count).toBe(12);
    expect(payload.grid).toHaveLength(7);
    expect(payload.grid[0]![5]).toBe(100);
    expect(payload.grid[0]![13]).toBeNull();
  });
});
