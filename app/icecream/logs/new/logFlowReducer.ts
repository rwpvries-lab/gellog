import type { SalonData } from "@/src/components/SalonInput";
import type { PhotoVisibility } from "@/src/components/PhotoVisibilityPicker";
import type { Visibility } from "@/src/components/VisibilityPicker";

export type SalonRef = SalonData;

export type WeatherData = {
  temperature: number;
  apparentTemperature: number;
  code: number;
  label: string;
  emoji: string;
  uvIndex: number | null;
};

/** Matches persisted flavour semantics; name + tags kept for parity with the legacy form. */
export type FlavourEntry = {
  id: number;
  name: string;
  rating: number | null;
  tags: string[];
  texture?: number | null;
  originality?: number | null;
  intensity?: number | null;
  presentation?: number | null;
  /** When chosen from vitrine pills (`vitrine_flavours.id`). */
  vitrineFlavourId?: string | null;
  /** When resolved to `public.flavours.id`. */
  canonicalFlavourId?: string | null;
};

export type LogFlowState = {
  currentStep: 1 | 2 | 3;
  step1: {
    salon: SalonRef | null;
    salonInput: string;
    date: string;
    hour: number;
    minute: number;
  };
  step2: {
    flavours: FlavourEntry[];
  };
  step3: {
    vessel: "cone" | "cup" | null;
    photoFile: File | null;
    notes: string;
    visibility: Visibility;
    photoVisibility: PhotoVisibility;
    weather: WeatherData | null;
    priceInput: string;
    hidePrice: boolean;
    overallRating: number | null;
    priceWarning: number | null;
  };
};

export type LogFlowAction =
  | { type: "SET_SALON"; salon: SalonRef | null }
  | { type: "SET_DATE"; date: string }
  | { type: "SET_TIME"; hour: number; minute: number }
  | {
      type: "ADD_FLAVOUR";
      name?: string;
      vitrineFlavourId?: string | null;
      canonicalFlavourId?: string | null;
    }
  | { type: "UPDATE_FLAVOUR_RATING"; id: number; rating: number | null }
  | { type: "UPDATE_FLAVOUR"; id: number; patch: Partial<FlavourEntry> }
  | { type: "REMOVE_FLAVOUR"; id: number }
  | { type: "SET_VESSEL"; vessel: "cone" | "cup" | null }
  | { type: "SET_PHOTO"; file: File | null }
  | { type: "SET_NOTES"; notes: string }
  | { type: "SET_VISIBILITY"; visibility: Visibility }
  | { type: "SET_PHOTO_VISIBILITY"; photoVisibility: PhotoVisibility }
  | { type: "SET_WEATHER"; weather: WeatherData | null }
  | {
      type: "SET_PRICE";
      priceInput?: string;
      hidePrice?: boolean;
      priceWarning?: number | null;
    }
  | { type: "SET_OVERALL_RATING"; rating: number | null }
  | { type: "GO_NEXT" }
  | { type: "GO_BACK" };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function defaultHour(): number {
  return new Date().getHours();
}

export function defaultMinute(): number {
  return Math.floor(new Date().getMinutes() / 15) * 15;
}

function nextFlavourId(flavours: { id: number }[]): number {
  return Math.max(0, ...flavours.map((f) => f.id)) + 1;
}

export function createInitialLogFlowState(opts: {
  defaultVisibility: Visibility;
  initialSalon?: SalonRef | null;
  initialPrefillFlavour?: string | null;
}): LogFlowState {
  const salon = opts.initialSalon ?? null;
  const salonInput = salon?.salon_name ?? "";
  const firstFlavourName = opts.initialPrefillFlavour?.trim() ?? "";

  return {
    currentStep: 1,
    step1: {
      salon,
      salonInput,
      date: todayDateStr(),
      hour: defaultHour(),
      minute: defaultMinute(),
    },
    step2: {
      flavours:
        firstFlavourName !== ""
          ? [
              {
                id: 1,
                name: firstFlavourName,
                rating: null,
                tags: [],
                texture: null,
                originality: null,
                intensity: null,
                presentation: null,
                vitrineFlavourId: null,
                canonicalFlavourId: null,
              },
            ]
          : [],
    },
    step3: {
      vessel: null,
      photoFile: null,
      notes: "",
      visibility: opts.defaultVisibility,
      photoVisibility: "public",
      weather: null,
      priceInput: "",
      hidePrice: false,
      overallRating: 5,
      priceWarning: null,
    },
  };
}

export function logFlowReducer(state: LogFlowState, action: LogFlowAction): LogFlowState {
  switch (action.type) {
    case "SET_SALON":
      return {
        ...state,
        step1: {
          ...state.step1,
          salon: action.salon,
          salonInput: action.salon?.salon_name ?? "",
        },
      };
    case "SET_DATE":
      return {
        ...state,
        step1: { ...state.step1, date: action.date },
      };
    case "SET_TIME":
      return {
        ...state,
        step1: {
          ...state.step1,
          hour: action.hour,
          minute: action.minute,
        },
      };
    case "ADD_FLAVOUR":
      return {
        ...state,
        step2: {
          flavours: [
            ...state.step2.flavours,
            {
              id: nextFlavourId(state.step2.flavours),
              name: action.name ?? "",
              rating: null,
              tags: [],
              texture: null,
              originality: null,
              intensity: null,
              presentation: null,
              vitrineFlavourId: action.vitrineFlavourId ?? null,
              canonicalFlavourId: action.canonicalFlavourId ?? null,
            },
          ],
        },
      };
    case "UPDATE_FLAVOUR_RATING":
      return {
        ...state,
        step2: {
          flavours: state.step2.flavours.map((f) =>
            f.id === action.id ? { ...f, rating: action.rating } : f,
          ),
        },
      };
    case "UPDATE_FLAVOUR":
      return {
        ...state,
        step2: {
          flavours: state.step2.flavours.map((f) =>
            f.id === action.id ? { ...f, ...action.patch } : f,
          ),
        },
      };
    case "REMOVE_FLAVOUR":
      return {
        ...state,
        step2: {
          flavours: state.step2.flavours.filter((f) => f.id !== action.id),
        },
      };
    case "SET_VESSEL":
      return {
        ...state,
        step3: { ...state.step3, vessel: action.vessel },
      };
    case "SET_PHOTO":
      return {
        ...state,
        step3: {
          ...state.step3,
          photoFile: action.file,
          photoVisibility: action.file ? state.step3.photoVisibility : "public",
        },
      };
    case "SET_NOTES":
      return {
        ...state,
        step3: { ...state.step3, notes: action.notes },
      };
    case "SET_VISIBILITY":
      return {
        ...state,
        step3: { ...state.step3, visibility: action.visibility },
      };
    case "SET_PHOTO_VISIBILITY":
      return {
        ...state,
        step3: { ...state.step3, photoVisibility: action.photoVisibility },
      };
    case "SET_WEATHER":
      return {
        ...state,
        step3: { ...state.step3, weather: action.weather },
      };
    case "SET_PRICE":
      return {
        ...state,
        step3: {
          ...state.step3,
          ...(action.priceInput !== undefined ? { priceInput: action.priceInput } : {}),
          ...(action.hidePrice !== undefined ? { hidePrice: action.hidePrice } : {}),
          ...(action.priceWarning !== undefined ? { priceWarning: action.priceWarning } : {}),
        },
      };
    case "SET_OVERALL_RATING":
      return {
        ...state,
        step3: { ...state.step3, overallRating: action.rating },
      };
    case "GO_NEXT":
      return {
        ...state,
        currentStep: state.currentStep === 3 ? 3 : ((state.currentStep + 1) as 1 | 2 | 3),
      };
    case "GO_BACK":
      return {
        ...state,
        currentStep: state.currentStep === 1 ? 1 : ((state.currentStep - 1) as 1 | 2 | 3),
      };
    default:
      return state;
  }
}

/** Step 1 → 2: salon name present; date/time always set when using drum defaults. */
export function canAdvanceFromStep1(state: LogFlowState): boolean {
  const nameOk = state.step1.salonInput.trim().length > 0;
  const dateOk = state.step1.date.trim().length > 0;
  return nameOk && dateOk;
}

/** Step 2 → 3: at least one named flavour with rating ≥ 1. */
export function canAdvanceFromStep2(state: LogFlowState): boolean {
  return state.step2.flavours.some(
    (f) =>
      f.name.trim().length > 0 &&
      f.rating != null &&
      f.rating >= 1,
  );
}

export function flowFingerprint(state: LogFlowState): string {
  return JSON.stringify({
    currentStep: state.currentStep,
    step1: state.step1,
    step2: state.step2,
    step3: {
      ...state.step3,
      photoFile: state.step3.photoFile ? "__file__" : null,
    },
  });
}
