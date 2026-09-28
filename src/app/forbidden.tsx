import type { Metadata } from "next"

import { PermissionDeniedState } from "@/components/error-state"
import { PortalFontLock } from "@/components/portal/portal-font-lock"

export const metadata: Metadata = { title: "Permission denied" }

/** Rendered with a 403 whenever a route calls forbidden() for the user's role. */
export default function Forbidden() {
  return (
    <>
      <PortalFontLock />
      <PermissionDeniedState />
    </>
  )
}
