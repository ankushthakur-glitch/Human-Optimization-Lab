"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

/** Minutes without input before the session ends; HIPAA-typical default. */
export const SESSION_IDLE_MINUTES = 15

export const SESSION_EXPIRED_HREF = "/screens/session-expired"

const ACTIVITY = ["pointerdown", "keydown", "wheel", "touchstart"] as const

/* Sends the user to the Session Expired screen after a stretch with no input.
   Mounted by the signed-in app shell only, so the sign-in screens never time
   out. Add ?idle=<seconds> to any signed-in URL to see it fire quickly. */

export function SessionTimeout() {
  const router = useRouter()

  React.useEffect(() => {
    const override = Number(
      new URLSearchParams(window.location.search).get("idle")
    )
    const ms =
      override > 0 ? override * 1000 : SESSION_IDLE_MINUTES * 60 * 1000

    let timer = window.setTimeout(expire, ms)
    function expire() {
      router.replace(SESSION_EXPIRED_HREF)
    }
    function reset() {
      window.clearTimeout(timer)
      timer = window.setTimeout(expire, ms)
    }
    for (const type of ACTIVITY)
      window.addEventListener(type, reset, { passive: true })
    return () => {
      window.clearTimeout(timer)
      for (const type of ACTIVITY) window.removeEventListener(type, reset)
    }
  }, [router])

  return null
}
