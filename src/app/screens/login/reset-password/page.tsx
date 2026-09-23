import type { Metadata } from "next"

import { AuthShell } from "@/components/auth/auth-shell"
import { SetPasswordForm } from "@/components/auth/set-password-form"

export const metadata: Metadata = { title: "Reset your password" }

/** The last step of "Forgot password" — back to sign-in afterwards. */
export default function ResetPasswordScreen() {
  return (
    <AuthShell
      title="Create a new password"
      description="Your new password replaces the old one on every device."
      back={{ href: "/screens/login", label: "Back to sign in" }}
    >
      <SetPasswordForm
        next="/screens/login"
        submitLabel="Reset password"
        successMessage="Password reset. Sign in with your new password."
      />
    </AuthShell>
  )
}
