import type { Metadata } from "next"

import { AuthShell } from "@/components/auth/auth-shell"
import { CodeForm } from "@/components/auth/code-form"
import { inviteeFrom, withInvitee } from "@/components/auth/invitees"

export const metadata: Metadata = { title: "Activate your account" }

/** The invitation's Activate account button lands here. Step one of the
    first sign-in: the one-time code from the email, then a new password,
    then (for staff) two-factor setup. The link names the account, so there
    is no email or password to type. */
export default async function ActivateScreen({
  searchParams,
}: {
  searchParams: Promise<{ as?: string | string[] }>
}) {
  const invitee = inviteeFrom((await searchParams).as)

  return (
    <AuthShell
      title="Activate your account"
      description={
        <>
          Enter the 6-digit code we sent to{" "}
          <span className="font-medium text-foreground">{invitee.email}</span>.
        </>
      }
    >
      <CodeForm
        next={withInvitee("/screens/login/set-password", invitee.key)}
        label="Activation code"
        submitLabel="Verify code"
      />
      {/* Practice staff sign in with it from now on, and the email no
          longer carries it, so it is shown once here. */}
      {invitee.orgId && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Organization ID :{" "}
          <span className="font-medium text-foreground tabular-nums">
            {invitee.orgId}
          </span>
        </p>
      )}
    </AuthShell>
  )
}
