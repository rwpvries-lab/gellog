import { createClient } from "@/src/lib/supabase/client";
import type { PhotoVisibility } from "@/src/components/PhotoVisibilityPicker";
import type { Visibility } from "@/src/components/VisibilityPicker";

export type EditLogFlavour = {
  name: string;
  rating: number | null;
  tags: string[];
  ratingTexture: number | null;
  ratingOriginality: number | null;
  ratingIntensity: number | null;
  ratingPresentation: number | null;
};

export type UpdateIceCreamLogInput = {
  userId: string;
  logId: string;
  salonName: string;
  salonPlaceId: string | null;
  salonAddress: string | null;
  salonLat: number | null;
  salonLng: number | null;
  salonCity: string | null;
  overallRating: number;
  notes: string;
  visitedAtIso: string;
  vessel: "cup" | "cone" | null;
  pricePaid: string;
  hidePriceFromOthers: boolean;
  photoUrl: string | null;
  photoVisibility: PhotoVisibility;
  savedWeatherTempC: number | null;
  savedWeatherCondition: string | null;
  capturedWeather: { temperature: number; label: string; emoji: string } | null;
  visibility: Visibility;
  flavours: EditLogFlavour[];
};

export type UpdateIceCreamLogResult = { ok: true } | { ok: false; error: unknown };

/**
 * Updates `ice_cream_logs` and replaces `log_flavours` rows (delete + re-insert).
 */
export async function updateIceCreamLog(
  input: UpdateIceCreamLogInput,
): Promise<UpdateIceCreamLogResult> {
  const trimmedSalon = input.salonName.trim();
  if (!trimmedSalon) {
    return { ok: false, error: new Error("Please enter a salon name.") };
  }

  const activeFlavours = input.flavours
    .map((f) => ({ ...f, name: f.name.trim() }))
    .filter((f) => f.name.length > 0);

  if (activeFlavours.length === 0) {
    return { ok: false, error: new Error("Add at least one flavour.") };
  }

  const supabase = createClient();

  const { error: logError } = await supabase
    .from("ice_cream_logs")
    .update({
      salon_name: trimmedSalon,
      salon_place_id: input.salonPlaceId,
      salon_address: input.salonAddress,
      salon_lat: input.salonLat,
      salon_lng: input.salonLng,
      salon_city: input.salonCity,
      overall_rating: input.overallRating,
      notes: input.notes.trim() || null,
      visited_at: input.visitedAtIso,
      vessel: input.vessel ?? null,
      price_cents:
        input.pricePaid !== ""
          ? Math.round(parseFloat(input.pricePaid.replace(",", ".")) * 100)
          : null,
      hide_price: input.hidePriceFromOthers,
      photo_visibility: input.photoUrl ? input.photoVisibility : "public",
      weather_temp_c: input.capturedWeather?.temperature ?? input.savedWeatherTempC,
      weather_condition: input.capturedWeather
        ? `${input.capturedWeather.emoji} ${input.capturedWeather.label}`
        : input.savedWeatherCondition,
      visibility: input.visibility,
    })
    .eq("id", input.logId)
    .eq("user_id", input.userId);

  if (logError) return { ok: false, error: logError };

  const { error: deleteError } = await supabase
    .from("log_flavours")
    .delete()
    .eq("log_id", input.logId);

  if (deleteError) return { ok: false, error: deleteError };

  const { error: flavoursError } = await supabase.from("log_flavours").insert(
    activeFlavours.map((f) => ({
      log_id: input.logId,
      flavour_name: f.name,
      rating_stars: f.rating,
      tags: f.tags.length > 0 ? f.tags : null,
      texture: f.ratingTexture,
      originality: f.ratingOriginality,
      intensity: f.ratingIntensity,
      presentation: f.ratingPresentation,
    })),
  );

  if (flavoursError) return { ok: false, error: flavoursError };

  return { ok: true };
}
