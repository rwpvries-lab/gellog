"use client";

import type { SalonData } from "@/src/components/SalonInput";
import type { Visibility } from "@/src/components/VisibilityPicker";
import { userFacingSaveError } from "@/src/lib/userFacingError";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  canAdvanceFromStep1,
  canAdvanceFromStep2,
  createInitialLogFlowState,
  flowFingerprint,
  logFlowReducer,
} from "./logFlowReducer";
import { submitIceCreamLog, visitedAtToIsoUtc } from "./submitIceCreamLog";
import { hapticImpactLight } from "@/src/lib/haptics";
import { isVisitedAtValid } from "@/src/lib/visitedAtValidator";
import { Step1_SalonDate } from "./steps/Step1_SalonDate";
import { Step2_Flavours } from "./steps/Step2_Flavours";
import { Step3_Details } from "./steps/Step3_Details";

const STEP_COPY: Record<
  1 | 2 | 3,
  { hero: string; subtitle: string | null }
> = {
  1: {
    hero: "Where did you go?",
    subtitle: "Search by name or let us find you.",
  },
  2: {
    hero: "What did you taste?",
    subtitle: "Add up to three flavours.",
  },
  3: {
    hero: "Finishing touches.",
    subtitle: null,
  },
};

export function LogStepWrapper({
  userId,
  defaultVisibility,
  initialSalonData,
  initialPrefillFlavour,
}: {
  userId: string;
  defaultVisibility: Visibility;
  initialSalonData?: SalonData | null;
  initialPrefillFlavour?: string | null;
}) {
  const router = useRouter();
  const initial = useMemo(
    () =>
      createInitialLogFlowState({
        defaultVisibility,
        initialSalon: initialSalonData ?? null,
        initialPrefillFlavour: initialPrefillFlavour ?? null,
      }),
    [defaultVisibility, initialSalonData, initialPrefillFlavour],
  );

  const [state, dispatch] = useReducer(logFlowReducer, initial);
  const baselineFingerprint = useRef(flowFingerprint(initial));
  const [discardOpen, setDiscardOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [step1DateError, setStep1DateError] = useState<string | null>(null);
  const pendingLeaveRef = useRef<
    | { kind: "href"; href: string }
    | { kind: "header" }
    | null
  >(null);
  const pathname = "/icecream/logs/new";

  const isDirty = flowFingerprint(state) !== baselineFingerprint.current;

  const requestLeave = useCallback(
    (intent: { kind: "href"; href: string } | { kind: "header" }) => {
      if (!isDirty) {
        if (intent.kind === "href") router.push(intent.href);
        else router.back();
        return;
      }
      pendingLeaveRef.current = intent;
      setDiscardOpen(true);
    },
    [isDirty, router],
  );

  function confirmDiscard() {
    const pending = pendingLeaveRef.current;
    pendingLeaveRef.current = null;
    setDiscardOpen(false);
    if (!pending) return;
    if (pending.kind === "href") {
      router.push(pending.href);
      return;
    }
    router.back();
  }

  function cancelDiscard() {
    pendingLeaveRef.current = null;
    setDiscardOpen(false);
  }

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    function onPointerDownCapture(e: PointerEvent) {
      if (!isDirty) return;
      const t = e.target as HTMLElement | null;
      const a = t?.closest?.("a[href]");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (href === pathname || href.startsWith(`${pathname}?`)) return;
      const url = new URL(href, window.location.origin);
      if (url.pathname === pathname) return;
      e.preventDefault();
      e.stopPropagation();
      pendingLeaveRef.current = {
        kind: "href",
        href: `${url.pathname}${url.search}${url.hash}`,
      };
      setDiscardOpen(true);
    }
    document.addEventListener("pointerdown", onPointerDownCapture, true);
    return () => document.removeEventListener("pointerdown", onPointerDownCapture, true);
  }, [isDirty, pathname]);

  useEffect(() => {
    setStep1DateError(null);
  }, [state.step1.date, state.step1.hour, state.step1.minute]);

  function goNext() {
    if (state.currentStep === 1) {
      if (!canAdvanceFromStep1(state)) return;
      const validation = isVisitedAtValid(visitedAtToIsoUtc(state));
      if (!validation.ok) {
        setStep1DateError(validation.reason ?? "Invalid visit date.");
        return;
      }
    }
    if (state.currentStep === 2 && !canAdvanceFromStep2(state)) return;
    dispatch({ type: "GO_NEXT" });
  }

  function goBackStep() {
    dispatch({ type: "GO_BACK" });
  }

  async function handleFinalSubmit() {
    setSubmitError(null);
    const dateValidation = isVisitedAtValid(visitedAtToIsoUtc(state));
    if (!dateValidation.ok) {
      setSubmitError(dateValidation.reason ?? "Invalid visit date.");
      return;
    }
    setSubmitting(true);
    const result = await submitIceCreamLog({ userId, state });
    setSubmitting(false);
    if (result.ok) {
      void hapticImpactLight();
      // Land on the feed after publishing, via the Next.js router rather than
      // raw history. A previous fix used history.replaceState, but WKWebView
      // restored that rewritten entry as step 1 on back; letting the router own
      // the navigation makes it stick. router.replace consumes the current
      // (history back-guard trap) entry instead of stacking a new one, so the
      // create-log flow is no longer the back target — which also removes the
      // remount that re-pushed the trap and caused the "first back tap does
      // nothing" double-tap. The new log appears at the top of the feed.
      router.replace("/icecream/feed");
      return;
    }
    setSubmitError(
      userFacingSaveError(result.error, "Couldn't save your log. Try again?"),
    );
  }

  const step = state.currentStep;
  const copy = STEP_COPY[step];

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (state.currentStep > 1) goBackStep();
              else requestLeave({ kind: "header" });
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-default)] bg-transparent text-[color:var(--brand-primary)] transition hover:bg-[color:var(--background-secondary)]"
            aria-label={state.currentStep > 1 ? "Previous step" : "Back"}
          >
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
          </button>
          <div className="flex min-w-0 flex-1 gap-1.5" aria-hidden>
            {([1, 2, 3] as const).map((n) => (
              <div
                key={n}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ease-out ${
                  step >= n ? "bg-[#A85530]" : "bg-[color:var(--brand-primary-muted)]"
                }`}
              />
            ))}
          </div>
        </div>

        <p className="font-sans text-[12px] font-medium uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
          Step {step} of 3
        </p>

        <h1 className="font-serif text-[clamp(28px,8vw,40px)] font-semibold leading-[1.15] tracking-[-0.02em] text-[color:var(--text-primary)]">
          {copy.hero}
        </h1>
        {copy.subtitle ? (
          <p className="font-sans text-sm text-[color:var(--text-secondary)]">{copy.subtitle}</p>
        ) : null}
      </div>

      <div className="mt-6 flex min-h-0 flex-1 flex-col gap-4 pb-4">
        {state.currentStep === 1 ? (
          <Step1_SalonDate
            state={state}
            dispatch={dispatch}
            userId={userId}
            onOpenMap={() => requestLeave({ kind: "href", href: "/map?returnTo=/icecream/logs/new" })}
          />
        ) : null}
        {state.currentStep === 2 ? <Step2_Flavours state={state} dispatch={dispatch} /> : null}
        {state.currentStep === 3 ? <Step3_Details state={state} dispatch={dispatch} /> : null}

        {submitError ? (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl px-4 py-3 text-sm text-[color:var(--state-error)] ring-1 ring-[color:var(--state-error)]"
            style={{
              background:
                "color-mix(in srgb, var(--state-error) 10%, var(--background-secondary))",
            }}
          >
            <p>{submitError}</p>
            <button
              type="button"
              onClick={() => void handleFinalSubmit()}
              disabled={submitting}
              className="inline-flex h-10 items-center justify-center self-start rounded-full border border-[color:var(--border-default)] bg-[color:var(--background-secondary)] px-4 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[color:var(--background-tertiary)] disabled:opacity-50"
            >
              Retry
            </button>
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-0 -mx-1 mt-auto bg-[color:var(--background-primary)] pt-2">
        {state.currentStep === 1 && step1DateError ? (
          <p className="mb-2 rounded-xl px-3 py-2 font-sans text-[13px] text-[color:var(--state-error)] ring-1 ring-[color:var(--state-error)]"
            style={{ background: "color-mix(in srgb, var(--state-error) 8%, var(--background-secondary))" }}
          >
            {step1DateError}
          </p>
        ) : null}
        {state.currentStep < 3 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={
              (state.currentStep === 1 && !canAdvanceFromStep1(state)) ||
              (state.currentStep === 2 && !canAdvanceFromStep2(state))
            }
            className="pressable inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[color:var(--brand-primary)] px-6 font-sans text-base font-medium text-[color:var(--text-inverse)] transition hover:bg-[color:var(--brand-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background-primary)] disabled:opacity-45"
          >
            Continue
            <ArrowRight size={18} strokeWidth={2.25} aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleFinalSubmit()}
            disabled={submitting}
            className="pressable inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[color:var(--brand-primary)] px-6 font-sans text-base font-medium text-[color:var(--text-inverse)] transition hover:bg-[color:var(--brand-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background-primary)] disabled:opacity-60"
          >
            {submitting ? (
              "Scooping…"
            ) : (
              <>
                Publish <span aria-hidden>✦</span>
              </>
            )}
          </button>
        )}
        {/* Safe-area fill: prevents the terracotta button background from bleeding into the iOS home-indicator zone */}
        <div aria-hidden className="w-full bg-[color:var(--background-primary)]" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
      </div>

      {discardOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[color:var(--color-backdrop)] px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="discard-log-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--background-secondary)] p-6 ring-1 ring-[color:var(--border-default)]">
            <h2 id="discard-log-title" className="font-serif text-lg font-semibold text-[color:var(--text-primary)]">
              Discard your log?
            </h2>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">Your answers will not be saved.</p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cancelDiscard}
                className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium text-[color:var(--text-primary)] ring-1 ring-[color:var(--border-default)] transition hover:bg-[color:var(--background-tertiary)]"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={confirmDiscard}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--state-error)] px-5 text-sm font-semibold text-[color:var(--text-inverse)] transition hover:brightness-110"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
