'use client'

import { useEffect, useState } from 'react'
import { SplashScreen } from './SplashScreen'

export function SplashWrapper() {
  const [showSplash, setShowSplash] = useState(false)

  useEffect(() => {
    setShowSplash(true)
  }, [])

  if (!showSplash) return null

  return <SplashScreen onComplete={() => setShowSplash(false)} />
}
