"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { GellogLogo } from "./GellogLogo"

export interface SplashScreenProps {
  /** Called when the splash overlay begins fading out (t = 800ms); use to fade in app content in parallel. */
  onRevealContent: () => void
  onComplete: () => void
}

const LOGO_FADE_MS = 400
const HOLD_UNTIL_FADE_MS = 800
const OVERLAY_FADE_MS = 400

export function SplashScreen({ onRevealContent, onComplete }: SplashScreenProps) {
  const [logoVisible, setLogoVisible] = useState(false)
  const [overlayExiting, setOverlayExiting] = useState(false)
  const hasRevealedRef = useRef(false)
  const hasCompletedRef = useRef(false)

  const revealOnce = useCallback(() => {
    if (hasRevealedRef.current) return
    hasRevealedRef.current = true
    onRevealContent()
  }, [onRevealContent])

  const completeOnce = useCallback(() => {
    if (hasCompletedRef.current) return
    hasCompletedRef.current = true
    onComplete()
  }, [onComplete])

  useEffect(() => {
    hasRevealedRef.current = false
    hasCompletedRef.current = false

    const logoTimer = setTimeout(() => setLogoVisible(true), 0)

    const exitTimer = setTimeout(() => {
      revealOnce()
      setOverlayExiting(true)
    }, HOLD_UNTIL_FADE_MS)

    const fallbackComplete = setTimeout(() => {
      completeOnce()
    }, HOLD_UNTIL_FADE_MS + OVERLAY_FADE_MS + 80)

    return () => {
      clearTimeout(logoTimer)
      clearTimeout(exitTimer)
      clearTimeout(fallbackComplete)
    }
  }, [revealOnce, completeOnce])

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0F172A] px-6 transition-opacity ease-out ${
        overlayExiting ? "opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${OVERLAY_FADE_MS}ms` }}
      onTransitionEnd={(event) => {
        if (
          overlayExiting &&
          event.target === event.currentTarget &&
          event.propertyName === "opacity"
        ) {
          completeOnce()
        }
      }}
    >
      <div
        className={`flex justify-center transition-opacity ease-out ${
          logoVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{ transitionDuration: `${LOGO_FADE_MS}ms` }}
      >
        <GellogLogo size={120} priority />
      </div>
      <p
        className={`mt-3 text-center text-sm italic text-teal-400 transition-opacity ease-out dark:text-teal-300 ${
          logoVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{ transitionDuration: `${LOGO_FADE_MS}ms` }}
      >
        Gelato Logger
      </p>
    </div>
  )
}
