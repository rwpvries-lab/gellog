"use client";

import {
  getOwnerVerifiedSalonCount,
  isAtVerifiedSalonCap,
  OWNER_VERIFIED_SALON_CAP,
} from "@/src/lib/ownerSalonCap";
import { createClient } from "@/src/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ROLES = ["Owner", "Manager", "Staff"] as const;
type Role = (typeof ROLES)[number];

type ClaimFormProps = {
  placeId: string;
  currentUserId: string;
  prefillEmail: string;
};

export function ClaimForm({ placeId, currentUserId, prefillEmail }: ClaimFormProps) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("Owner");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(prefillEmail);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();

    const verifiedCount = await getOwnerVerifiedSalonCount(supabase, currentUserId);
    if (isAtVerifiedSalonCap(verifiedCount)) {
      setError(
        `You can have at most ${OWNER_VERIFIED_SALON_CAP} verified salons on your plan. Contact support@gellog.app for more.`,
      );
      setSubmitting(false);
      return;
    }

    const { data: updated, error: updateError } = await supabase
      .from("salon_profiles")
      .update({
        owner_id: currentUserId,
        is_claimed: true,
        claim_verified: false,
        claim_name: name,
        claim_role: role,
        claim_phone: phone,
        claim_email: email,
        claim_message: message || null,
      })
      .eq("place_id", placeId)
      .eq("is_claimed", false)
      .select("id");

    if (updateError) {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    if (!updated || updated.length === 0) {
      setError("Could not complete claim — the salon page may not exist yet. Please refresh and try again.");
      setSubmitting(false);
      return;
    }

    router.push(`/salon/${placeId}/dashboard?claimed=1`);
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Your name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-teal-600 dark:focus:ring-teal-900/40"
        />
      </div>

      {/* Role */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Your role at the salon
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-teal-600 dark:focus:ring-teal-900/40"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Phone */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Phone number
        </label>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Used to verify your ownership — not shown publicly until verified.
        </p>
        <input
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 555 000 0000"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-teal-600 dark:focus:ring-teal-900/40"
        />
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email address
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-teal-600 dark:focus:ring-teal-900/40"
        />
      </div>

      {/* Optional message */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Tell us about your salon{" "}
          <span className="font-normal text-zinc-400">(optional)</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="A few words about your salon…"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-teal-600 dark:focus:ring-teal-900/40"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-1 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-orange-300/50 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-60 dark:shadow-none dark:focus:ring-offset-zinc-950"
      >
        {submitting ? "Submitting…" : "Submit claim"}
      </button>
    </form>
  );
}
