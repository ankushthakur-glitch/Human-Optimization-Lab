"use client"

import * as React from "react"
import { DME_ACCENT, DME_ACCENT_KEY, isDmeAccent } from "@/lib/dme-brand"

const CHANGE = "dme-accent-change"

function readAccent() {
  try {
    const stored = localStorage.getItem(DME_ACCENT_KEY)
    return isDmeAccent(stored) ? stored : DME_ACCENT
  } catch {
    return DME_ACCENT
  }
}

/** Saves the pick and tells this page; other tabs and the preview iframes hear the storage event. */
export function setDmeAccent(name: string) {
  try {
    localStorage.setItem(DME_ACCENT_KEY, name)
  } catch {
    // Best-effort: the pick still applies to this page.
  }
  window.dispatchEvent(new Event(CHANGE))
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === DME_ACCENT_KEY) onChange()
  }
  window.addEventListener(CHANGE, onChange)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(CHANGE, onChange)
    window.removeEventListener("storage", onStorage)
  }
}

/**
 * The demo's primary colour, kept on <html> while a DME page is open. The
 * shared provider repaints its own stored accent after mount, so the attribute
 * is put back whenever it changes.
 */
export function useDmeAccent() {
  const accent = React.useSyncExternalStore(subscribe, readAccent, () => DME_ACCENT)

  React.useEffect(() => {
    const el = document.documentElement
    const lock = () => {
      if (el.getAttribute("data-accent") !== accent) el.setAttribute("data-accent", accent)
    }
    lock()
    const observer = new MutationObserver(lock)
    observer.observe(el, { attributes: true, attributeFilter: ["data-accent"] })
    return () => observer.disconnect()
  }, [accent])

  return accent
}
