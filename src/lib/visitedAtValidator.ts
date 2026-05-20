export function isVisitedAtValid(iso: string): { ok: boolean; reason?: string } {
  const now = new Date();
  const visited = new Date(iso);
  if (Number.isNaN(visited.getTime())) {
    return { ok: false, reason: "Invalid date." };
  }
  if (visited > now) {
    return { ok: false, reason: "Visit date can't be in the future." };
  }
  // Midnight 7 days ago in the user's local timezone
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - 7);
  cutoff.setHours(0, 0, 0, 0);
  if (visited < cutoff) {
    return { ok: false, reason: "Visits can only be logged up to 7 days back." };
  }
  return { ok: true };
}
