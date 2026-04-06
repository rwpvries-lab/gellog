"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { GellogLogo } from "./GellogLogo"

export interface SplashScreenProps {
  onComplete: () => void
}

const FADE_OUT_DURATION_MS = 500
const STAGE_SCHEDULE = [
  { stage: 1, delay: 100 },
  { stage: 2, delay: 600 },
  { stage: 3, delay: 1100 },
  { stage: 4, delay: 1900 },
  { stage: 5, delay: 2500 },
]

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [stage, setStage] = useState(0)
  const hasCompletedRef = useRef(false)

  const completeSplash = useCallback(() => {
    if (hasCompletedRef.current) {
      return
    }

    hasCompletedRef.current = true
    onComplete()
  }, [onComplete])

  useEffect(() => {
    hasCompletedRef.current = false

    const timers: Array<ReturnType<typeof setTimeout>> = STAGE_SCHEDULE.map(
      ({ stage: nextStage, delay }) => setTimeout(() => setStage(nextStage), delay),
    )

    // Fallback in case the opacity transition end event is skipped.
    timers.push(setTimeout(completeSplash, 2500 + FADE_OUT_DURATION_MS + 100))

    return () => {
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [completeSplash])

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6 text-center transition-opacity duration-500 ${
        stage === 5 ? "opacity-0" : "opacity-100"
      }`}
      onTransitionEnd={(event) => {
        if (
          stage === 5 &&
          event.target === event.currentTarget &&
          event.propertyName === "opacity"
        ) {
          completeSplash()
        }
      }}
    >
      {/* Main Logo */}
      <div
        className={`flex justify-center transition-opacity duration-300 ${
          stage >= 1 ? "opacity-100" : "opacity-0"
        }`}
      >
        <GellogLogo size={120} priority />
      </div>

      {/* Tagline */}
      <div
        className={`mt-2 flex gap-2 text-lg italic transition-opacity duration-300 ${
          stage >= 3 ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="text-[#D97706]">Gelato</span>
        <span className="text-[#0D9488]">Logger</span>
      </div>

      {/* Ice Cream Emoji */}
      <div
        className={`mt-4 text-3xl transition-opacity duration-300 ${
          stage >= 4 ? "opacity-100" : "opacity-0"
        }`}
      >
        🍦
      </div>
    </div>
  )
}
