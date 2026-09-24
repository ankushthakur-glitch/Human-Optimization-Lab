import type { Metadata } from "next"

import { AuthShell } from "@/components/auth/auth-shell"
import { SignInForm } from "@/components/auth/sign-in-form"

export const metadata: Metadata = { title: "Sign in" }

/** Returning user: Organization ID, email and password, then the
    authenticator code. Practice staff give their ID; the Super Admin doesn't. */
export default function SignInScreen() {
  return (
    <AuthShell title="Sign in to your account">
      <SignInForm
        next="/screens/login/verify"
        nextForPractice="/screens/login/verify?as=clinic-manager"
      />
    </AuthShell>
  )
}
