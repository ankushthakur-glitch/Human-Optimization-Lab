"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"

import { AuthShell } from "@/components/auth/auth-shell"
import { CodeForm } from "@/components/auth/code-form"
import { IconShieldCheck } from "@/design-system/icons"
import { Button } from "@/design-system/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/design-system/ui/dialog"
import { BRAND_NAME } from "@/lib/brand"
import { INVITEES, type InviteeKey } from "@/components/auth/invitees"

const REDIRECT_AFTER = 5

/* A real, scannable enrolment code for a demo account. The secret is the
   well-known example key from the Google Authenticator docs, so scanning it
   only adds a harmless demo entry; the real URI comes from the auth service
   with the account's own secret. */
const ISSUER = encodeURIComponent(BRAND_NAME)
const otpauthUri = (email: string) =>
  `otpauth://totp/${ISSUER}:${encodeURIComponent(email)}` +
  `?secret=JBSWY3DPEHPK3PXP&issuer=${ISSUER}&digits=6&period=30`

function EnrolmentQr({ email }: { email: string }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <QRCodeSVG
        value={otpauthUri(email)}
        size={160}
        level="M"
        marginSize={0}
        bgColor="#ffffff"
        fgColor="#000000"
        role="img"
        aria-label="QR code for your authenticator app"
      />
    </div>
  )
}

/** Confirms 2FA is on, then counts down into the app. */
function EnabledDialog({ open, next }: { open: boolean; next: string }) {
  const router = useRouter()
  const [wait, setWait] = React.useState(REDIRECT_AFTER)

  React.useEffect(() => {
    if (!open) return
    if (wait <= 0) {
      router.push(next)
      return
    }
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000)
    return () => window.clearTimeout(id)
  }, [open, wait, router, next])

  return (
    <Dialog open={open} disablePointerDismissal>
      <DialogContent showCloseButton={false} className="text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <IconShieldCheck className="size-8" />
        </span>
        <DialogHeader className="items-center">
          <DialogTitle className="text-lg">Account authenticated</DialogTitle>
          <DialogDescription>
            Two-factor authentication is on. You&rsquo;ll enter a code from
            your authenticator app each time you sign in.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Button size="lg" className="w-full" render={<Link href={next} />}>
            Continue to dashboard
          </Button>
          <p
            className="mt-3 text-sm text-muted-foreground"
            aria-live="polite"
          >
            Taking you there in {Math.max(wait, 0)}s&hellip;
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** First sign-in, after the password: enrol an authenticator app. */
export function TwoFactorSetup({ invitee: key }: { invitee: InviteeKey }) {
  const invitee = INVITEES[key]
  const [enabled, setEnabled] = React.useState(false)

  return (
    <AuthShell
      title="Set up two-factor authentication"
      description="Scan this QR code with an authenticator app such as Google Authenticator, Microsoft Authenticator or 1Password."
    >
      <div className="mb-6 flex justify-center">
        <EnrolmentQr email={invitee.email} />
      </div>
      <CodeForm
        onSuccess={() => setEnabled(true)}
        label="Enter the 6-digit code from your app to finish"
        submitLabel="Verify & enable 2FA"
      />
      <EnabledDialog open={enabled} next={invitee.home} />
    </AuthShell>
  )
}
