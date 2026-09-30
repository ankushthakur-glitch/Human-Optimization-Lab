import type { Metadata } from "next"

import { AuthShell } from "@/components/auth/auth-shell"
import { SetPasswordForm } from "@/components/auth/set-password-form"
import { inviteeFrom, withInvitee } from "@/components/auth/invitees"

export const metadata: Metadata = { title: "Create your password" }

/** First sign-in, step two: after the activation code, a new password and
    its confirmation, then 2FA setup. */
export default async function SetPasswordScreen({
  searchParams,
}: {
  searchParams: Promise<{ as?: string | string[] }>
}) {
  const invitee = inviteeFrom((await searchParams).as)

  return (
    <AuthShell
      title="Create your password"
    >
      <SetPasswordForm
        next={withInvitee("/screens/login/two-factor-setup", invitee.key)}
        submitLabel="Set password & continue"
      />
    </AuthShell>
  )
}
