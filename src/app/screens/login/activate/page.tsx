import type { Metadata } from "next"

import { AuthShell } from "@/components/auth/auth-shell"
import { SignInForm } from "@/components/auth/sign-in-form"
import { inviteeFrom, withInvitee } from "@/components/auth/invitees"

export const metadata: Metadata = { title: "Activate your account" }

/** The link in the invitation email lands here, email (and a clinic
    manager's Organization ID) already filled in. */
export default async function ActivateScreen({
  searchParams,
}: {
  searchParams: Promise<{ as?: string | string[] }>
}) {
  const invitee = inviteeFrom((await searchParams).as)
  const next = withInvitee("/screens/login/set-password", invitee.key)

  return (
    <AuthShell
      title="Activate your account"
      description={
        invitee.key === "patient"
          ? `You’ve been invited by ${invitee.practice}. Sign in with the details from your email.`
          : invitee.practice
            ? `You’ve been invited to ${invitee.practice} as its Clinic Manager. Sign in with the details from your email.`
            : "You’ve been invited to the admin console as a Super Admin. Sign in with the one-time password from your email."
      }
    >
      <SignInForm
        next={next}
        nextForPractice={next}
        defaultOrgId={invitee.orgId}
        defaultEmail={invitee.email}
        showOrgId={!!invitee.orgId}
        orgRequired
        temporary
      />
    </AuthShell>
  )
}
