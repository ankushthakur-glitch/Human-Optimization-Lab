"use client"

import * as React from "react"

/* Marks <html> as the portal while a /screens route is mounted, so the
   :root[data-portal] rule in globals.css pins the fonts to Inter. The inline
   script covers the first paint of a hard load; the layout effect covers
   client navigation in and out of /screens. */
const SCRIPT = `document.documentElement.setAttribute("data-portal","")`

export function PortalFontLock() {
  React.useLayoutEffect(() => {
    const root = document.documentElement
    root.setAttribute("data-portal", "")
    return () => root.removeAttribute("data-portal")
  }, [])

  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
}
