/** Helpers shared by new-log steps only — keep minimal. */

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function buildVisitedAt(dateStr: string, hour: number, minute: number): string {
  const proposed = `${dateStr}T${pad(hour)}:${pad(minute)}`;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  if (dateStr === todayStr) {
    const nowStr = `${todayStr}T${pad(today.getHours())}:${pad(today.getMinutes())}`;
    if (proposed > nowStr) return nowStr;
  }
  return proposed;
}

export function describeWeatherCode(code: number): { label: string; emoji: string } {
  if (code === 0) {
    return { label: "Clear sky", emoji: "☀️" };
  }
  if (code >= 1 && code <= 3) {
    return { label: "Partly cloudy", emoji: "⛅️" };
  }
  if (code === 45 || code === 48) {
    return { label: "Foggy", emoji: "🌫️" };
  }
  if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67)) {
    return { label: "Rainy", emoji: "🌧️" };
  }
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
    return { label: "Snowy", emoji: "❄️" };
  }
  if (code >= 80 && code <= 82) {
    return { label: "Showers", emoji: "🌦️" };
  }
  if (code >= 95 && code <= 99) {
    return { label: "Thunderstorm", emoji: "⛈️" };
  }
  return { label: "Mixed conditions", emoji: "🌡️" };
}
