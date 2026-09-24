"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/design-system/ui/sonner"

import { PasswordInput } from "@/components/auth/auth-shell"
import { Required, VALIDATE } from "@/components/form-kit"
import { Button } from "@/design-system/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/design-system/ui/field"
import { Spinner } from "@/design-system/ui/spinner"

/* Checked on submit; a weak password gets one message that names every rule. */
const RULES = [
  { label: "At least 12 characters", test: (v: string) => v.length >= 12 },
  {
    label: "An uppercase and a lowercase letter",
    test: (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v),
  },
  { label: "A number", test: (v: string) => /\d/.test(v) },
  {
    label: "A symbol, like ! or #",
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
]

/** New password + confirmation, for first sign-in and for a reset alike. */
export function SetPasswordForm({
  next,
  submitLabel,
  successMessage,
}: {
  next: string
  submitLabel: string
  successMessage?: string
}) {
  const router = useRouter()
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [submitted, setSubmitted] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  const strong = !VALIDATE || RULES.every((rule) => rule.test(password))
  const matches = !VALIDATE || (confirm.length > 0 && confirm === password)
  const passwordError =
    submitted && !strong
      ? "Use at least 12 characters, with upper and lowercase letters, a number and a symbol."
      : undefined
  const confirmError =
    VALIDATE && submitted && !confirm
      ? "Re-enter your new password."
      : submitted && !matches
        ? "Passwords don’t match."
        : undefined

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (!strong || !matches) return
    setPending(true)
    window.setTimeout(() => {
      if (successMessage) toast.success(successMessage)
      router.push(next)
    }, 600)
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup className="gap-5">
        <Field data-invalid={!!passwordError || undefined}>
          <FieldLabel htmlFor="new-password">
            New password
            <Required />
          </FieldLabel>
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={!!passwordError}
          />
          {passwordError && <FieldError>{passwordError}</FieldError>}
        </Field>
        <Field data-invalid={!!confirmError || undefined}>
          <FieldLabel htmlFor="confirm-password">
            Confirm password
            <Required />
          </FieldLabel>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            invalid={!!confirmError}
          />
          {confirmError && <FieldError>{confirmError}</FieldError>}
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending && <Spinner />}
          {submitLabel}
        </Button>
      </FieldGroup>
    </form>
  )
}
