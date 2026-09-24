"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { AuthShell } from "@/components/auth/auth-shell"
import { VALIDATE } from "@/components/form-kit"
import { Button } from "@/design-system/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/design-system/ui/field"
import { Input } from "@/design-system/ui/input"
import { Spinner } from "@/design-system/ui/spinner"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Step one of a reset: which account. The code goes to that inbox. */
export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [error, setError] = React.useState<string>()
  const [pending, setPending] = React.useState(false)

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (VALIDATE && !email.trim()) return setError("Enter your email address.")
    if (VALIDATE && !EMAIL.test(email.trim()))
      return setError("Enter a valid email address, like name@practice.com.")
    setError(undefined)
    setPending(true)
    window.setTimeout(() => router.push("/screens/login/reset-code"), 600)
  }

  return (
    <AuthShell
      title="Forgot your password?"
      description="Enter the email you sign in with and we’ll send you a code to reset it."
      back={{ href: "/screens/login", label: "Back to sign in" }}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Field data-invalid={!!error || undefined}>
          <FieldLabel htmlFor="email">
            Email <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@practice.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error || undefined}
            autoFocus
          />
          {error ? (
            <FieldError>{error}</FieldError>
          ) : (
            <FieldDescription>
              For your security we won&rsquo;t say whether an account exists for
              this address.
            </FieldDescription>
          )}
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending && <Spinner />}
          Send reset code
        </Button>
      </form>
    </AuthShell>
  )
}
