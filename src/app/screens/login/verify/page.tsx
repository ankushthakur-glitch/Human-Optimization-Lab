import type { Metadata } from "next"

import { AuthShell } from "@/components/auth/auth-shell"
import { CodeForm } from "@/components/auth/code-form"
import { inviteeFrom, safeNext } from "@/components/auth/invitees"

export const metadata: Metadata = { title: "Two-factor verification" }

/** Second factor at every sign-in, required for all staff accounts. Practice
    staff go on to their portal, the Super Admin to the admin console. */
export default async function VerifyScreen({
  searchParams,
}: {
  searchParams: Promise<{ as?: string | string[]; next?: string | string[] }>
}) {
  const params = await searchParams
  const invitee = inviteeFrom(params.as)
  // After an expired session: back to the page it ended on.
  const next = safeNext(params.next)
  const back = new URLSearchParams()
  if (invitee.key !== "super-admin") back.set("as", invitee.key)
  if (next) back.set("next", next)

  return (
    <AuthShell
      title="Two-factor verification"
      description="Open your authenticator app and enter the 6-digit code for your account."
      back={{
        href: back.size ? `/screens/login?${back}` : "/screens/login",
        label: "Back to sign in",
      }}
    >
      <CodeForm next={next ?? invitee.home} label="Authentication code" submitLabel="Verify" />
    </AuthShell>
  )
}
