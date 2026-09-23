"use client"

import * as React from "react"
import { BRAND_SLUG } from "@/lib/brand"
import { ALL_ACCENT_THEMES, isKnownAccent } from "@/design-system/tokens/accents"
import { useMounted } from "@/hooks/use-mounted"

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
  accent: "brand-teal",
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

/**
 * Stamped on every save. The whole config is stored, so a browser that only
 * ever toggled dark mode still carries whatever accent was the default then.
 * An accent saved without the current stamp is dropped on read, which is how
 * the switch of default from blue to teal reaches browsers that saved before
 * it. Bump this when the default accent changes again.
 */
const ACCENT_VERSION = 2

type ContextValue = {
  config: DesignSystemConfig
  setConfig: (patch: Partial<DesignSystemConfig>) => void
  reset: () => void
}

const DesignSystemContext = React.createContext<ContextValue | null>(null)

// Applied before paint so a stored theme never flashes the default first. A
// ?accent=… preview (see the provider's effect) is applied here too.
// An accent saved before the palette was cut to the brand set is dropped, so
// the page keeps the default the server rendered instead of an unknown one.
const BOOTSTRAP = `(function(){try{var c=JSON.parse(localStorage.getItem(${JSON.stringify(
  STORAGE_KEY
)})||"{}");if(${JSON.stringify(
  ALL_ACCENT_THEMES.map((theme) => theme.name)
)}.indexOf(c.accent)<0||c.accentVersion!==${ACCENT_VERSION}){delete c.accent}var d=document.documentElement;var k={base:"data-base",accent:"data-accent",font:"data-font",heading:"data-heading",radius:"data-radius",iconStroke:"data-icon-stroke"};for(var p in k){if(c[p]){d.setAttribute(k[p],c[p])}}var q=new URLSearchParams(location.search).get("accent");if(${JSON.stringify(
  ALL_ACCENT_THEMES.map((theme) => theme.name)
)}.indexOf(q)>=0){d.setAttribute("data-accent",q)}}catch(e){}})()`

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

function readStoredConfig(): DesignSystemConfig | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    const next = { ...DEFAULT_CONFIG, ...JSON.parse(stored) }
    if (!isKnownAccent(next.accent) || next.accentVersion !== ACCENT_VERSION) {
      next.accent = DEFAULT_CONFIG.accent
    }
    delete next.accentVersion
    return next
  } catch {
    // Ignore unreadable storage (private mode, blocked site data).
    return null
  }
}

export function DesignSystemProvider({ children }: { children: React.ReactNode }) {
  // The bootstrap script already wrote the stored attributes before first
  // paint; reading the same store once mounted gets those values into React,
  // so the pickers show the choice that is actually on screen. The server and
  // the hydrating render both see DEFAULT_CONFIG, so the markup matches.
  const mounted = useMounted()
  const stored = React.useMemo(() => (mounted ? readStoredConfig() : null), [mounted])
  const [picked, setPicked] = React.useState<DesignSystemConfig | null>(null)
  const config = picked ?? stored ?? DEFAULT_CONFIG

  React.useEffect(() => {
    if (stored) apply(stored)
    // A page can be opened with ?accent=… to preview one preset — the accent
    // comparison frames three screens this way. It paints the page but is
    // never saved, so looking at a preview doesn't change the reader's pick.
    const preview = new URLSearchParams(window.location.search).get("accent")
    if (isKnownAccent(preview)) {
      document.documentElement.setAttribute("data-accent", preview)
    }
  }, [stored])

  const setConfig = React.useCallback((patch: Partial<DesignSystemConfig>) => {
    setPicked((prev) => {
      const next = { ...(prev ?? stored ?? DEFAULT_CONFIG), ...patch }
      apply(next)
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...next, accentVersion: ACCENT_VERSION })
        )
      } catch {
        // Persisting is best-effort.
      }
      return next
    })
  }, [stored])

  const reset = React.useCallback(() => {
    apply(DEFAULT_CONFIG)
    setPicked(DEFAULT_CONFIG)
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
