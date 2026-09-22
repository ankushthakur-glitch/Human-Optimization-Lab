"use client"

import * as React from "react"
import { BRAND_SLUG } from "@/lib/brand"

export type DesignSystemConfig = {
  base: string
  accent: string
  font: string
  heading: string
  radius: string
  iconStroke: string
}

/**
 * The brand, and what Reset puts a browser back to. These values are also
 * written on <html> by the root layout so the server renders the same thing:
 * change one and change the other, or a page will repaint after it loads.
 */
export const DEFAULT_CONFIG: DesignSystemConfig = {
  base: "neutral",
  accent: "cyan",
  font: "inter",
  heading: "inherit",
  radius: "small",
  iconStroke: "regular",
}

/**
 * One appearance preference for the whole app, this browser only.
 *
 * Light/dark, the accent, the palette and the type are picked from the
 * customizer in the header, which is only worth anything if the choice sticks.
 * Anything built on this library reads the same store, so a colour chosen in
 * the gallery is the colour in the product — one preference, not two that
 * disagree.
 *
 * The trade that buys back: a screenshot or a review link carries whatever
 * theme the person viewing it last chose, not the brand. Reset in the
 * customizer puts a browser back to DEFAULT_CONFIG.
 */
const STORAGE_KEY = `${BRAND_SLUG}-design-system`

type ContextValue = {
  config: DesignSystemConfig
  setConfig: (patch: Partial<DesignSystemConfig>) => void
  reset: () => void
}

const DesignSystemContext = React.createContext<ContextValue | null>(null)

// Applied before paint so a stored theme never flashes the default first.
const BOOTSTRAP = `(function(){try{var c=JSON.parse(localStorage.getItem(${JSON.stringify(
  STORAGE_KEY
)})||"{}");var d=document.documentElement;var k={base:"data-base",accent:"data-accent",font:"data-font",heading:"data-heading",radius:"data-radius",iconStroke:"data-icon-stroke"};for(var p in k){if(c[p]){d.setAttribute(k[p],c[p])}}}catch(e){}})()`

export function DesignSystemBootstrap() {
  return <script dangerouslySetInnerHTML={{ __html: BOOTSTRAP }} />
}

function apply(config: DesignSystemConfig) {
  const el = document.documentElement
  el.setAttribute("data-base", config.base)
  el.setAttribute("data-accent", config.accent)
  el.setAttribute("data-font", config.font)
  el.setAttribute("data-heading", config.heading)
  el.setAttribute("data-radius", config.radius)
  el.setAttribute("data-icon-stroke", config.iconStroke)
}

export function DesignSystemProvider({ children }: { children: React.ReactNode }) {
  const [config, setState] = React.useState<DesignSystemConfig>(DEFAULT_CONFIG)

  React.useEffect(() => {
    // The bootstrap script already wrote these attributes before first paint;
    // this is what gets the same values into React state, so the pickers show
    // the choice that is actually on screen.
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const next = { ...DEFAULT_CONFIG, ...JSON.parse(stored) }
        setState(next)
        apply(next)
      }
    } catch {
      // Ignore unreadable storage (private mode, blocked site data).
    }
  }, [])

  const setConfig = React.useCallback((patch: Partial<DesignSystemConfig>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      apply(next)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Persisting is best-effort.
      }
      return next
    })
  }, [])

  const reset = React.useCallback(() => {
    apply(DEFAULT_CONFIG)
    setState(DEFAULT_CONFIG)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Best-effort.
    }
  }, [])

  const value = React.useMemo(() => ({ config, setConfig, reset }), [config, setConfig, reset])

  return <DesignSystemContext.Provider value={value}>{children}</DesignSystemContext.Provider>
}

export function useDesignSystem() {
  const ctx = React.useContext(DesignSystemContext)
  if (!ctx) {
    throw new Error("useDesignSystem must be used within DesignSystemProvider")
  }
  return ctx
}
