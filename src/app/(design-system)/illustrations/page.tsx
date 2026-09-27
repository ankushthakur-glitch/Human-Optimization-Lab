"use client"

import * as React from "react"

import { IconSearch } from "@/design-system/icons"
import {
  Illustration,
  type IllustrationName,
} from "@/components/illustrations/illustration"
import {
  ILLUSTRATIONS,
  ILLUSTRATION_LABELS,
} from "@/components/illustrations/art.generated"
import { toast } from "@/design-system/ui/sonner"
import { Badge } from "@/design-system/ui/badge"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/design-system/ui/input-group"

/* Every spot illustration the portal ships, drawn with the
   product-ui-illustrations skill. They are inlined, so they follow the
   primary colour and dark mode from the header toggles. Click one to copy the
   JSX that renders it. */

const NAMES = Object.keys(ILLUSTRATIONS) as IllustrationName[]

export default function IllustrationsPage() {
  const [query, setQuery] = React.useState("")
  const q = query.trim().toLowerCase()
  const shown = NAMES.filter(
    (n) =>
      !q || n.includes(q) || ILLUSTRATION_LABELS[n].toLowerCase().includes(q)
  )

  return (
    <div>
      <header className="mb-10">
        <Badge variant="secondary" className="mb-3">
          Imagery
        </Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Illustrations
        </h1>
      </header>

      <InputGroup className="mb-8 max-w-sm bg-card">
        <InputGroupAddon>
          <IconSearch />
        </InputGroupAddon>
        <InputGroupInput
          placeholder={`Search ${NAMES.length} illustrations`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search illustrations"
        />
      </InputGroup>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {shown.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(
                `<Illustration name="${name}" />`
              )
              toast.success("Copied", { description: name })
            }}
            className="flex flex-col items-center gap-3 rounded-lg border bg-card p-4 text-center transition-colors hover:bg-surface-hover"
          >
            <Illustration name={name} className="size-32" />
            <span className="text-sm font-medium">
              {ILLUSTRATION_LABELS[name]}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {name}
            </span>
          </button>
        ))}
      </div>
      {shown.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
          <Illustration name="no-results" />
          No illustrations match
        </div>
      )}
    </div>
  )
}
