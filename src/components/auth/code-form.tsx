"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { CodeInput, DEMO_WRONG_CODE } from "@/components/auth/auth-shell"
import { Button } from "@/design-system/ui/button"
import { Field, FieldError, FieldLabel } from "@/design-system/ui/field"
import { Spinner } from "@/design-system/ui/spinner"
import { LogoSplash } from "@/design-system/ui/logo-loader"

const RESEND_AFTER = 30

/**
 * A six-digit code, then `next`. Used for the authenticator code at sign-in,
 * the one that enables 2FA, and the reset code sent by email.
 *
 * The prototype takes any six digits except 000000, which stands in for a
 * wrong code so the error state can be reviewed.
 */
export function CodeForm({
  next,
  onSuccess,
  label,
  submitLabel,
  resend,
}: {
  next?: string
  /** Called on a good code instead of navigating to `next`. */
  onSuccess?: () => void
  label: string
  submitLabel: string
  /** Codes sent by email can be re-sent; authenticator codes cannot. */
  resend?: boolean
}) {
  const router = useRouter()
  const [code, setCode] = React.useState("")
  const [error, setError] = React.useState<string>()
  const [pending, setPending] = React.useState(false)
  const [entering, setEntering] = React.useState(false)
  const [wait, setWait] = React.useState(resend ? RESEND_AFTER : 0)

  React.useEffect(() => {
    if (wait <= 0) return
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000)
    return () => window.clearTimeout(id)
  }, [wait])

  function submit(value = code) {
    if (value.length < 6) {
      setError("Enter all six digits.")
      return
    }
    if (value === DEMO_WRONG_CODE) {
      setError("That code isn’t right. Check your app and try again.")
      setCode("")
      return
    }
    setError(undefined)
    setPending(true)
    window.setTimeout(() => {
      if (onSuccess) onSuccess()
      else if (next) {
        // Leaving sign-in for the app itself: cover the hand-off with the
        // branded splash rather than a frozen form.
        if (!next.startsWith("/screens/login")) setEntering(true)
        router.push(next)
      }
    }, 600)
  }

  if (entering) {
    const status = next?.startsWith("/screens/admin") ? "Loading practices" : "Loading patients"
    return <LogoSplash overlay status={status} />
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      noValidate
      className="space-y-5"
    >
      <Field data-invalid={!!error || undefined}>
        <FieldLabel
          htmlFor="code"
          className="font-normal text-muted-foreground"
        >
          {label}
        </FieldLabel>
        <CodeInput
          id="code"
          value={code}
          onChange={(value) => {
            setCode(value)
            if (error) setError(undefined)
          }}
          onComplete={(value) => submit(value)}
          invalid={!!error}
        />
        {error && <FieldError role="alert">{error}</FieldError>}
      </Field>
      {resend && (
        <p className="text-center text-sm text-muted-foreground">
          Didn&rsquo;t get the code?{" "}
          {wait > 0 ? (
            <span>Resend in {wait}s</span>
          ) : (
            <button
              type="button"
              className="text-primary-tint hover:underline"
              onClick={() => setWait(RESEND_AFTER)}
            >
              Resend code
            </button>
          )}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Spinner />}
        {submitLabel}
      </Button>
    </form>
  )
}
