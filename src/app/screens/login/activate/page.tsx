import type { Metadata } from "next"

import { AuthShell } from "@/components/auth/auth-shell"
import { SignInForm } from "@/components/auth/sign-in-form"

export const metadata: Metadata = { title: "Activate your account" }

/** The link in the invitation email lands here, email already filled in. */
export default function ActivateScreen() {
  return (
    <AuthShell
      title="Activate your account"
      description="You’ve been invited to the admin console as a Super Admin. Sign in with the one-time password from your email."
    >
      <SignInForm
        next="/screens/login/set-password"
        defaultEmail="jordan.reyes@humanoptimization.com"
        temporary
      />
    </AuthShell>
  )
}
