import { describe, expect, it, vi } from "vitest";
import { fetchSalonDashboardWeather, weatherCodeToEmoji } from "./salonDashboardWeather";

describe("weatherCodeToEmoji", () => {
  it.each([
    [0, "☀️"],
    [2, "⛅️"],
    [45, "🌫️"],
    [61, "🌧️"],
    [71, "❄️"],
    [81, "🌦️"],
    [95, "⛈️"],
    [999, "🌡️"],
  ])("maps code %i to %s", (code, emoji) => {
    expect(weatherCodeToEmoji(code)).toBe(emoji);
  });
});

describe("fetchSalonDashboardWeather", () => {
  it("returns null for invalid coordinates", async () => {
    await expect(fetchSalonDashboardWeather(Number.NaN, 5)).resolves.toBeNull();
  });

  it("builds forecast segments and daily rows from Open-Meteo data", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        timezone: "UTC",
        hourly: {
          time: [
            "2026-06-06T08:00",
            "2026-06-06T14:00",
            "2026-06-06T19:00",
          ],
          temperature_2m: [16, 22, 18],
          weathercode: [1, 0, 2],
        },
        daily: {
          time: ["2026-06-06", "2026-06-07", "2026-06-08"],
          weathercode: [0, 2, 61],
          temperature_2m_max: [24, 23, 20],
          temperature_2m_min: [14, 15, 13],
        },
      }),
    }) as unknown as typeof fetch;

    const payload = await fetchSalonDashboardWeather(52.1, 5.1);

    expect(payload).not.toBeNull();
    expect(payload!.segments.length).toBeGreaterThan(0);
    expect(payload!.daily).toHaveLength(3);
    expect(payload!.daily[0]).toEqual(
      expect.objectContaining({
        emoji: "☀️",
        maxC: 24,
        minC: 14,
      }),
    );
  });
});
