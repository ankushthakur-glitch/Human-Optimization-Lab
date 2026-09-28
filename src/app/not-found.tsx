import type { Metadata } from "next"

import { PageNotFoundState } from "@/components/error-state"
import { PortalFontLock } from "@/components/portal/portal-font-lock"

export const metadata: Metadata = { title: "Page not found" }

/** Any URL with no route, and every notFound() call. */
export default function NotFound() {
  return (
    <>
      <PortalFontLock />
      <PageNotFoundState />
    </>
  )
}
