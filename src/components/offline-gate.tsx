"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import {
  OFFLINE_ILLUSTRATION,
  OFFLINE_TINT,
  OfflineState,
} from "@/components/error-state"

/* Covers the whole app with the "No Internet Connection" state while the
   browser reports it is offline, and lifts it the moment the connection is
   back. Nothing underneath is unmounted, so an unsaved form survives a
   dropped connection.

   Once offline the illustration and its tint mask can no longer be fetched,
   so both are read into memory up front while the network is still there. */

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange)
  window.addEventListener("offline", onChange)
  return () => {
    window.removeEventListener("online", onChange)
    window.removeEventListener("offline", onChange)
  }
}

export function OfflineGate() {
  const router = useRouter()
  const online = React.useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  )
  const [retrying, setRetrying] = React.useState(false)
  const [art, setArt] = React.useState<{ illustration: string; tint: string }>()

  // Whatever failed to load while disconnected is fetched again on return.
  React.useEffect(() => {
    const refresh = () => router.refresh()
    window.addEventListener("online", refresh)
    return () => window.removeEventListener("online", refresh)
  }, [router])

  React.useEffect(() => {
    const urls: string[] = []
    let cancelled = false
    Promise.all(
      [OFFLINE_ILLUSTRATION, OFFLINE_TINT].map((src) =>
        fetch(src)
          .then((res) => (res.ok ? res.blob() : Promise.reject()))
          .then((blob) => {
            const url = URL.createObjectURL(blob)
            urls.push(url)
            return url
          })
      )
    )
      .then(([illustration, tint]) => {
        if (!cancelled) setArt({ illustration, tint })
      })
      .catch(() => {})
    return () => {
      cancelled = true
      urls.forEach(URL.revokeObjectURL)
    }
  }, [])

  async function retry() {
    setRetrying(true)
    try {
      // navigator.onLine only says a network interface is up, so ask the
      // server itself before letting the user back in.
      await fetch(window.location.href, { method: "HEAD", cache: "no-store" })
      router.refresh()
    } catch {
      // Still unreachable; the screen stays up.
    } finally {
      setRetrying(false)
    }
  }

  if (online) return null
  return (
    <OfflineState
      role="alertdialog"
      aria-modal
      aria-label="No internet connection"
      className="fixed inset-0 z-[100] overflow-y-auto bg-background"
      {...art}
      onRetry={retry}
      retrying={retrying}
    />
  )
}
