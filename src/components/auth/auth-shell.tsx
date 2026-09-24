"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"

import { BlueprintPanel } from "@/components/auth/brand-panel-blueprint"

import { cn } from "@/lib/utils"
import { BRAND_NAME, LOGO } from "@/lib/brand"
import { IconArrowLeft, IconEye, IconEyeOff } from "@/design-system/icons"
import { Button } from "@/design-system/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/design-system/ui/input-group"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  REGEXP_ONLY_DIGITS,
} from "@/design-system/ui/input-otp"

/* The sign-in screens share one frame: the brand panel on the left and the
   form on the right. The panel is drawn rather than photographed, so it needs
   no licensed imagery and follows the accent colour like the rest of the
   product. Below lg the panel drops away and the form takes the full width. */

/** The frame every sign-in step renders in. */
export function AuthShell({
  title,
  description,
  back,
  children,
}: {
  title: string
  description?: React.ReactNode
  /** Adds a "Back to …" link under the form. */
  back?: { href: string; label: string }
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-svh bg-muted/30 p-3 lg:grid-cols-[3fr_2fr]">
      <BlueprintPanel />
      <main className="flex flex-col px-4 py-8 sm:px-10">
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center">
          {/* Both tones ship and CSS hides one, as in the app shell, so the
              lockup never flashes the wrong tone before hydration. */}
          <Link href="/screens/login" className="mb-10 inline-flex w-fit">
            <Image
              src={LOGO.light}
              alt={BRAND_NAME}
              width={LOGO.width}
              height={LOGO.height}
              priority
              className="h-10 w-auto dark:hidden"
            />
            <Image
              src={LOGO.dark}
              alt={BRAND_NAME}
              width={LOGO.width}
              height={LOGO.height}
              priority
              className="hidden h-10 w-auto dark:block"
            />
          </Link>
          <header className="mb-8 space-y-1.5">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </header>
          {children}
          {back && (
            <Button
              variant="link"
              className="mx-auto mt-6 h-auto p-0 font-normal"
              nativeButton={false}
              render={<Link href={back.href} />}
            >
              <IconArrowLeft />
              {back.label}
            </Button>
          )}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
        </p>
      </main>
    </div>
  )
}

/** A password input with a show/hide toggle. */
export function PasswordInput({
  id,
  invalid,
  ...props
}: React.ComponentProps<typeof InputGroupInput> & { invalid?: boolean }) {
  const [visible, setVisible] = React.useState(false)
  return (
    <InputGroup data-invalid={invalid || undefined}>
      <InputGroupInput
        id={id}
        type={visible ? "text" : "password"}
        aria-invalid={invalid || undefined}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-controls={id}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <IconEyeOff /> : <IconEye />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}

/** Six separate digit boxes, the way authenticator codes are read aloud. */
export function CodeInput({
  value,
  onChange,
  invalid,
  onComplete,
  id,
}: {
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  onComplete?: (value: string) => void
  id?: string
}) {
  return (
    <InputOTP
      id={id}
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS}
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      autoFocus
      containerClassName="w-full"
    >
      <InputOTPGroup className="grid w-full grid-cols-6 gap-2 has-aria-invalid:ring-0 sm:gap-3 dark:has-aria-invalid:ring-0">
        {Array.from({ length: 6 }, (_, i) => (
          <InputOTPSlot
            key={i}
            index={i}
            aria-invalid={invalid || undefined}
            className={cn(
              "aspect-square size-auto rounded-lg border bg-background text-xl font-medium first:rounded-lg last:rounded-lg"
            )}
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}

/** Accepts any six digits except the "wrong code" the demo keeps for errors. */
export const DEMO_WRONG_CODE = "000000"
