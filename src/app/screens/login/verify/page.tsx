import type { Metadata } from "next"

import { AuthShell } from "@/components/auth/auth-shell"
import { CodeForm } from "@/components/auth/code-form"
import { inviteeFrom } from "@/components/auth/invitees"

export const metadata: Metadata = { title: "Two-factor verification" }

/** Second factor at every sign-in, required for all staff accounts. Practice
    staff go on to their portal, the Super Admin to the admin console. */
export default async function VerifyScreen({
  searchParams,
}: {
  searchParams: Promise<{ as?: string | string[] }>
}) {
  const invitee = inviteeFrom((await searchParams).as)

  return (
    <AuthShell
      title="Two-factor verification"
      description="Open your authenticator app and enter the 6-digit code for your account."
      back={{ href: "/screens/login", label: "Back to sign in" }}
    >
      <CodeForm next={invitee.home} label="Authentication code" submitLabel="Verify" />
    </AuthShell>
  )
}
