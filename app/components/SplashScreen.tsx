"use client"

import { useEffect, useState } from "react"

interface SplashScreenProps {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [stage, setStage] = useState(0)
  // Stage 0: White screen
  // Stage 1: "Gellog" fades in (dark text)
  // Stage 2: "Gel" orange, "log" teal (+0.5s)
  // Stage 3: "Gelato" & "Logger" fade in (+0.5s)
  // Stage 4: Ice cream emoji appears (+0.8s)
  // Stage 5: Fade out (+0.7s to reach 2.5s total)

  useEffect(() => {
    // Start the animation sequence
    const timers: NodeJS.Timeout[] = []

    // Stage 1: Show "Gellog" immediately
    timers.push(setTimeout(() => setStage(1), 100))

    // Stage 2: Color transition after 0.5s
    timers.push(setTimeout(() => setStage(2), 600))

    // Stage 3: Show tagline after another 0.5s
    timers.push(setTimeout(() => setStage(3), 1100))

    // Stage 4: Show emoji after another 0.8s
    timers.push(setTimeout(() => setStage(4), 1900))

    // Stage 5: Fade out (at 2.5s total, accounting for animation)
    timers.push(setTimeout(() => setStage(5), 2500))

    // Call onComplete after fade out animation completes
    timers.push(setTimeout(() => onComplete(), 3000))

    return () => {
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [onComplete])

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${
        stage === 5 ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Main Logo */}
      <div
        className={`text-5xl font-bold tracking-tight transition-opacity duration-300 ${
          stage >= 1 ? "opacity-100" : "opacity-0"
        }`}
      >
        <span
          className={`transition-colors duration-300 ${
            stage >= 2 ? "text-[#D97706]" : "text-gray-900"
          }`}
        >
          Gel
        </span>
        <span
          className={`transition-colors duration-300 ${
            stage >= 2 ? "text-[#0D9488]" : "text-gray-900"
          }`}
        >
          log
        </span>
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
