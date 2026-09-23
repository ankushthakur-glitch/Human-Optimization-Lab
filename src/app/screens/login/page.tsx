import type { Metadata } from "next"

import { AuthShell } from "@/components/auth/auth-shell"
import { SignInForm } from "@/components/auth/sign-in-form"

export const metadata: Metadata = { title: "Sign in" }

/** Returning user: email and password, then the authenticator code. */
export default function SignInScreen() {
  return (
    <AuthShell
      title="Sign in to your account"
      description="Welcome back. Sign in to see your patients."
    >
      <SignInForm next="/screens/login/verify" />
    </AuthShell>
  )
}
