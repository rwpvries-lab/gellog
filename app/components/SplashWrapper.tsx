"use client"

import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { BottomNav } from "./BottomNav"
import { SplashScreen } from "./SplashScreen"

const SESSION_KEY = "gellog-splash-dismissed-session"

type SplashWrapperProps = {
  children: React.ReactNode
  /** When true, the main shell includes bottom padding for the nav bar. */
  user: boolean
}

export function SplashWrapper({ children, user }: SplashWrapperProps) {
  const pathname = usePathname()
  const hideBottomNav = pathname.startsWith("/icecream/logs/new")
  const [splashActive, setSplashActive] = useState(false)
  const [contentVisible, setContentVisible] = useState(true)
  const ranLayoutRef = useRef(false)

  useLayoutEffect(() => {
    if (ranLayoutRef.current) return
    ranLayoutRef.current = true
    queueMicrotask(() => {
      try {
        if (!sessionStorage.getItem(SESSION_KEY)) {
          setSplashActive(true)
          setContentVisible(false)
        }
      } catch {
        // sessionStorage unavailable — skip splash
      }
    })
  }, [])

  const handleRevealContent = useCallback(() => {
    setContentVisible(true)
  }, [])

  const handleSplashComplete = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1")
    } catch {
      // ignore
    }
    setSplashActive(false)
  }, [])

  return (
    <>
      <div
        className={`transition-opacity duration-[400ms] ease-out ${
          contentVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className={
            user
              ? hideBottomNav
                ? "min-h-screen"
                : "min-h-screen pb-28"
              : "min-h-screen"
          }
        >
          {children}
        </div>
        {user && !hideBottomNav ? <BottomNav /> : null}
      </div>
      {splashActive ? (
        <SplashScreen onRevealContent={handleRevealContent} onComplete={handleSplashComplete} />
      ) : null}
    </>
  )
}
