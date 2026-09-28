import type { Metadata } from "next"

import { signInAgainHref } from "@/components/auth/invitees"
import { SessionExpiredState } from "@/components/error-state"

export const metadata: Metadata = { title: "Session expired" }

/** Where the app shell's idle timer lands; see SessionTimeout. `?from=` is
    the page the session ended on: signing in again goes back to it, in the
    same portal. */
export default async function SessionExpiredScreen({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>
}) {
  const { from } = await searchParams
  return (
    <SessionExpiredState
      signInHref={signInAgainHref(typeof from === "string" ? from : undefined)}
    />
  )
}
