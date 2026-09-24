import type { Metadata } from "next"

import { AuthShell } from "@/components/auth/auth-shell"
import { SetPasswordForm } from "@/components/auth/set-password-form"
import { inviteeFrom, withInvitee } from "@/components/auth/invitees"

export const metadata: Metadata = { title: "Set your password" }

/** First sign-in: replace the one-time password, then set up 2FA. */
export default async function SetPasswordScreen({
  searchParams,
}: {
  searchParams: Promise<{ as?: string | string[] }>
}) {
  const invitee = inviteeFrom((await searchParams).as)

  return (
    <AuthShell
      title="Set your password"
      description="Choose a password only you know. You’ll use it every time you sign in."
    >
      <SetPasswordForm
        next={withInvitee("/screens/login/two-factor-setup", invitee.key)}
        submitLabel="Set password & continue"
      />
    </AuthShell>
  )
}
