import { router, type Href } from "expo-router"
import * as React from "react"

import { FlowScreen } from "@/components/flow"
import { Group, NeedsRow } from "@/components/record-kit"

const STATES: { href: Href; title: string; when: string }[] = [
  {
    // No such route, on purpose: typed routes would refuse it uncast.
    href: "/errors/this-page-does-not-exist" as Href,
    title: "Page not found",
    when: "Any link or address with no screen behind it.",
  },
  {
    href: "/errors/session-expired",
    title: "Session expired",
    when: "After 15 minutes with no taps while signed in.",
  },
  {
    href: "/errors/offline",
    title: "No internet connection",
    when: "Covers any screen the moment the device goes offline, and lifts when it’s back.",
  },
  {
    href: "/errors/crash",
    title: "Something went wrong",
    when: "A screen that fails to load.",
  },
]

/** Not a product screen: an index so each state can be opened directly,
    like the portal's /screens/errors. Drawn as the Figma "Hol" detail
    pages are: the white header bar with its caret, then one card of rows
    on the page gradient. */
export default function ErrorStatesIndex() {
  return (
    <FlowScreen page title="Error states">
      <Group>
        {STATES.map(({ href, title, when }) => (
          <NeedsRow key={title} title={title} meta={when} onPress={() => router.push(href)} />
        ))}
      </Group>
    </FlowScreen>
  )
}
