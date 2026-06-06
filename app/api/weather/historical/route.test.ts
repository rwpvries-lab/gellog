import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}));

vi.mock("@/src/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

describe("historical weather POST", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-06T12:00:00.000Z"));
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        hourly: {
          time: ["2026-06-01T11:00", "2026-06-01T12:00", "2026-06-01T13:00"],
          temperature_2m: [17, 18, 19],
          weather_code: [1, 0, 2],
        },
      }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/weather/historical", {
        method: "POST",
        body: JSON.stringify({ lat: 52.1, lng: 5.1, iso: "2026-06-01T12:00:00.000Z" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns weather for a valid retroactive visit", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/weather/historical", {
        method: "POST",
        body: JSON.stringify({ lat: 52.1, lng: 5.1, iso: "2026-06-01T12:00:00.000Z" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        tempC: 18,
        code: 0,
        condition: "Clear sky",
        source: "historical",
      }),
    );
  });

  it("rejects visits outside the 7-day window", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/weather/historical", {
        method: "POST",
        body: JSON.stringify({ lat: 52.1, lng: 5.1, iso: "2026-05-01T12:00:00.000Z" }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
