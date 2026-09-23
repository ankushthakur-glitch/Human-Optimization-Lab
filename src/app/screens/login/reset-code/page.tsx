import type { Metadata } from "next"

import { AuthShell } from "@/components/auth/auth-shell"
import { CodeForm } from "@/components/auth/code-form"

export const metadata: Metadata = { title: "Check your email" }

/** The code from the reset email proves the inbox belongs to the account. */
export default function ResetCodeScreen() {
  return (
    <AuthShell
      title="Check your email"
      description={
        <>
          We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">
            jordan.reyes@humanoptimization.com
          </span>
          . It expires in 10 minutes.
        </>
      }
      back={{ href: "/screens/login", label: "Back to sign in" }}
    >
      <CodeForm
        next="/screens/login/reset-password"
        label="Verification code"
        submitLabel="Verify code"
        resend
      />
    </AuthShell>
  )
}
