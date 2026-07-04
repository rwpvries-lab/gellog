"use client";

import { GellogLogo } from "@/app/components/GellogLogo";
import { createClient } from "@/src/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { userFacingAuthMessage } from "@/src/lib/userFacingError";
import {
  isAppleSignInAvailable,
  signInWithApple,
} from "@/src/lib/apple-signin";
import { registerPushNotifications } from "@/src/lib/native-push";
import {
  GoogleSignInCancelled,
  isNativeGoogleShell,
  signInWithGoogle,
} from "@/src/lib/google-signin";
import { AppleSignInButton } from "@/app/components/AppleSignInButton";
import { TermsGate } from "@/app/components/TermsGate";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Evaluate native availability after mount: under the remote-URL wrapper the
  // initial HTML is server-rendered (getPlatform() === "web"), so gating inline
  // would omit the button from SSR and rely on hydration to add it. Mounting it
  // in state makes the Apple button appear deterministically on iPad + iPhone.
  const [appleAvailable, setAppleAvailable] = useState(false);
  useEffect(() => {
    setAppleAvailable(isAppleSignInAvailable());
  }, []);

  async function handleGoogle() {
    if (isNativeGoogleShell()) {
      setError(null);
      try {
        await signInWithGoogle(supabase);
        const next = searchParams.get("next") || "/";
        router.push(next);
        setTimeout(() => void registerPushNotifications(supabase), 0);
      } catch (err) {
        if (err instanceof GoogleSignInCancelled) return;
        // Log the raw error so it's visible in a device inspector — the
        // Capacitor bridge can surface a misleading generic message here
        // (e.g. "plugin is not implemented") when the real native error is
        // something else entirely, so don't rely on `detail` alone to debug.
        console.error("Google sign-in failed:", err);
        const detail = err instanceof Error ? err.message : "";
        setError(
          detail
            ? `Google sign-in failed: ${detail}`
            : "We couldn't sign you in with Google. Please try again.",
        );
      }
      return;
    }

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  }

  async function handleApple() {
    setError(null);
    try {
      // Establishes the Supabase session and persists Apple's first-sign-in name.
      await signInWithApple(supabase);
      // Native iOS: prompt for push + register the device (no-op on web).
      void registerPushNotifications(supabase);
      const next = searchParams.get("next") || "/";
      router.push(next);
      router.refresh();
    } catch (err) {
      // Surface the real reason (e.g. iPad presentation/availability failures)
      // instead of masking every failure behind a generic retry message.
      const detail = err instanceof Error ? err.message : "";
      setError(
        detail
          ? `Apple sign-in failed: ${detail}`
          : "We couldn't sign you in with Apple. Please try again.",
      );
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(userFacingAuthMessage(signInError.message));
        setLoading(false);
        return;
      }
      const next = searchParams.get("next") || "/";
      router.push(next);
      // Defer push registration until after navigation to avoid the Android
      // POST_NOTIFICATIONS permission dialog interrupting the route transition.
      setTimeout(() => void registerPushNotifications(supabase), 0);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <TermsGate>
    <div className="flex min-h-screen flex-col items-center justify-center bg-[color:var(--background-primary)] px-4 py-12">
      <main className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <GellogLogo size={88} priority />
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Log in
          </h2>

          {/* Google */}
          <button
            type="button"
            onClick={() => void handleGoogle()}
            className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Apple — native iOS only (App Store guideline 4.8) */}
          {appleAvailable && <AppleSignInButton onClick={handleApple} />}

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
            <span className="text-xs text-zinc-400">or</span>
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-[color:var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[color:var(--border-focus)]"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="login-password"
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-[color:var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[color:var(--border-focus)]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-[color:var(--brand-primary)] font-medium text-[color:var(--text-inverse)] transition-colors hover:bg-[color:var(--brand-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)] focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-[color:var(--brand-primary)] hover:underline"
          >
            Sign up
          </Link>
        </p>
        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
          <Link
            href="/privacy"
            className="text-[color:var(--brand-primary)] hover:underline"
          >
            Privacy Policy
          </Link>{" "}
          ·{" "}
          <Link
            href="/terms"
            className="text-[color:var(--brand-primary)] hover:underline"
          >
            Terms &amp; Conditions
          </Link>
        </p>
      </main>
    </div>
    </TermsGate>
  );
}
