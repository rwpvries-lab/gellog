/**
 * Heuristic filter for Google Place Autocomplete predictions so only
 * ice-cream–related venues show up. Used by SalonInput and Search.
 */

const STRONG_ICE_TERMS = [
  "ice cream",
  "ice cream shop",
  "Ice cream shop",
  "ijssalon",
  "gelateria",
  "frozen yogurt",
  "frozen yoghurt",
  "softijs",
  "sorbetto",
  "gelato",
  "sorbet",
] as const;

/** Obvious non–ice-cream venue hints (Dutch / English / Spanish). */
const BLOCKLIST = [
  "parkeer",
  "parking",
  "garage",
  "parkeergarage",
] as const;

/** Whole word "ijs" only — avoids "rijskade", "rijswijk", etc. (no lookbehind for older engines). */
const WHOLE_WORD_IJS =
  /(^|[^a-zà-öø-ÿ\u00C0-\u024F])ijs($|[^a-zà-öø-ÿ\u00C0-\u024F])/i;

/** French "glace" as a word — avoid lookbehind for broader JS engine support. */
const WHOLE_WORD_GLACE =
  /(^|[^a-zà-öø-ÿ\u00C0-\u024F])glace($|[^a-zà-öø-ÿ\u00C0-\u024F])/i;

function hasStrongIceSignal(lower: string): boolean {
  return STRONG_ICE_TERMS.some((t) => lower.includes(t));
}

function hasWeakIceSignal(lower: string): boolean {
  return WHOLE_WORD_IJS.test(lower) || WHOLE_WORD_GLACE.test(lower);
}

function hasBlocklistHit(lower: string): boolean {
  return BLOCKLIST.some((b) => lower.includes(b));
}

export function looksLikeIceCreamSalon(text: string): boolean {
  try {
    const lower = text.toLowerCase().normalize("NFC");

    if (hasStrongIceSignal(lower)) {
      return true;
    }

    if (!hasWeakIceSignal(lower)) {
      return false;
    }

    if (hasBlocklistHit(lower)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export type AutocompletePredictionLike = {
  description?: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

/**
 * Description substring match for SalonInput autocomplete. Pair with “show all if no
 * match” fallback so brand-only names (e.g. Palazzo) still appear when Google returns them.
 */
export const ICE_CREAM_AUTOCOMPLETE_DESCRIPTION_TERMS = [
  "gelato",
  "ijs",
  "ijssalon",
  "ice cream",
  "gelateria",
  "sorbetto",
  "frozen yogurt",
  "softijs",
  "glace",
  "sorbet",
] as const;

export function predictionLooksLikeIceCream(
  p: AutocompletePredictionLike,
): boolean {
  try {
    const main = p.structured_formatting?.main_text ?? "";
    const secondary = p.structured_formatting?.secondary_text ?? "";
    const blob = [main, secondary, p.description ?? ""].join(" ").trim();
    if (!blob) return false;
    return looksLikeIceCreamSalon(blob);
  } catch {
    return false;
  }
}

/** Place result shape from Maps JS textSearch / nearbySearch. */
export type NearbyPlaceLike = {
  name?: string;
  vicinity?: string;
  formatted_address?: string;
  types?: string[];
};

/** Map picker: name substring checks (matches pasted spec; separate from autocomplete STRONG_ICE_TERMS). */
const MAP_ICE_CREAM_TERMS = [
  "gelato",
  "ijs",
  "ijssalon",
  "ice cream",
  "gelateria",
  "sorbetto",
  "frozen yogurt",
  "softijs",
  "glace",
  "sorbet",
  "glacier",
  "crème glacée",
] as const;

const MAP_EXCLUDED_TYPES = [
  "car_repair",
  "car_dealer",
  "dentist",
  "doctor",
  "hospital",
  "pharmacy",
  "supermarket",
  "grocery_or_supermarket",
  "electronics_store",
  "clothing_store",
  "department_store",
  "furniture_store",
  "hardware_store",
  "home_goods_store",
  "jewelry_store",
  "shoe_store",
  "shopping_mall",
  "real_estate_agency",
  "lawyer",
  "accounting",
  "bank",
  "atm",
  "gas_station",
  "parking",
  "subway_station",
  "train_station",
  "transit_station",
  "university",
  "school",
  "church",
  "mosque",
  "gym",
  "hair_care",
  "spa",
  "laundry",
  "lodging",
  "museum",
  "city_hall",
  "local_government_office",
  "restaurant",
  "sushi_restaurant",
] as const;

const MAP_FOOD_TYPES = [
  "food",
  "cafe",
  "bakery",
  "meal_takeaway",
  "meal_delivery",
  "establishment",
] as const;

const mapExcludedSet = new Set<string>(MAP_EXCLUDED_TYPES);
const mapFoodSet = new Set<string>(MAP_FOOD_TYPES);

/**
 * Map picker: reject excluded Google types; accept ice-cream name terms or food-ish types.
 */
export function shouldShowIceCreamMapMarker(place: NearbyPlaceLike): boolean {
  const name = (place.name ?? "").toLowerCase();
  const types = place.types ?? [];

  if (types.some((t) => mapExcludedSet.has(t))) {
    return false;
  }

  if (MAP_ICE_CREAM_TERMS.some((term) => name.includes(term))) {
    return true;
  }

  if (types.some((t) => mapFoodSet.has(t))) {
    return true;
  }

  return false;
}

export function shouldShowIceCreamMapPin(place: NearbyPlaceLike): boolean {
  return shouldShowIceCreamMapMarker(place);
}

/** Google Autocomplete prediction including optional `types` from the Places API. */
export type AutocompletePredictionWithTypes = AutocompletePredictionLike & {
  types?: string[];
};

/**
 * Salons search: prefer map-marker rules when `types` are present; otherwise fall back to
 * description-based ice-cream heuristics so brand-only names can still match.
 */
export function autocompletePassesSalonFilter(
  p: AutocompletePredictionWithTypes,
): boolean {
  try {
    const main = p.structured_formatting?.main_text?.trim() ?? "";
    if (
      shouldShowIceCreamMapMarker({
        name: main,
        types: p.types ?? [],
      })
    ) {
      return true;
    }
    return predictionLooksLikeIceCream(p);
  } catch {
    return false;
  }
}
