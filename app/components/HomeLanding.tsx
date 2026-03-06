"use client";

import { useState } from "react";
import Link from "next/link";
import { SplashScreen } from "./SplashScreen";

export function HomeLanding() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash ? (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      ) : null}

      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
        <main className="flex w-full max-w-md flex-col items-center">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="text-orange-500">Gel</span>
            <span className="text-teal-600 dark:text-teal-400">log</span>
          </h1>
          <p className="mt-4 text-center text-zinc-600 dark:text-zinc-400">
            Log every ice cream. Track your flavours. Find the best spots.
          </p>
          <div className="mt-10 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="flex h-11 flex-1 items-center justify-center rounded-lg bg-teal-600 font-medium text-white transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:bg-teal-500 dark:hover:bg-teal-600 dark:focus:ring-offset-zinc-900 sm:flex-initial sm:px-8"
            >
              Inloggen
            </Link>
            <Link
              href="/signup"
              className="flex h-11 flex-1 items-center justify-center rounded-lg border border-zinc-300 bg-white font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:focus:ring-offset-zinc-900 sm:flex-initial sm:px-8"
            >
              Aanmelden
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
