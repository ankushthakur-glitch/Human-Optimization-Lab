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
const ORG_ID = /^\d{6}$/

const MESSAGES = {
  orgMissing: "Enter your Organization ID.",
  orgInvalid: "Enter the 6-digit Organization ID from your invitation email.",
  emailMissing: "Enter your email address.",
  emailInvalid: "Enter a valid email address, like name@practice.com.",
  secretMissing: "Enter your password.",
}

type Errors = { orgId?: string; email?: string; secret?: string }

/**
 * Organization ID, email and password. The same form serves a returning user
 * and someone arriving from their invite with a temporary password.
 *
 * The Organization ID is the practice's Practice ID. Practice staff sign in
 * with it; the Super Admin leaves it blank, as the admin console belongs to no
 * practice. So a filled ID goes to `nextForPractice`, a blank one to `next`.
 */
export function SignInForm({
  next,
  nextForPractice = next,
  defaultOrgId = "",
  defaultEmail = "",
  orgRequired = false,
  showOrgId = true,
  temporary = false,
}: {
  next: string
  nextForPractice?: string
  defaultOrgId?: string
  defaultEmail?: string
  /** A clinic manager's invite: the ID is part of their account. */
  orgRequired?: boolean
  /** The Super Admin's invite has no practice, so no ID to ask for. */
  showOrgId?: boolean
  /** Invite path: the password is the one-time one from the email. */
  temporary?: boolean
}) {
  const router = useRouter()
  const [orgId, setOrgId] = React.useState(defaultOrgId)
  const [email, setEmail] = React.useState(defaultEmail)
  const [secret, setSecret] = React.useState("")
  const [errors, setErrors] = React.useState<Errors>({})
  const [pending, setPending] = React.useState(false)

  function validate(): Errors {
    const found: Errors = {}
    const id = orgId.trim()
    if (showOrgId) {
      if (!id && orgRequired) found.orgId = MESSAGES.orgMissing
      else if (id && !ORG_ID.test(id)) found.orgId = MESSAGES.orgInvalid
    }
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
    const target = showOrgId && orgId.trim() ? nextForPractice : next
    window.setTimeout(() => router.push(target), 600)
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup className="gap-5">
        {showOrgId && (
          <Field data-invalid={!!errors.orgId || undefined}>
            <FieldLabel htmlFor="org-id">
              Organization ID
              {orgRequired && (
                <>
                  {" "}
                  <span className="text-destructive">*</span>
                </>
              )}
            </FieldLabel>
            <Input
              id="org-id"
              inputMode="numeric"
              autoComplete="organization"
              maxLength={6}
              placeholder="e.g. 123456"
              className="h-10 tabular-nums"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value.replace(/\D/g, ""))}
              aria-invalid={!!errors.orgId || undefined}
            />
            {errors.orgId && <FieldError>{errors.orgId}</FieldError>}
          </Field>
        )}
        <Field data-invalid={!!errors.email || undefined}>
          <FieldLabel htmlFor="email">
            Email <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Enter Email"
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
            placeholder={temporary ? "From your invitation email" : "Password"}
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
              Forgot Password?
            </Link>
          </div>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending && <Spinner />}
          {temporary ? "Continue" : "Sign In"}
        </Button>
      </FieldGroup>
    </form>
  )
}
