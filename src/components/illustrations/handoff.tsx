"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import {
  IconCheck,
  IconCopy,
  IconDownload,
  IconSearch,
} from "@/design-system/icons"
import { Illustration, type IllustrationName } from "./illustration"
import { ILLUSTRATIONS, ILLUSTRATION_LABELS } from "./art.generated"
import usageJson from "./usage.generated.json"
import { toast } from "@/design-system/ui/sonner"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/design-system/ui/input-group"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"

/* The developer handoff for the spot illustrations: how to render one, what
   size to use where, where each one already appears, and the files to
   download. usage.generated.json and the files under /illustrations/hol come
   from scripts/gen-illustrations.mjs, which runs before every build. */

type Use = { file: string; line: number; routes: string[] }
const USAGE = usageJson as Record<string, Use[]>
const NAMES = Object.keys(ILLUSTRATIONS) as IllustrationName[]
const FILES = "/illustrations/hol"

/** What each placement is, in the product's words. */
const WHERE: Partial<Record<IllustrationName, string>> = {
  "no-results": "Any list search or filter with no match",
  "practices-empty": "Admin practices list before the first practice",
  "providers-empty": "Providers tab and admin adoption with no providers",
  "users-empty": "Users tab and admin adoption with no users",
  "patients-empty": "Patients tab and a provider with no assigned patients",
  "locations-empty": "Locations tab before the first location",
  "record-not-found":
    "Patient, provider, location or practice that doesn't exist",
  "consent-pending": "Health record before the patient consents",
  "duplicates-clear": "Possible duplicates queue with nothing to review",
  "review-resolved": "Opening a duplicate review that is already closed",
  "record-syncing": "Health record while sources are still reporting",
  "sync-failed": "Health record when a source sync fails",
  "biomarkers-in-range": "Biomarker filters with no rows",
  "no-conditions": "Conditions table with no rows",
  "no-medications": "Medications table with no rows",
  "no-encounters": "Encounters table with no rows",
  "single-reading": "Biomarker detail with only one result",
  "load-failed": "A list whose data could not load",
  "no-emergency-contact": "Patient record with no emergency contact",
  "already-on-file": "Add patient: exact match already on file",
  "possible-duplicate": "Add patient: a possible duplicate",
  "reactivate-record": "Add patient: an inactive match to reactivate",
  "deactivate-person": "Deactivate a user or a patient",
  "deactivate-provider": "Deactivate a provider",
  "deactivate-location": "Deactivate a location",
  "deactivate-practice": "Deactivate a practice",
  "practice-created": "Practice created dialog",
  "no-manager": "Clinic manager card with no manager",
  "csv-upload": "Bulk add drop zone",
  "import-errors": "Bulk add file with no importable rows",
  "signature-empty": "Provider with no signature",
  "no-licenses": "Provider with no licenses, view and edit",
  "command-empty": "Command search with no results",
  "notifications-clear": "Notification bell with nothing new",
  "dashboard-soon": "Admin dashboard, not built yet",
  "settings-empty": "Admin settings, not built yet",
}

/** Drawn for a screen or moment the portal doesn't have yet. */
const INTENDED: Partial<Record<IllustrationName, string>> = {
  "plan-sent": "Care plan sent to the patient",
  "sync-requested": "Health record sync requested",
  "invite-pending": "Patient invite sent, not yet accepted",
  "patient-added": "Patient added",
  "invite-sent": "Invite sent or resent",
  "no-match-safe": "Add patient check found no match",
  "duplicate-precheck": "Add patient check in progress",
  "sent-for-review": "Patient sent to the clinic manager for review",
  "records-merged": "Two records merged",
  "invite-manager": "Clinic manager invite",
  "import-complete": "Bulk add finished",
  "location-added": "Location added",
  "csv-template": "Bulk add template download",
  "profile-empty": "My profile, not built yet",
  "appointments-empty": "Appointments, not built yet",
  "messages-empty": "Messages, not built yet",
  "reports-empty": "Reports, not built yet",
  "two-factor-on": "Sign in: two-factor switched on",
  "check-email-code": "Sign in: reset code sent",
  "forgot-password": "Sign in: forgot password",
  "new-password": "Sign in: new password",
  "activate-account": "Sign in: activate account",
  "set-password": "Sign in: set password",
  authenticator: "Sign in: two-factor code",
}

type Filter = "all" | "placed" | "ready"

export function IllustrationHandoff() {
  const [filter, setFilter] = React.useState<Filter>("all")
  const [query, setQuery] = React.useState("")
  const placed = NAMES.filter((n) => USAGE[n]?.length)
  const q = query.trim().toLowerCase()
  const shown = NAMES.filter((n) => {
    const isPlaced = USAGE[n]?.length > 0
    if (filter === "placed" && !isPlaced) return false
    if (filter === "ready" && isPlaced) return false
    if (!q) return true
    return [n, ILLUSTRATION_LABELS[n], WHERE[n], INTENDED[n]]
      .filter(Boolean)
      .some((s) => s!.toLowerCase().includes(q))
  })

  return (
    <main className="min-h-svh bg-muted/30 px-4 py-10 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <Badge variant="secondary" className="w-fit">
              Design handoff
            </Badge>
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              Illustrations
            </h1>
            <p className="text-sm text-muted-foreground">
              {NAMES.length} spot illustrations. {placed.length} are in the
              product, {NAMES.length - placed.length} are ready for screens to
              come.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/illustrations" />}
            >
              Open the library
            </Button>
            <Button
              nativeButton={false}
              render={
                <a
                  href={`${FILES}/hol-illustrations.zip`}
                  download="hol-illustrations.zip"
                />
              }
            >
              <IconDownload />
              Download all (.zip)
            </Button>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          <Guide title="Render one">
            <Code>{`import { Illustration } from "@/components/illustrations/illustration"

<Illustration name="no-results" />`}</Code>
            <p>
              It is inline SVG, so it follows the accent colour and dark mode
              through the <Mono>--il-*</Mono> tokens at the end of{" "}
              <Mono>src/app/globals.css</Mono>. Don&apos;t load the themed file
              through <Mono>&lt;img&gt;</Mono> in the portal: the tokens
              can&apos;t reach it.
            </p>
          </Guide>
          <Guide title="Pick the size">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt>
                <Mono>size-36</Mono>
              </dt>
              <dd>Page empty states, the default (144px)</dd>
              <dt>
                <Mono>size-28</Mono>
              </dt>
              <dd>Cards, table rows and dialogs (112px)</dd>
              <dt>
                <Mono>size-24</Mono>
              </dt>
              <dd>Beside text or in a drop zone (96px), the smallest</dd>
            </dl>
            <p>
              Below 96px the hairlines break up. Pass the size as a class:{" "}
              <Mono>className=&quot;size-28&quot;</Mono>.
            </p>
          </Guide>
          <Guide title="Place it">
            <p>
              Empty states: inside <Mono>&lt;EmptyMedia&gt;</Mono> with no
              variant, above <Mono>&lt;EmptyTitle&gt;</Mono>.
            </p>
            <p>
              Confirm dialogs:{" "}
              <Mono>&lt;AlertDialogContent size=&quot;sm&quot;&gt;</Mono> with
              the art in{" "}
              <Mono>
                &lt;AlertDialogMedia className=&quot;size-28 rounded-none
                bg-transparent&quot;&gt;
              </Mono>
              .
            </p>
            <p>
              Files: <b>Themed</b> keeps the tokens for other web code.{" "}
              <b>Light</b> and <b>Dark</b> are flat colours for Figma, the
              patient app and email.
            </p>
          </Guide>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <TabsList>
                <TabsTrigger value="all">All ({NAMES.length})</TabsTrigger>
                <TabsTrigger value="placed">
                  In the product ({placed.length})
                </TabsTrigger>
                <TabsTrigger value="ready">
                  Ready to place ({NAMES.length - placed.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <InputGroup className="w-full bg-card sm:w-72">
              <InputGroupAddon>
                <IconSearch />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search illustrations"
                aria-label="Search illustrations"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </InputGroup>
          </div>

          <div className="flex flex-col gap-3">
            {shown.map((name) => (
              <Row key={name} name={name} />
            ))}
            {shown.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
                <Illustration name="no-results" />
                No illustrations match
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function Row({ name }: { name: IllustrationName }) {
  const uses = USAGE[name] ?? []
  const routes = [...new Set(uses.flatMap((u) => u.routes))]
  const [copied, setCopied] = React.useState(false)

  return (
    <article className="grid gap-5 rounded-lg border bg-card p-4 md:grid-cols-[112px_1fr_auto] md:items-center">
      <Illustration name={name} className="size-28" />

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-medium">{ILLUSTRATION_LABELS[name]}</h2>
          <Button
            variant="ghost"
            size="xs"
            className="font-mono text-xs text-muted-foreground"
            onClick={() => {
              void navigator.clipboard
                ?.writeText(`<Illustration name="${name}" />`)
                .then(() => {
                  setCopied(true)
                  toast.success("Copied", { description: name })
                  window.setTimeout(() => setCopied(false), 1500)
                })
            }}
            aria-label={`Copy the JSX for ${name}`}
          >
            {name}
            {copied ? <IconCheck /> : <IconCopy />}
          </Button>
          {uses.length === 0 && <Badge variant="outline">Ready to place</Badge>}
        </div>

        <p className="text-sm text-muted-foreground">
          {WHERE[name] ?? INTENDED[name] ?? ""}
        </p>

        {uses.length > 0 && (
          <div className="flex flex-col gap-1.5 text-xs">
            {routes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {routes.map((r) => (
                  <Link
                    key={r}
                    href={r}
                    target="_blank"
                    className="rounded-md border bg-muted/40 px-2 py-0.5 font-mono hover:border-primary-tint hover:text-primary-tint"
                  >
                    {r}
                  </Link>
                ))}
              </div>
            )}
            <ul className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-muted-foreground">
              {uses.map((u) => (
                <li key={`${u.file}:${u.line}`}>
                  {u.file}:{u.line}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 md:flex-col">
        {(
          [
            ["svg", "Themed SVG"],
            ["light", "Light SVG"],
            ["dark", "Dark SVG"],
          ] as const
        ).map(([kind, label]) => (
          <Button
            key={kind}
            variant="outline"
            size="sm"
            className="justify-start"
            nativeButton={false}
            render={
              <a
                href={`${FILES}/${kind}/${name}.svg`}
                download={`${name}${kind === "svg" ? "" : `-${kind}`}.svg`}
              />
            }
          >
            <IconDownload />
            {label}
          </Button>
        ))}
      </div>
    </article>
  )
}

function Guide({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-5 text-sm leading-relaxed text-muted-foreground [&_b]:font-medium [&_b]:text-foreground [&_dd]:text-foreground">
      <h2 className="font-heading text-base font-semibold text-foreground">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-muted/60 p-3 font-mono text-xs leading-relaxed text-foreground">
      {children}
    </pre>
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code
      className={cn(
        "rounded bg-muted/60 px-1 py-0.5 font-mono text-xs text-foreground"
      )}
    >
      {children}
    </code>
  )
}
