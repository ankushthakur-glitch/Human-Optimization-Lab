import type { Metadata } from "next"
import Link from "next/link"

import {
  IconAlert,
  IconArrowRight,
  IconLock,
  IconSearch,
} from "@/design-system/icons"

export const metadata: Metadata = { title: "Error states" }

const STATES = [
  {
    href: "/screens/errors/this-page-does-not-exist",
    icon: IconSearch,
    title: "Page not found",
    when: "Any URL with no route, or a record that no longer exists.",
  },
  {
    href: "/screens/session-expired",
    icon: IconAlert,
    title: "Session expired",
    when: "After 15 minutes with no input in the app. Add ?idle=10 to a signed-in screen to see it in 10 seconds.",
  },
  {
    href: "/screens/errors/permission-denied",
    icon: IconLock,
    title: "Permission denied",
    when: "A screen the signed-in role can't open. Returns a 403.",
  },
  {
    href: "/screens/errors/offline",
    icon: IconAlert,
    title: "No internet connection",
    when: "Covers any screen the moment the browser goes offline, and lifts when it's back.",
  },
]

/** Not a product screen: an index so each state can be opened directly. */
export default function ErrorStatesIndex() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Error states
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Each one appears on its own when its problem happens. Open any of them
        here to review it.
      </p>
      <ul className="mt-8 space-y-3">
        {STATES.map(({ href, icon: Icon, title, when }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex items-start gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:border-primary"
            >
              <Icon className="mt-0.5 size-5 shrink-0 text-primary-tint" />
              <span className="flex-1">
                <span className="block font-heading text-sm font-semibold">
                  {title}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {when}
                </span>
              </span>
              <IconArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
