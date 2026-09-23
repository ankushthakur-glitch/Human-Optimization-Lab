import type { Metadata } from "next"

import { AuthShell } from "@/components/auth/auth-shell"
import { CodeForm } from "@/components/auth/code-form"

export const metadata: Metadata = { title: "Two-factor verification" }

/** Second factor at every sign-in — required for all staff accounts. */
export default function VerifyScreen() {
  return (
    <AuthShell
      title="Two-factor verification"
      description="Open your authenticator app and enter the 6-digit code for your account."
      back={{ href: "/screens/login", label: "Back to sign in" }}
    >
      <CodeForm
        next="/screens/patients"
        label="Authentication code"
        submitLabel="Verify"
      />
    </AuthShell>
  )
}
