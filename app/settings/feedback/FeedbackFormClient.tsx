"use client";

import { createClient } from "@/src/lib/supabase/client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Kind = "bug" | "idea" | "love" | "other";

const KINDS: { value: Kind; label: string }[] = [
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
  { value: "love", label: "Love" },
  { value: "other", label: "Other" },
];

const MAX = 2000;
const WARN = 1900;

function TerracottaToast({ onDismiss }: { onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10);
    const t2 = setTimeout(() => setVisible(false), 2200);
    const t3 = setTimeout(onDismiss, 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDismiss]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 96,
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? 0 : 12}px)`,
        opacity: visible ? 1 : 0,
        transition: "opacity 220ms ease, transform 220ms ease",
        background: "var(--brand-primary)",
        color: "white",
        borderRadius: 999,
        padding: "9px 20px",
        fontSize: 13,
        fontWeight: 500,
        zIndex: 60,
        whiteSpace: "nowrap",
        boxShadow: "0 4px 20px rgba(168,85,48,0.35)",
        pointerEvents: "none",
      }}
    >
      Thanks — that goes straight to the team.
    </div>
  );
}

function ScoopIllustration() {
  return (
    <svg
      width="72"
      height="88"
      viewBox="0 0 72 88"
      fill="none"
      aria-hidden="true"
    >
      {/* Cone body */}
      <path
        d="M16 38 L36 84 L56 38 Z"
        fill="var(--brand-primary-muted)"
      />
      {/* Waffle grid lines — vertical */}
      <line x1="26" y1="38" x2="31" y2="80" stroke="var(--brand-primary)" strokeWidth="0.75" strokeOpacity="0.35" />
      <line x1="36" y1="38" x2="36" y2="84" stroke="var(--brand-primary)" strokeWidth="0.75" strokeOpacity="0.35" />
      <line x1="46" y1="38" x2="41" y2="80" stroke="var(--brand-primary)" strokeWidth="0.75" strokeOpacity="0.35" />
      {/* Waffle grid lines — horizontal */}
      <line x1="16" y1="44" x2="56" y2="44" stroke="var(--brand-primary)" strokeWidth="0.75" strokeOpacity="0.35" />
      <line x1="18" y1="51" x2="54" y2="51" stroke="var(--brand-primary)" strokeWidth="0.75" strokeOpacity="0.35" />
      <line x1="22" y1="59" x2="50" y2="59" stroke="var(--brand-primary)" strokeWidth="0.75" strokeOpacity="0.35" />
      <line x1="27" y1="68" x2="45" y2="68" stroke="var(--brand-primary)" strokeWidth="0.75" strokeOpacity="0.35" />
      {/* Cone outline */}
      <path
        d="M16 38 L36 84 L56 38"
        stroke="var(--brand-primary)"
        strokeWidth="1.25"
        strokeOpacity="0.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      {/* Scoop */}
      <circle cx="36" cy="22" r="20" fill="var(--brand-primary-surface)" />
      <circle
        cx="36"
        cy="22"
        r="20"
        stroke="var(--brand-primary)"
        strokeWidth="1.25"
        strokeOpacity="0.25"
        fill="none"
      />
      {/* Drizzle swirl — a gentle arc */}
      <path
        d="M26 16 Q30 10 36 14 Q42 18 38 24 Q34 30 40 28"
        stroke="var(--brand-primary)"
        strokeWidth="1.75"
        strokeOpacity="0.55"
        strokeLinecap="round"
        fill="none"
      />
      {/* Sprinkle dots */}
      <circle cx="30" cy="26" r="1.75" fill="var(--brand-secondary)" fillOpacity="0.7" />
      <circle cx="44" cy="20" r="1.5" fill="var(--brand-secondary)" fillOpacity="0.6" />
      <circle cx="34" cy="32" r="1.25" fill="var(--brand-primary)" fillOpacity="0.4" />
    </svg>
  );
}

export function FeedbackFormClient({ userId }: { userId: string | null }) {
  const pathname = usePathname();
  const [kind, setKind] = useState<Kind>("idea");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < 5) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbError } = await (supabase as any)
        .from("feedback")
        .insert({
          user_id: userId,
          kind,
          message: trimmed,
          page_path: pathname,
          app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0",
        });
      if (dbError) throw dbError;
      setDone(true);
      setToast(true);
    } catch {
      setError("Couldn't send — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            paddingTop: 48,
            paddingBottom: 32,
            textAlign: "center",
          }}
        >
          <ScoopIllustration />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p
              style={{
                color: "var(--color-text-primary)",
                fontSize: 19,
                fontWeight: 700,
              }}
            >
              Sent!
            </p>
            <p
              style={{
                color: "var(--color-text-secondary)",
                fontSize: 14,
                lineHeight: 1.55,
              }}
            >
              Thanks — that goes straight to the team.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setKind("idea");
              setMessage("");
              setError(null);
              setDone(false);
            }}
            style={{
              color: "var(--brand-primary)",
              fontSize: 14,
              fontWeight: 500,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Send another →
          </button>
        </div>
        {toast && <TerracottaToast onDismiss={() => setToast(false)} />}
      </>
    );
  }

  return (
    <>
      <form
        onSubmit={(e) => void handleSubmit(e)}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        {/* Kind segmented control */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span
            style={{
              color: "var(--color-text-secondary)",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Type
          </span>
          <div
            style={{
              display: "flex",
              background: "var(--color-surface-alt)",
              borderRadius: 12,
              padding: 4,
              gap: 3,
            }}
          >
            {KINDS.map(({ value, label }) => {
              const selected = kind === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setKind(value)}
                  style={{
                    flex: 1,
                    borderRadius: 9,
                    padding: "10px 4px",
                    fontSize: 14,
                    fontWeight: selected ? 600 : 400,
                    border: "none",
                    cursor: "pointer",
                    transition: "background 150ms, color 150ms, box-shadow 150ms",
                    background: selected ? "var(--brand-primary)" : "transparent",
                    color: selected ? "white" : "var(--color-text-secondary)",
                    boxShadow: selected
                      ? "0 1px 4px rgba(168,85,48,0.28)"
                      : "none",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Textarea with char counter */}
        <div style={{ position: "relative" }}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
            placeholder="What's on your mind?"
            rows={6}
            style={{
              width: "100%",
              resize: "none",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              padding: "12px 12px 30px",
              fontSize: 15,
              color: "var(--color-text-primary)",
              lineHeight: 1.55,
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
              transition: "border-color 150ms",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--border-focus)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border)";
            }}
          />
          <span
            style={{
              position: "absolute",
              bottom: 10,
              right: 12,
              fontSize: 11,
              fontWeight: 500,
              color:
                message.length > WARN
                  ? "var(--state-error)"
                  : "var(--color-text-tertiary)",
              pointerEvents: "none",
              lineHeight: 1,
            }}
          >
            {message.length}/{MAX}
          </span>
        </div>

        {error && (
          <p style={{ color: "var(--state-error)", fontSize: 13, marginTop: -8 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || message.trim().length < 5}
          style={{
            background: "var(--brand-primary)",
            color: "white",
            border: "none",
            borderRadius: 14,
            padding: "15px 0",
            fontSize: 15,
            fontWeight: 600,
            cursor:
              submitting || message.trim().length < 5 ? "not-allowed" : "pointer",
            opacity: submitting || message.trim().length < 5 ? 0.55 : 1,
            transition: "opacity 150ms",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {submitting && (
            <span
              style={{
                width: 14,
                height: 14,
                border: "2px solid rgba(255,255,255,0.4)",
                borderTopColor: "white",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
                flexShrink: 0,
              }}
            />
          )}
          {submitting ? "Sending…" : "Send"}
        </button>
      </form>

      {toast && <TerracottaToast onDismiss={() => setToast(false)} />}
    </>
  );
}
