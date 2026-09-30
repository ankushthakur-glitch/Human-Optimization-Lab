import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { BRAND_NAME, LOGO, MARK } from "@/lib/brand"
import {
  inviteeFrom,
  withInvitee,
  type Invitee,
} from "@/components/auth/invitees"

export const metadata: Metadata = { title: "Invitation email variations" }

/* Ten directions for the invitation email, side by side for review. Each
   carries the same content as the shipped template (the one-time code, the
   Activate account button, what happens next, who to contact) and differs
   only in layout and tone. Follows `?as=` like the other email screens.

   Colours are literal, as in the real email: an inbox never sees the app's
   theme. Every letter is 600px wide, the usual email width. */

const PETROL = "#173E45"
const TEAL = "#2F6F73"
const TINT = "#E6F0EF"
const TILE = "#F3F8F7"
const LINE = "#D5E3E1"
const SAND = "#EFE9E1"
const INK = "#171717"
const BODY = "#393939"
const MUTED = "#6B7280"

type Props = { invitee: Invitee }

/* ── Shared pieces ───────────────────────────────────────────── */

const isPatient = (i: Invitee) => i.key === "patient"
const senderOf = (i: Invitee) => (isPatient(i) ? i.practice! : i.sender.name)

function activateHref(i: Invitee) {
  return isPatient(i)
    ? `/app/activate?email=${encodeURIComponent(i.email)}`
    : withInvitee("/screens/login/activate", i.key)
}

function invitedTo(i: Invitee) {
  if (i.key === "patient") return `the ${BRAND_NAME} app`
  if (i.key === "provider") return `${i.practice} on ${BRAND_NAME} as a Provider`
  if (i.key === "clinic-manager")
    return `${i.practice} on ${BRAND_NAME} as its Clinic Manager`
  return `the ${BRAND_NAME} admin console as a Super Admin`
}

function inviter(i: Invitee) {
  return i.key === "super-admin" || i.key === "clinic-manager"
    ? "Maya Chen"
    : isPatient(i)
      ? i.practice!
      : i.sender.name
}

function steps(i: Invitee) {
  return [
    "Click Activate account",
    "Enter your one-time code",
    isPatient(i)
      ? "Create your own password"
      : "Create your password and set up two-factor authentication",
  ]
}

function Arrow({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Button({
  invitee,
  tone = "petrol",
  full,
  arrow = true,
  className,
}: Props & {
  tone?: "petrol" | "white" | "sand"
  full?: boolean
  arrow?: boolean
  className?: string
}) {
  const colors = {
    petrol: { backgroundColor: PETROL, color: "#fff" },
    white: { backgroundColor: "#fff", color: PETROL },
    sand: { backgroundColor: SAND, color: PETROL },
  }[tone]
  return (
    <Link
      href={activateHref(invitee)}
      style={colors}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-xl px-8 text-[15px] font-semibold no-underline",
        full && "w-full",
        className
      )}
    >
      Activate account
      {arrow && <Arrow />}
    </Link>
  )
}

function Tiles({
  code,
  size = "md",
  dark,
}: {
  code: string
  size?: "sm" | "md" | "lg"
  dark?: boolean
}) {
  return (
    <span className="flex justify-center gap-2" aria-label={`Code ${code}`}>
      {code.split("").map((d, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "flex items-center justify-center rounded-lg border font-semibold tabular-nums",
            size === "sm" && "h-10 w-8 text-xl",
            size === "md" && "h-14 w-12 text-[28px]",
            size === "lg" && "h-16 w-[52px] text-[32px]"
          )}
          style={
            dark
              ? { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.18)", color: "#fff" }
              : { backgroundColor: TILE, borderColor: LINE, color: PETROL }
          }
        >
          {d}
        </span>
      ))}
    </span>
  )
}

function Logo({ dark, className }: { dark?: boolean; className?: string }) {
  return (
    <Image
      src={dark ? LOGO.dark : LOGO.light}
      alt={BRAND_NAME}
      width={LOGO.width}
      height={LOGO.height}
      className={cn("h-8 w-auto", className)}
    />
  )
}

function Mark({ className }: { className?: string }) {
  return (
    <Image
      src={MARK.light}
      alt=""
      width={48}
      height={48}
      className={cn("size-10", className)}
    />
  )
}

function Help({ invitee, className }: Props & { className?: string }) {
  return (
    <p className={className}>
      Questions? Contact {senderOf(invitee)} at{" "}
      <span className="whitespace-nowrap underline underline-offset-2" style={{ color: PETROL }}>
        {invitee.sender.phone}
      </span>
      .
    </p>
  )
}

function Expiry({ className }: { className?: string }) {
  return (
    <p className={cn("text-[13px]", className)} style={{ color: MUTED }}>
      Works once. Expires in 48 hours.
    </p>
  )
}

function SmallFooter({ invitee, dark }: Props & { dark?: boolean }) {
  return (
    <div
      className="px-8 py-5 text-center text-xs leading-5"
      style={{ color: dark ? "rgba(255,255,255,0.6)" : MUTED }}
    >
      Sent by {BRAND_NAME} on behalf of {senderOf(invitee)}
      <br />
      {invitee.sender.address}
    </div>
  )
}

/** Every letter sits in the same 600px frame. */
function Letter({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={cn(
        "w-full max-w-[600px] overflow-hidden rounded-2xl border border-[#e6e6e6] text-sm leading-[1.6]",
        className
      )}
      style={{
        fontFamily: "var(--font-inter), Inter, Arial, sans-serif",
        color: BODY,
        backgroundColor: "#fff",
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* ── 1. Card ─────────────────────────────────────────────────── */
/* The shipped layout: letter, then one card with the code and button. */

function V1({ invitee }: Props) {
  return (
    <Letter style={{ backgroundColor: "#FAFAFA" }}>
      <div className="px-8 pt-6">
        <Logo />
      </div>
      <div className="space-y-5 px-8 py-6">
        <p>
          Dear {invitee.firstName},
          <br />
          {inviter(invitee)} has invited you to {invitedTo(invitee)}.
        </p>
        <div className="flex flex-col items-center rounded-2xl border border-[#e3e8e8] bg-white px-6 py-7 text-center">
          <p className="text-[13px]" style={{ color: MUTED }}>
            Your one-time code
          </p>
          <div className="mt-3">
            <Tiles code={invitee.activationCode} />
          </div>
          <Expiry className="mt-3" />
          <Button invitee={invitee} className="mt-5" />
        </div>
        <ol className="space-y-2.5">
          {steps(invitee).map((s, i) => (
            <li key={s} className="flex gap-3">
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={{ backgroundColor: TINT, color: PETROL }}
              >
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
        <Help invitee={invitee} />
      </div>
      <SmallFooter invitee={invitee} />
    </Letter>
  )
}

/* ── 2. Hero banner ──────────────────────────────────────────── */
/* A petrol band with a big welcome line; the code card overlaps it. */

function V2({ invitee }: Props) {
  return (
    <Letter>
      <div className="px-8 pt-7 pb-20 text-white" style={{ backgroundColor: PETROL }}>
        <Logo dark className="h-7" />
        <p className="mt-8 text-[28px] leading-tight font-semibold">
          Welcome aboard, {invitee.firstName}
        </p>
        <p className="mt-2 text-white/75">
          {inviter(invitee)} has invited you to {invitedTo(invitee)}.
        </p>
      </div>
      <div className="-mt-12 px-8">
        <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-7 text-center shadow-[0_12px_32px_-12px_rgba(23,62,69,0.35)]">
          <p className="font-medium" style={{ color: INK }}>
            Your one-time code
          </p>
          <div className="mt-4">
            <Tiles code={invitee.activationCode} />
          </div>
          <Expiry className="mt-3" />
          <Button invitee={invitee} full className="mt-6" />
        </div>
      </div>
      <div className="space-y-4 px-8 py-7">
        <p style={{ color: MUTED }}>
          {steps(invitee).join(". ")}. That&rsquo;s it.
        </p>
        <Help invitee={invitee} />
      </div>
      <SmallFooter invitee={invitee} />
    </Letter>
  )
}

/* ── 3. Minimal ──────────────────────────────────────────────── */
/* Centred, the mark alone, very few words. */

function V3({ invitee }: Props) {
  return (
    <Letter>
      <div className="flex flex-col items-center px-10 py-12 text-center">
        <Mark className="size-12" />
        <p className="mt-8 text-2xl font-semibold" style={{ color: INK }}>
          Activate your account
        </p>
        <p className="mt-2 max-w-[380px]" style={{ color: MUTED }}>
          {inviter(invitee)} invited you to {invitedTo(invitee)}. Use this code
          to get started.
        </p>
        <div className="mt-8">
          <Tiles code={invitee.activationCode} size="lg" />
        </div>
        <Button invitee={invitee} className="mt-8" arrow={false} />
        <Expiry className="mt-4" />
      </div>
      <div className="border-t border-[#eee]">
        <SmallFooter invitee={invitee} />
      </div>
    </Letter>
  )
}

/* ── 4. Ticket ───────────────────────────────────────────────── */
/* The code as a pass: notched edges and a dashed tear line. */

function V4({ invitee }: Props) {
  return (
    <Letter style={{ backgroundColor: SAND }}>
      <div className="px-8 pt-7">
        <Logo />
      </div>
      <div className="px-8 py-6">
        <p className="text-lg font-semibold" style={{ color: INK }}>
          Your invitation, {invitee.firstName}
        </p>
        <p className="mt-1">
          {inviter(invitee)} has invited you to {invitedTo(invitee)}.
        </p>

        <div className="relative mt-6 rounded-2xl bg-white">
          {/* notches */}
          <span className="absolute top-[118px] -left-3 size-6 rounded-full" style={{ backgroundColor: SAND }} />
          <span className="absolute top-[118px] -right-3 size-6 rounded-full" style={{ backgroundColor: SAND }} />
          <div className="flex items-center justify-between px-7 pt-6 pb-8">
            <div>
              <p className="text-[13px]" style={{ color: MUTED }}>
                Admit one
              </p>
              <p className="font-semibold" style={{ color: INK }}>
                {invitee.role}
              </p>
              <p className="text-[13px]" style={{ color: MUTED }}>
                {invitee.email}
              </p>
            </div>
            <Mark />
          </div>
          <div className="mx-6 border-t-2 border-dashed" style={{ borderColor: LINE }} />
          <div className="flex flex-col items-center gap-4 px-7 pt-6 pb-7">
            <p
              className="text-[34px] font-semibold tracking-[0.35em] tabular-nums"
              style={{ color: PETROL }}
            >
              {invitee.activationCode}
            </p>
            <Button invitee={invitee} full />
            <Expiry />
          </div>
        </div>
        <Help invitee={invitee} className="mt-6" />
      </div>
      <SmallFooter invitee={invitee} />
    </Letter>
  )
}

/* ── 5. Timeline ─────────────────────────────────────────────── */
/* The three steps as a connected path; the code sits inside step two. */

function Dot({ n, done }: { n: number; done?: boolean }) {
  return (
    <span
      className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
      style={
        done
          ? { backgroundColor: PETROL, color: "#fff" }
          : { backgroundColor: "#fff", color: PETROL, border: `2px solid ${LINE}` }
      }
    >
      {n}
    </span>
  )
}

function V5({ invitee }: Props) {
  const [one, two, three] = steps(invitee)
  return (
    <Letter>
      <div className="flex items-center justify-between px-8 pt-7">
        <Logo />
        <span
          className="rounded-full px-3 py-1 text-xs font-medium"
          style={{ backgroundColor: TINT, color: PETROL }}
        >
          {invitee.role}
        </span>
      </div>
      <div className="px-8 py-6">
        <p className="text-xl font-semibold" style={{ color: INK }}>
          Three steps to get started
        </p>
        <p className="mt-1">
          Hi {invitee.firstName}, {inviter(invitee)} has invited you to{" "}
          {invitedTo(invitee)}.
        </p>
        <div className="relative mt-7">
          <span
            className="absolute top-4 bottom-4 left-[15px] w-0.5"
            style={{ backgroundColor: LINE }}
          />
          <div className="flex gap-4">
            <Dot n={1} done />
            <div className="pb-7">
              <p className="font-medium" style={{ color: INK }}>
                {one}
              </p>
              <Button invitee={invitee} className="mt-3" />
            </div>
          </div>
          <div className="flex gap-4">
            <Dot n={2} />
            <div className="pb-7">
              <p className="font-medium" style={{ color: INK }}>
                {two}
              </p>
              <div className="mt-3 flex">
                <Tiles code={invitee.activationCode} size="sm" />
              </div>
              <Expiry className="mt-2" />
            </div>
          </div>
          <div className="flex gap-4">
            <Dot n={3} />
            <p className="pt-1 font-medium" style={{ color: INK }}>
              {three}
            </p>
          </div>
        </div>
        <Help invitee={invitee} className="mt-7" />
      </div>
      <SmallFooter invitee={invitee} />
    </Letter>
  )
}

/* ── 6. Dark ─────────────────────────────────────────────────── */
/* The whole letter on petrol, the button in white. */

function V6({ invitee }: Props) {
  return (
    <Letter className="border-transparent" style={{ backgroundColor: PETROL, color: "rgba(255,255,255,0.85)" }}>
      <div className="px-8 pt-8">
        <Logo dark className="h-7" />
      </div>
      <div className="flex flex-col items-center px-8 pt-10 pb-8 text-center">
        <p className="text-[26px] leading-tight font-semibold text-white">
          {invitee.firstName}, your account is ready
        </p>
        <p className="mt-2 max-w-[420px] text-white/70">
          {inviter(invitee)} has invited you to {invitedTo(invitee)}.
        </p>
        <div className="mt-8 w-full rounded-2xl px-6 py-7" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
          <p className="text-[13px] text-white/60">Your one-time code</p>
          <div className="mt-3">
            <Tiles code={invitee.activationCode} dark />
          </div>
          <Button invitee={invitee} tone="white" className="mt-6" />
          <p className="mt-4 text-[13px] text-white/50">
            Works once. Expires in 48 hours.
          </p>
        </div>
        <Help invitee={invitee} className="mt-7 text-white/70 [&_span]:!text-white" />
      </div>
      <div className="border-t border-white/10">
        <SmallFooter invitee={invitee} dark />
      </div>
    </Letter>
  )
}

/* ── 7. Soft gradient ────────────────────────────────────────── */
/* A light wash at the top, a role pill, a friendlier headline. */

function V7({ invitee }: Props) {
  return (
    <Letter>
      <div
        className="px-8 pt-7 pb-10"
        style={{ background: `linear-gradient(180deg, ${TINT} 0%, #ffffff 100%)` }}
      >
        <Logo />
        <span
          className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium shadow-sm"
          style={{ color: PETROL }}
        >
          <span className="size-1.5 rounded-full" style={{ backgroundColor: TEAL }} />
          You&rsquo;re invited
        </span>
        <p className="mt-3 text-[26px] leading-tight font-semibold" style={{ color: INK }}>
          Join {isPatient(invitee) ? invitee.practice : `${BRAND_NAME} as ${invitee.role}`}
        </p>
        <p className="mt-2">
          Hi {invitee.firstName}, {inviter(invitee)} has set up your account.
          Activate it in under two minutes.
        </p>
      </div>
      <div className="px-8">
        <div className="flex items-center justify-between gap-4 rounded-2xl border px-6 py-5" style={{ borderColor: LINE }}>
          <div>
            <p className="text-[13px]" style={{ color: MUTED }}>
              One-time code
            </p>
            <p className="text-[28px] font-semibold tracking-[0.25em] tabular-nums" style={{ color: PETROL }}>
              {invitee.activationCode}
            </p>
          </div>
          <Button invitee={invitee} className="px-6" />
        </div>
        <Expiry className="mt-2 px-1" />
      </div>
      <div className="grid grid-cols-3 gap-3 px-8 py-7">
        {steps(invitee).map((s, i) => (
          <div key={s} className="rounded-xl p-4" style={{ backgroundColor: TILE }}>
            <p className="text-xs font-semibold" style={{ color: TEAL }}>
              Step {i + 1}
            </p>
            <p className="mt-1 text-[13px] leading-5" style={{ color: INK }}>
              {s}
            </p>
          </div>
        ))}
      </div>
      <Help invitee={invitee} className="px-8 pb-2" />
      <SmallFooter invitee={invitee} />
    </Letter>
  )
}

/* ── 8. Two column ───────────────────────────────────────────── */
/* The letter on the left, the code panel on the right. */

function V8({ invitee }: Props) {
  return (
    <Letter>
      <div className="flex items-center justify-between border-b border-[#eee] px-8 py-5">
        <Logo className="h-7" />
        <span className="text-xs" style={{ color: MUTED }}>
          Account activation
        </span>
      </div>
      <div className="grid grid-cols-[1fr_210px] gap-6 px-8 py-7">
        <div className="space-y-4">
          <p className="text-lg font-semibold" style={{ color: INK }}>
            Hi {invitee.firstName},
          </p>
          <p>
            {inviter(invitee)} has invited you to {invitedTo(invitee)}. Your
            account is ready and waiting.
          </p>
          <ul className="space-y-2">
            {steps(invitee).map((s) => (
              <li key={s} className="flex gap-2">
                <svg viewBox="0 0 16 16" className="mt-1 size-4 shrink-0" fill="none" aria-hidden>
                  <circle cx="8" cy="8" r="7" fill={TINT} />
                  <path d="M5 8.2l2 2 4-4.4" stroke={PETROL} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {s}
              </li>
            ))}
          </ul>
          <Help invitee={invitee} />
        </div>
        <div className="flex flex-col items-center rounded-2xl px-4 py-6 text-center" style={{ backgroundColor: TILE }}>
          <Mark className="size-9" />
          <p className="mt-4 text-[13px]" style={{ color: MUTED }}>
            Your code
          </p>
          <p className="text-[26px] font-semibold tracking-[0.2em] tabular-nums" style={{ color: PETROL }}>
            {invitee.activationCode}
          </p>
          <Button invitee={invitee} full arrow={false} className="mt-4 h-11 px-4 text-sm" />
          <Expiry className="mt-3 text-xs" />
        </div>
      </div>
      <SmallFooter invitee={invitee} />
    </Letter>
  )
}

/* ── 9. Security first ───────────────────────────────────────── */
/* Leads with trust: a shield, why the code, and what to do if unexpected. */

function V9({ invitee }: Props) {
  return (
    <Letter style={{ backgroundColor: "#FAFAFA" }}>
      <div className="px-8 pt-7">
        <Logo />
      </div>
      <div className="px-8 py-6">
        <div className="flex gap-4 rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: TINT }}>
            <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
              <path d="M12 3l7 3v5.5c0 4.3-3 8-7 9.5-4-1.5-7-5.2-7-9.5V6l7-3z" stroke={PETROL} strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M9 12l2 2 4-4" stroke={PETROL} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="font-semibold" style={{ color: INK }}>
              Secure account activation
            </p>
            <p className="mt-1">
              Hi {invitee.firstName}, {inviter(invitee)} has invited you to{" "}
              {invitedTo(invitee)}. We never send passwords by email, so you
              activate with a one-time code instead.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border bg-white px-6 py-6 text-center" style={{ borderColor: LINE }}>
          <Tiles code={invitee.activationCode} />
          <Expiry className="mt-3" />
          <Button invitee={invitee} className="mt-5" />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-[13px] leading-5">
          <div className="rounded-xl bg-white p-4">
            <p className="font-medium" style={{ color: INK }}>
              Then
            </p>
            <p className="mt-1" style={{ color: MUTED }}>
              {steps(invitee)[2]}.
            </p>
          </div>
          <div className="rounded-xl bg-white p-4">
            <p className="font-medium" style={{ color: INK }}>
              Not expecting this?
            </p>
            <p className="mt-1" style={{ color: MUTED }}>
              Ignore this email. Nothing happens without the code.
            </p>
          </div>
        </div>
        <Help invitee={invitee} className="mt-5" />
      </div>
      <SmallFooter invitee={invitee} />
    </Letter>
  )
}

/* ── 10. Personal note ───────────────────────────────────────── */
/* Reads like a message from the inviter, with the code as a compact row. */

function V10({ invitee }: Props) {
  const who = inviter(invitee)
  const initials = who
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
  return (
    <Letter>
      <div className="px-8 pt-7">
        <Logo className="h-7" />
      </div>
      <div className="px-8 py-7">
        <div className="flex items-center gap-3">
          <span
            className="flex size-11 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: TEAL }}
          >
            {initials}
          </span>
          <div className="leading-5">
            <p className="font-medium" style={{ color: INK }}>
              {who}
            </p>
            <p className="text-[13px]" style={{ color: MUTED }}>
              invited you to {BRAND_NAME}
            </p>
          </div>
        </div>
        <blockquote
          className="mt-5 rounded-r-xl border-l-4 py-4 pr-5 pl-5 text-[15px] leading-7"
          style={{ borderColor: TEAL, backgroundColor: TILE, color: INK }}
        >
          Hi {invitee.firstName}, I&rsquo;ve set up your account on{" "}
          {invitedTo(invitee)}. Activate it with the code below and you&rsquo;ll
          be ready to go.
        </blockquote>

        <div className="mt-6 flex items-center gap-4 rounded-2xl border px-5 py-4" style={{ borderColor: LINE }}>
          <div className="flex-1">
            <p className="text-[13px]" style={{ color: MUTED }}>
              One-time code
            </p>
            <p className="text-2xl font-semibold tracking-[0.25em] tabular-nums" style={{ color: PETROL }}>
              {invitee.activationCode}
            </p>
          </div>
          <Button invitee={invitee} className="h-11 px-5" />
        </div>
        <Expiry className="mt-2" />

        <p className="mt-6" style={{ color: MUTED }}>
          Next, {steps(invitee)[2].toLowerCase()}.
        </p>
        <Help invitee={invitee} className="mt-2" />
      </div>
      <SmallFooter invitee={invitee} />
    </Letter>
  )
}

/* ── 11. Grey ticket ─────────────────────────────────────────── */
/* The ticket from 4, on the current letter's light grey, with the step
   cards from 7 below it. The notches take the letter's grey. */

const PAPER = "#FAFAFA"
const EDGE = "#E8ECEC"

function V11({ invitee }: Props) {
  return (
    <Letter style={{ backgroundColor: PAPER }}>
      <div className="px-8 pt-7">
        <Logo />
      </div>
      <div className="px-8 py-6">
        <p className="text-lg font-semibold" style={{ color: INK }}>
          Your invitation, {invitee.firstName}
        </p>
        <p className="mt-1">
          {inviter(invitee)} has invited you to {invitedTo(invitee)}.
        </p>

        <div className="relative mt-6 rounded-2xl border bg-white" style={{ borderColor: EDGE }}>
          {/* half-circle notches over the edge, each arc ending on the border */}
          <span className="absolute top-[118px] -left-px h-6 w-3 rounded-r-full border border-l-0" style={{ backgroundColor: PAPER, borderColor: EDGE }} />
          <span className="absolute top-[118px] -right-px h-6 w-3 rounded-l-full border border-r-0" style={{ backgroundColor: PAPER, borderColor: EDGE }} />
          <div className="flex items-center justify-between px-7 pt-6 pb-8">
            <div>
              <p className="text-[13px]" style={{ color: MUTED }}>
                Admit one
              </p>
              <p className="font-semibold" style={{ color: INK }}>
                {invitee.role}
              </p>
              <p className="text-[13px]" style={{ color: MUTED }}>
                {invitee.email}
              </p>
            </div>
            <Mark />
          </div>
          <div className="mx-6 border-t-2 border-dashed" style={{ borderColor: LINE }} />
          <div className="flex flex-col items-center gap-4 px-7 pt-6 pb-7">
            <p
              className="text-[34px] font-semibold tracking-[0.35em] tabular-nums"
              style={{ color: PETROL }}
            >
              {invitee.activationCode}
            </p>
            <Button invitee={invitee} full />
            <Expiry />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {steps(invitee).map((step, i) => (
            <div key={step} className="rounded-xl border p-4" style={{ backgroundColor: TILE, borderColor: "#E3ECEA" }}>
              <p className="text-xs font-semibold" style={{ color: TEAL }}>
                Step {i + 1}
              </p>
              <p className="mt-1 text-[13px] leading-5" style={{ color: INK }}>
                {step}
              </p>
            </div>
          ))}
        </div>

        <Help invitee={invitee} className="mt-6" />
      </div>
      <SmallFooter invitee={invitee} />
    </Letter>
  )
}

/* ── Page ────────────────────────────────────────────────────── */

const VARIANTS = [
  { name: "Card", note: "The current layout", C: V1 },
  { name: "Hero banner", note: "Petrol welcome band, card overlaps it", C: V2 },
  { name: "Minimal", note: "Centred, mark only, fewest words", C: V3 },
  { name: "Ticket", note: "The code as a pass with a tear line", C: V4 },
  { name: "Timeline", note: "Steps as a path, code inside step two", C: V5 },
  { name: "Dark", note: "Whole letter on petrol", C: V6 },
  { name: "Soft gradient", note: "Tinted header, inline code row, step cards", C: V7 },
  { name: "Two column", note: "Letter left, code panel right", C: V8 },
  { name: "Security first", note: "Leads with why there is no password", C: V9 },
  { name: "Personal note", note: "A message from the inviter", C: V10 },
  { name: "Grey ticket", note: "The ticket on the current grey, with step cards", C: V11 },
]

const WHO = [
  { as: undefined, label: "Super Admin" },
  { as: "clinic-manager", label: "Clinic Manager" },
  { as: "provider", label: "Provider" },
  { as: "patient", label: "Patient" },
]

export default async function InviteEmailVariations({
  searchParams,
}: {
  searchParams: Promise<{ as?: string | string[] }>
}) {
  const invitee = inviteeFrom((await searchParams).as)

  return (
    <main className="min-h-dvh bg-[#F1F3F4] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-2xl font-semibold text-[#171717]">
            Invitation email variations
          </h1>
          <nav className="flex flex-wrap gap-1 rounded-xl bg-white p-1 text-sm shadow-sm">
            {WHO.map(({ as, label }) => (
              <Link
                key={label}
                href={as ? `?as=${as}` : "?"}
                className={cn(
                  "rounded-lg px-3 py-1.5",
                  invitee.key === (as ?? "super-admin")
                    ? "bg-[#173E45] text-white"
                    : "text-[#393939] hover:bg-[#F1F3F4]"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 grid gap-x-10 gap-y-14 xl:grid-cols-2">
          {VARIANTS.map(({ name, note, C }, i) => (
            <section key={name} className="flex flex-col items-center gap-4">
              <div className="w-full max-w-[600px]">
                <p className="font-semibold text-[#171717]">
                  {i + 1}. {name}
                </p>
                <p className="text-sm text-[#6B7280]">{note}</p>
              </div>
              <C invitee={invitee} />
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
