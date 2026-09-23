"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { PasswordInput } from "@/components/auth/auth-shell"
import { Button } from "@/design-system/ui/button"
import { Checkbox } from "@/design-system/ui/checkbox"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/design-system/ui/field"
import { Input } from "@/design-system/ui/input"
import { Label } from "@/design-system/ui/label"
import { Spinner } from "@/design-system/ui/spinner"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MESSAGES = {
  emailMissing: "Enter your email address.",
  emailInvalid: "Enter a valid email address, like name@practice.com.",
  secretMissing: "Enter your password.",
}

type Errors = { email?: string; secret?: string }

/**
 * Email and password. The same form serves a returning user and someone
 * arriving from their invite with a temporary password — `next` is where a
 * valid submit goes, which is the only thing that differs.
 */
export function SignInForm({
  next,
  defaultEmail = "",
  temporary = false,
}: {
  next: string
  defaultEmail?: string
  /** Invite path: the password is the one-time one from the email. */
  temporary?: boolean
}) {
  const router = useRouter()
  const [email, setEmail] = React.useState(defaultEmail)
  const [secret, setSecret] = React.useState("")
  const [errors, setErrors] = React.useState<Errors>({})
  const [pending, setPending] = React.useState(false)

  function validate(): Errors {
    const found: Errors = {}
    if (!email.trim()) found.email = MESSAGES.emailMissing
    else if (!EMAIL.test(email.trim())) found.email = MESSAGES.emailInvalid
    if (!secret) found.secret = MESSAGES.secretMissing
    return found
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length) return
    setPending(true)
    // A prototype: no account is checked, the delay just shows the busy state.
    window.setTimeout(() => router.push(next), 600)
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup className="gap-5">
        <Field data-invalid={!!errors.email || undefined}>
          <FieldLabel htmlFor="email">
            Email <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@practice.com"
            className="h-10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email || undefined}
          />
          {errors.email && <FieldError>{errors.email}</FieldError>}
        </Field>
        <Field data-invalid={!!errors.secret || undefined}>
          <FieldLabel htmlFor="secret">
            {temporary ? "One-time password" : "Password"}{" "}
            <span className="text-destructive">*</span>
          </FieldLabel>
          <PasswordInput
            id="secret"
            autoComplete={temporary ? "one-time-code" : "current-password"}
            placeholder={
              temporary ? "From your invitation email" : "Your password"
            }
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            invalid={!!errors.secret}
          />
          {errors.secret && <FieldError>{errors.secret}</FieldError>}
        </Field>
        {!temporary && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <Label htmlFor="remember" className="font-normal">
                Remember me
              </Label>
            </div>
            <Link
              href="/screens/login/forgot-password"
              className="text-sm text-primary-tint hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending && <Spinner />}
          {temporary ? "Continue" : "Sign in"}
        </Button>
      </FieldGroup>
    </form>
  )
}
