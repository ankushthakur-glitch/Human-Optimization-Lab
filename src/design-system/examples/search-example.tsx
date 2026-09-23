"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  File01Icon,
  Search01Icon,
  TestTube01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons"

import { Example, ExampleWrapper } from "@/design-system/examples/example"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/design-system/ui/input-group"
import { Kbd } from "@/design-system/ui/kbd"
import { Separator } from "@/design-system/ui/separator"
import { Skeleton } from "@/design-system/ui/skeleton"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/design-system/ui/empty"

type Result = {
  title: string
  meta: string
  group: string
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
}

const RESULTS: Result[] = [
  {
    title: "R. Álvarez",
    meta: "MRN 40921 · 62y",
    group: "Patients",
    icon: UserCircleIcon,
  },
  {
    title: "J. Okafor",
    meta: "MRN 38117 · 45y",
    group: "Patients",
    icon: UserCircleIcon,
  },
  {
    title: "Lab panel — 14 Mar",
    meta: "A1c, eGFR, potassium",
    group: "Results",
    icon: TestTube01Icon,
  },
  {
    title: "Care plan — diabetes",
    meta: "Updated 2 Apr",
    group: "Documents",
    icon: File01Icon,
  },
]

export default function SearchExample() {
  return (
    <ExampleWrapper>
      <SearchLive />
      <SearchRecent />
      <SearchLoading />
      <SearchNoResults />
    </ExampleWrapper>
  )
}

function SearchField({
  value,
  onChange,
  placeholder = "Search patients, results, documents",
}: {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
}) {
  return (
    <InputGroup>
      <InputGroupAddon>
        <HugeiconsIcon icon={Search01Icon} />
      </InputGroupAddon>
      <InputGroupInput
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      />
      <InputGroupAddon align="inline-end">
        {value ? (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Clear search"
            onClick={() => onChange?.("")}
          >
            <HugeiconsIcon icon={Cancel01Icon} />
          </Button>
        ) : (
          <Kbd>/</Kbd>
        )}
      </InputGroupAddon>
    </InputGroup>
  )
}

function ResultRow({ result }: { result: Result }) {
  return (
    <button
      type="button"
      className="flex w-full min-w-0 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors outline-none hover:bg-surface-hover focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <HugeiconsIcon icon={result.icon} className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {result.title}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {result.meta}
        </span>
      </span>
    </button>
  )
}

function SearchLive() {
  const [query, setQuery] = React.useState("al")
  const matches = RESULTS.filter(
    (r) =>
      !query ||
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.meta.toLowerCase().includes(query.toLowerCase())
  )
  const groups = [...new Set(matches.map((m) => m.group))]

  return (
    <Example title="Results">
      <div className="flex w-full flex-col gap-3">
        <SearchField value={query} onChange={setQuery} />
        {matches.length ? (
          <div className="flex w-full flex-col gap-2 rounded-2xl border p-1.5">
            {groups.map((group, i) => (
              <div key={group} className="flex flex-col gap-0.5">
                {i > 0 ? <Separator className="my-1" /> : null}
                <div className="px-2.5 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {group}
                </div>
                {matches
                  .filter((m) => m.group === group)
                  .map((m) => (
                    <ResultRow key={m.title} result={m} />
                  ))}
              </div>
            ))}
          </div>
        ) : (
          <Empty className="rounded-2xl border py-8">
            <EmptyHeader>
              <EmptyTitle>No matches for “{query}”</EmptyTitle>
              <EmptyDescription>
                Try an MRN, or search by the document title instead.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </Example>
  )
}

function SearchRecent() {
  return (
    <Example title="Recent and suggested">
      <div className="flex w-full flex-col gap-3">
        <SearchField />
        <div className="flex w-full flex-col gap-2 rounded-2xl border p-1.5">
          <div className="px-2.5 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Recent
          </div>
          {RESULTS.slice(0, 2).map((r) => (
            <ResultRow key={r.title} result={r} />
          ))}
          <Separator className="my-1" />
          <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-1">
            <span className="text-[11px] text-muted-foreground">Filters</span>
            <Badge variant="outline">Patients</Badge>
            <Badge variant="outline">Results</Badge>
            <Badge variant="outline">Documents</Badge>
          </div>
        </div>
      </div>
    </Example>
  )
}

function SearchLoading() {
  return (
    <Example title="Searching">
      <div className="flex w-full flex-col gap-3">
        <SearchField value="potassium" onChange={() => {}} />
        <div className="flex w-full flex-col gap-1 rounded-2xl border p-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1.5">
              <Skeleton className="size-7 rounded-lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-3 w-2/5 rounded-full" />
                <Skeleton className="h-2.5 w-1/4 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Example>
  )
}

function SearchNoResults() {
  return (
    <Example title="Nothing found">
      <div className="flex w-full flex-col gap-3">
        <SearchField value="zzzz" onChange={() => {}} />
        <Empty className="rounded-2xl border py-10">
          <EmptyHeader>
            <EmptyTitle>No matches</EmptyTitle>
            <EmptyDescription>
              Nothing in this workspace matches that. Searching does not reach
              records outside your assigned panels.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    </Example>
  )
}
