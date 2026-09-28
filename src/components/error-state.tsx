"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"

/* The full-page states from the "Error states" frame in Figma: an
   illustration, a title, one paragraph and at most two actions, centred on
   the app's muted canvas. Each state is its own export so the page that
   renders it (not-found, forbidden, the idle timeout, the offline gate)
   only says which one. */

export const DASHBOARD_HREF = "/screens/patients"
export const SIGN_IN_HREF = "/screens/login"

export function ErrorState({
  illustration,
  tint = illustration.replace(/\.png$/, "-tint.png"),
  title,
  description,
  actions,
  unoptimized,
  className,
  ...props
}: {
  /** Path under public/; the art is 3:2 and shown at up to 540 × 360. */
  illustration: string
  /** Where the art takes the primary colour; defaults to <name>-tint.png.
      Both come from scripts/gen-error-illustrations.mjs. */
  tint?: string
  /** Skip the image optimiser, e.g. for a blob: URL held for offline use. */
  unoptimized?: boolean
  title: string
  description: React.ReactNode
  actions: React.ReactNode
} & Omit<React.ComponentProps<"main">, "title">) {
  return (
    <main
      className={cn(
        "flex min-h-svh items-center justify-center bg-muted/30 px-4 py-10",
        className
      )}
      {...props}
    >
      <div className="flex w-full max-w-[806px] flex-col items-center gap-6 text-center">
        {/* Grey art with --primary laid over its blue areas in "color" blend:
            the hue follows the accent, the shading stays the illustrator's. */}
        <div className="relative isolate aspect-[3/2] w-full max-w-[540px]">
          <Image
            src={illustration}
            alt=""
            fill
            priority
            unoptimized={unoptimized}
            sizes="(min-width: 600px) 540px, 100vw"
            className="object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-primary mix-blend-color"
            style={{
              maskImage: `url(${tint})`,
              maskSize: "cover",
              maskPosition: "center",
              maskRepeat: "no-repeat",
            }}
          />
        </div>
        <div className="flex flex-col items-center gap-5">
          <div className="space-y-3">
            <h1 className="font-heading text-2xl leading-tight font-bold text-foreground sm:text-[32px]">
              {title}
            </h1>
            <p className="text-base leading-[1.64] text-muted-foreground">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {actions}
          </div>
        </div>
      </div>
    </main>
  )
}

/** history.back(), or the dashboard when this page was opened directly. */
function GoBackButton() {
  const router = useRouter()
  return (
    <Button
      variant="outline"
      size="lg"
      onClick={() => {
        if (window.history.length > 1) router.back()
        else router.push(DASHBOARD_HREF)
      }}
    >
      Go Back
    </Button>
  )
}

function LinkButton({ href, children }: { href: string; children: string }) {
  return (
    <Button size="lg" nativeButton={false} render={<Link href={href} />}>
      {children}
    </Button>
  )
}

/* ---------------------------------------------------------------- states -- */

export function PageNotFoundState() {
  return (
    <ErrorState
      illustration="/illustrations/errors/not-found.png"
      title="Oops! Page Not Found"
      description="The page you're looking for doesn't exist, has been moved, or the link may be incorrect. Return to the dashboard or use the navigation menu to continue."
      actions={
        <>
          <GoBackButton />
          <LinkButton href={DASHBOARD_HREF}>Return To Dashboard</LinkButton>
        </>
      }
    />
  )
}

export function SessionExpiredState({
  signInHref = SIGN_IN_HREF,
}: {
  /** The sign-in for the portal the session ended in. */
  signInHref?: string
}) {
  return (
    <ErrorState
      illustration="/illustrations/errors/session-expired.png"
      title="Session Expired!"
      description="For your security, your session has expired due to inactivity. Please sign in again to continue accessing patient records and system features."
      actions={
        <>
          <GoBackButton />
          <LinkButton href={signInHref}>Sign In Again</LinkButton>
        </>
      }
    />
  )
}

export function PermissionDeniedState() {
  return (
    <ErrorState
      illustration="/illustrations/errors/permission-denied.png"
      title="Permission Denied!"
      description="Your current role doesn't allow access to this feature. Contact your administrator if you need additional permissions."
      actions={
        <>
          <GoBackButton />
          {/* No admin contact exists yet; this opens a draft addressed by the user. */}
          <Button
            size="lg"
            nativeButton={false}
            render={<a href="mailto:?subject=Access%20request" />}
          >
            Contact Admin
          </Button>
        </>
      }
    />
  )
}

export const OFFLINE_ILLUSTRATION = "/illustrations/errors/offline.png"
export const OFFLINE_TINT = "/illustrations/errors/offline-tint.png"

export function OfflineState({
  onRetry,
  retrying,
  illustration = OFFLINE_ILLUSTRATION,
  tint = OFFLINE_TINT,
  ...props
}: {
  onRetry: () => void
  retrying?: boolean
  illustration?: string
  tint?: string
} & Omit<React.ComponentProps<"main">, "title">) {
  return (
    <ErrorState
      illustration={illustration}
      tint={tint}
      unoptimized={illustration.startsWith("blob:")}
      title="No Internet Connection!"
      description="You're currently offline. Please check your internet connection and reconnect to continue accessing patient records and system features."
      actions={
        <Button size="lg" onClick={onRetry} disabled={retrying}>
          Try Again
        </Button>
      }
      {...props}
    />
  )
}
