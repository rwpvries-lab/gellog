import { createClient } from "@/src/lib/supabase/client";
import { resizeImageBeforeUpload } from "@/src/lib/imageUtils";
import type { LogFlowState } from "./logFlowReducer";

/**
 * Combines step 1 date + clock fields into an ISO timestamp (UTC) using the user's local timezone.
 */
export function visitedAtToIsoUtc(state: LogFlowState): string {
  const { date, hour, minute } = state.step1;
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0).toISOString();
}

export type SubmitIceCreamLogResult =
  | { ok: true; logId: string }
  | { ok: false; error: unknown };

/**
 * Inserts `ice_cream_logs` + `log_flavours` using the production column names (see EditIceCreamLogForm).
 * If flavour rows fail to insert, deletes the parent log to avoid orphans (SDK has no multi-statement txn).
 */
export async function submitIceCreamLog(args: {
  userId: string;
  state: LogFlowState;
}): Promise<SubmitIceCreamLogResult> {
  const { userId, state } = args;

  const trimmedSalon = state.step1.salonInput.trim();
  if (!trimmedSalon) {
    return { ok: false, error: new Error("Salon name is required.") };
  }

  const activeFlavours = state.step2.flavours
    .map((f) => ({
      ...f,
      name: f.name.trim(),
    }))
    .filter((f) => f.name.length > 0);

  if (activeFlavours.length === 0) {
    return { ok: false, error: new Error("Add at least one flavour.") };
  }

  const starRatings = activeFlavours
    .map((f) => f.rating)
    .filter((r): r is number => r != null && r >= 1 && r <= 5);
  if (starRatings.length === 0) {
    return { ok: false, error: new Error("Rate at least one flavour.") };
  }
  const overallRating = Math.min(
    5,
    Math.max(
      1,
      Math.round(starRatings.reduce((a, b) => a + b, 0) / starRatings.length),
    ),
  );

  const supabase = createClient();

  let photoPath: string | null = null;

  if (state.step3.photoFile) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: new Error("You must be logged in to upload a photo.") };
    }
    try {
      const blob = await resizeImageBeforeUpload(state.step3.photoFile, 1200, 0.85);
      const filePath = `${user.id}/${Date.now()}.webp`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("log-photos")
        .upload(filePath, blob, {
          cacheControl: "3600",
          contentType: "image/webp",
        });
      if (uploadError) {
        return { ok: false, error: uploadError };
      }
      photoPath = uploadData?.path ?? null;
    } catch (e) {
      return { ok: false, error: e };
    }
  }

  const visitedAtIso = visitedAtToIsoUtc(state);
  const isRetroactive = Date.now() - new Date(visitedAtIso).getTime() > 60 * 60 * 1000;

  // For retroactive visits: always fetch historical weather from Open-Meteo.
  // For today's visits: use whatever the live weather widget captured in state.
  let weatherTempC: number | null = null;
  let weatherFeelsLike: number | null = null;
  let weatherCondition: string | null = null;
  let weatherUvIndex: number | null = null;

  if (isRetroactive) {
    const lat = state.step1.salon?.salon_lat;
    const lng = state.step1.salon?.salon_lng;
    if (lat != null && lng != null) {
      try {
        const res = await fetch("/api/weather/historical", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng, iso: visitedAtIso }),
        });
        if (res.ok) {
          const w = (await res.json()) as { tempC?: unknown; condition?: unknown };
          if (typeof w.tempC === "number" && typeof w.condition === "string") {
            weatherTempC = w.tempC;
            weatherCondition = w.condition;
          }
        }
      } catch {
        // soft-fail — log saves with null weather
      }
    }
  } else {
    const weather = state.step3.weather;
    weatherTempC = weather?.temperature ?? null;
    weatherFeelsLike = weather?.apparentTemperature ?? null;
    weatherCondition = weather ? `${weather.emoji} ${weather.label}` : null;
    weatherUvIndex = weather?.uvIndex ?? null;
  }

  const euroParsed =
    state.step3.priceInput.trim() !== ""
      ? parseFloat(state.step3.priceInput.replace(",", "."))
      : null;
  const priceCents =
    euroParsed != null && !Number.isNaN(euroParsed)
      ? Math.round(euroParsed * 100)
      : null;

  const insertPayload = {
    user_id: userId,
    salon_name: trimmedSalon,
    salon_place_id: state.step1.salon?.salon_place_id ?? null,
    salon_address: state.step1.salon?.salon_address ?? null,
    salon_lat: state.step1.salon?.salon_lat ?? null,
    salon_lng: state.step1.salon?.salon_lng ?? null,
    salon_city: state.step1.salon?.salon_city ?? null,
    overall_rating: overallRating,
    notes: state.step3.notes.trim() || null,
    photo_url: photoPath,
    visited_at: visitedAtIso,
    vessel: state.step3.vessel ?? null,
    price_cents: priceCents,
    hide_price: state.step3.hidePrice,
    photo_visibility: state.step3.photoVisibility,
    weather_temp_c: weatherTempC,
    weather_feels_like: weatherFeelsLike,
    weather_condition: weatherCondition,
    weather_uv_index: weatherUvIndex,
    visibility: state.step3.visibility,
  };

  const {
    data: log,
    error: logError,
  } = await supabase.from("ice_cream_logs").insert(insertPayload).select("id").single();

  if (logError || !log?.id) {
    return { ok: false, error: logError ?? new Error("Insert failed.") };
  }

  const logId = log.id as string;

  const flavourRows = activeFlavours.map((flavour) => ({
    log_id: logId,
    flavour_name: flavour.name,
    canonical_flavour_id: flavour.canonicalFlavourId ?? null,
    rating_stars: flavour.rating,
    tags: flavour.tags.length > 0 ? flavour.tags : null,
    texture: flavour.texture ?? null,
    originality: flavour.originality ?? null,
    intensity: flavour.intensity ?? null,
    presentation: flavour.presentation ?? null,
  }));

  const { error: flavoursError } = await supabase.from("log_flavours").insert(flavourRows);

  if (flavoursError) {
    await supabase.from("ice_cream_logs").delete().eq("id", logId);
    return { ok: false, error: flavoursError };
  }

  const salonPlaceId = state.step1.salon?.salon_place_id ?? null;
  if (salonPlaceId) {
    void suggestFlavoursToSalon(supabase, salonPlaceId, userId, activeFlavours.map((f) => f.name));
  }

  return { ok: true, logId };
}

async function suggestFlavoursToSalon(
  supabase: ReturnType<typeof createClient>,
  salonPlaceId: string,
  userId: string,
  flavourNames: string[],
) {
  try {
    const { data: salonProfile } = await supabase
      .from("salon_profiles")
      .select("id")
      .eq("place_id", salonPlaceId)
      .maybeSingle();

    if (!salonProfile) return;

    const [{ data: vitrineNames }, { data: legacySalonFlavours }, { data: existingSuggestions }] =
      await Promise.all([
        supabase.from("vitrine_flavours").select("name").eq("salon_place_id", salonPlaceId),
        supabase.from("salon_flavours").select("name").eq("salon_id", salonProfile.id),
        supabase.from("flavour_suggestions").select("name").eq("salon_id", salonProfile.id),
      ]);

    const skipNames = new Set([
      ...(vitrineNames ?? []).map((f: { name: string }) => f.name.toLowerCase()),
      ...(legacySalonFlavours ?? []).map((f: { name: string }) => f.name.toLowerCase()),
      ...(existingSuggestions ?? []).map((f: { name: string }) => f.name.toLowerCase()),
    ]);

    const toSuggest = flavourNames.filter((n) => !skipNames.has(n.toLowerCase()));
    if (toSuggest.length === 0) return;

    await supabase.from("flavour_suggestions").insert(
      toSuggest.map((name) => ({
        salon_id: salonProfile.id,
        name,
        suggested_by: userId,
        status: "pending",
      })),
    );
  } catch {
    // Fire-and-forget
  }
}
