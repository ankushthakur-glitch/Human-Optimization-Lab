"use client"

import * as React from "react"
import { IconClose } from "@/design-system/icons"

import { cn } from "@/lib/utils"
import {
  type Column,
  DetailSection,
  Directory,
} from "@/components/practice/directory"
import { PRACTICE } from "@/components/practice/practice-data"
import {
  SettingsBack,
  SettingsHeading,
  StatusDot,
} from "@/components/settings/settings-kit"
import { Button } from "@/design-system/ui/button"

/* The audit log every portal's Settings shares: who did what, to which
   record, when and from where. Each portal sees its own slice: the Super
   Admin every practice, the clinic manager their practice, the provider
   their own activity and anyone opening their patients' charts. */

/* -------------------------------------------------------------------------- */
/*  Events                                                                     */
/* -------------------------------------------------------------------------- */

export const AUDIT_CATEGORIES = [
  "Sign in",
  "Patient records",
  "People",
  "Settings",
  "Exports",
] as const
type AuditCategory = (typeof AUDIT_CATEGORIES)[number]

const PERIODS = ["Today", "Last 7 days", "Last 30 days"] as const
const PERIOD_DAYS: Record<string, number> = {
  Today: 1,
  "Last 7 days": 7,
  "Last 30 days": 30,
}

type Change = { field: string; from: string; to: string }

export type AuditEvent = {
  id: string
  /** ISO time, UTC. */
  at: string
  actor: string
  role: string
  practice: string
  category: AuditCategory
  action: string
  item: string
  /** The patient the event touched, for the provider's slice. */
  patientId?: string
  result: "Success" | "Failed"
  ip: string
  device: string
  changes?: Change[]
}

/* Fictional people and practices only, matching the portal's sample data. */
const HARBORVIEW = PRACTICE.name
const INLAY = "Inlay Health"

type Actor = {
  name: string
  role: string
  practice: string
  ip: string
  device: string
}

const ACTORS = {
  maya: {
    name: "Maya Chen",
    role: "Super Admin",
    practice: INLAY,
    ip: "10.20.4.18",
    device: "Chrome on macOS",
  },
  ravi: {
    name: "Ravi Desai",
    role: "Super Admin",
    practice: INLAY,
    ip: "10.20.4.31",
    device: "Safari on macOS",
  },
  marcus: {
    name: "Marcus Whitfield",
    role: "Clinic manager",
    practice: HARBORVIEW,
    ip: "72.14.190.6",
    device: "Chrome on Windows",
  },
  reyes: {
    name: "Daniel Reyes, MD",
    role: "Provider",
    practice: HARBORVIEW,
    ip: "72.14.190.22",
    device: "Chrome on macOS",
  },
  graham: {
    name: "Graham Pellegrini",
    role: "Nurse",
    practice: HARBORVIEW,
    ip: "72.14.190.41",
    device: "Edge on Windows",
  },
  imani: {
    name: "Imani Caldwell",
    role: "Care coordinator",
    practice: HARBORVIEW,
    ip: "72.14.190.37",
    device: "Chrome on Windows",
  },
  victor: {
    name: "Victor Lindqvist",
    role: "Medical assistant",
    practice: HARBORVIEW,
    ip: "72.14.190.45",
    device: "Safari on iPad",
  },
  janelle: {
    name: "Janelle Ortega",
    role: "Front desk",
    practice: HARBORVIEW,
    ip: "72.14.190.12",
    device: "Chrome on Windows",
  },
  alicia: {
    name: "Alicia Romero",
    role: "Clinic manager",
    practice: "Summit Concierge Medicine",
    ip: "64.233.161.9",
    device: "Chrome on macOS",
  },
  owen: {
    name: "Owen Fairbanks, DO",
    role: "Provider",
    practice: "Lakeshore Precision Health",
    ip: "98.137.11.4",
    device: "Firefox on Windows",
  },
} satisfies Record<string, Actor>

/** The provider whose portal this is, for the provider's slice. */
const PROVIDER_NAME = ACTORS.reyes.name
/** Dr. Reyes's panel, the patients whose chart access he sees. */
const PROVIDER_PATIENTS = new Set([
  "P10318",
  "P10411",
  "P10422",
  "P10433",
  "P10444",
  "P10455",
])

const PATIENTS: Record<string, string> = {
  P10318: "Marcus Hale",
  P10411: "Daniel Okafor",
  P10422: "Priya Natarajan",
  P10433: "Thomas Whitfield",
  P10444: "Grace Lindqvist",
  P10455: "Samuel Ortiz",
  P10466: "Hannah Brooks",
  P10477: "Walter Chen",
}

function patient(id: string) {
  return `${PATIENTS[id]} (${id})`
}

type Seed = [
  minutesAgo: number,
  actor: keyof typeof ACTORS,
  category: AuditCategory,
  action: string,
  item: string,
  extra?: Partial<Pick<AuditEvent, "patientId" | "result" | "changes">>,
]

/* Newest first; minutes before 20 Oct 2026, 5:30 PM Pacific. */
const SEEDS: Seed[] = [
  [
    6,
    "reyes",
    "Patient records",
    "Approved care plan",
    patient("P10318"),
    {
      patientId: "P10318",
      changes: [
        { field: "Care plan status", from: "In review", to: "Approved" },
      ],
    },
  ],
  [
    14,
    "reyes",
    "Patient records",
    "Viewed chart",
    patient("P10318"),
    { patientId: "P10318" },
  ],
  [
    22,
    "graham",
    "Patient records",
    "Viewed chart",
    patient("P10411"),
    { patientId: "P10411" },
  ],
  [
    35,
    "marcus",
    "Settings",
    "Changed reminder schedule",
    "Invitations, reminders",
    {
      changes: [
        { field: "Second reminder", from: "After 7 days", to: "After 5 days" },
      ],
    },
  ],
  [
    48,
    "maya",
    "Settings",
    "Changed feature access",
    "Summit Concierge Medicine",
    { changes: [{ field: "AI care plans", from: "Off", to: "On" }] },
  ],
  [
    61,
    "reyes",
    "Patient records",
    "Confirmed medication change",
    patient("P10422"),
    {
      patientId: "P10422",
      changes: [
        {
          field: "Metformin",
          from: "500 mg twice daily",
          to: "1000 mg once daily",
        },
      ],
    },
  ],
  [
    74,
    "victor",
    "Patient records",
    "Viewed chart",
    patient("P10433"),
    { patientId: "P10433" },
  ],
  [88, "janelle", "Sign in", "Failed sign in", "Account", { result: "Failed" }],
  [90, "janelle", "Sign in", "Signed in", "Account"],
  [
    102,
    "imani",
    "Patient records",
    "Sent invite again",
    patient("P10466"),
    { patientId: "P10466" },
  ],
  [130, "alicia", "People", "Added provider", "Nora Whitley, MD"],
  [155, "reyes", "Sign in", "Signed in", "Account"],
  [
    172,
    "ravi",
    "Settings",
    "Changed AI credit limit",
    "AI credit",
    {
      changes: [
        {
          field: "Free weekly limit",
          from: "40,000 tokens",
          to: "50,000 tokens",
        },
      ],
    },
  ],
  [210, "marcus", "Exports", "Exported patient list", "Patients, 131 rows"],
  [245, "owen", "Patient records", "Viewed chart", "Ava Lindgren (P20117)"],
  [
    300,
    "graham",
    "Patient records",
    "Added task",
    patient("P10444"),
    { patientId: "P10444" },
  ],
  [
    355,
    "marcus",
    "People",
    "Changed role",
    "Victor Lindqvist",
    {
      changes: [{ field: "Role", from: "Front desk", to: "Medical assistant" }],
    },
  ],
  [420, "maya", "People", "Added practice", "Brightwater Internal Medicine"],
  [
    505,
    "reyes",
    "Patient records",
    "Requested care plan changes",
    patient("P10444"),
    {
      patientId: "P10444",
      changes: [
        {
          field: "Care plan status",
          from: "In review",
          to: "Changes requested",
        },
      ],
    },
  ],
  [610, "imani", "Exports", "Exported report", "Engagement report, October"],
  [
    1440 + 35,
    "reyes",
    "Patient records",
    "Viewed chart",
    patient("P10455"),
    { patientId: "P10455" },
  ],
  [
    1440 + 80,
    "graham",
    "Patient records",
    "Viewed chart",
    patient("P10318"),
    { patientId: "P10318" },
  ],
  [
    1440 + 125,
    "marcus",
    "Settings",
    "Uploaded eligibility file",
    "Eligibility, 1,284 rows",
  ],
  [
    1440 + 190,
    "victor",
    "Sign in",
    "Failed sign in",
    "Account",
    { result: "Failed" },
  ],
  [
    1440 + 260,
    "ravi",
    "Settings",
    "Retired plan",
    "Plan 47, Sleep reset",
    { changes: [{ field: "Status", from: "Active", to: "Retired" }] },
  ],
  [
    1440 + 400,
    "reyes",
    "Exports",
    "Printed chart",
    patient("P10411"),
    { patientId: "P10411" },
  ],
  [
    2 * 1440 + 50,
    "marcus",
    "People",
    "Deactivated user",
    "Paula Greer",
    { changes: [{ field: "Status", from: "Active", to: "Inactive" }] },
  ],
  [
    2 * 1440 + 140,
    "maya",
    "Settings",
    "Changed membership price",
    "Membership",
    { changes: [{ field: "Monthly price", from: "$139", to: "$149" }] },
  ],
  [
    2 * 1440 + 300,
    "imani",
    "Patient records",
    "Viewed chart",
    patient("P10422"),
    { patientId: "P10422" },
  ],
  [
    3 * 1440 + 20,
    "alicia",
    "Settings",
    "Changed message template",
    "Invitations, email",
  ],
  [
    3 * 1440 + 200,
    "reyes",
    "Patient records",
    "Approved care plan",
    patient("P10433"),
    {
      patientId: "P10433",
      changes: [
        { field: "Care plan status", from: "In review", to: "Approved" },
      ],
    },
  ],
  [4 * 1440 + 90, "graham", "Sign in", "Signed in", "Account"],
  [5 * 1440 + 15, "marcus", "People", "Added user", "Imani Caldwell"],
  [
    5 * 1440 + 310,
    "maya",
    "People",
    "Changed role permissions",
    "Medical assistant",
    {
      changes: [
        { field: "Patient records", from: "View", to: "View and edit" },
      ],
    },
  ],
  [
    6 * 1440 + 60,
    "reyes",
    "Patient records",
    "Viewed chart",
    patient("P10444"),
    { patientId: "P10444" },
  ],
  [
    9 * 1440 + 120,
    "owen",
    "Sign in",
    "Failed sign in",
    "Account",
    { result: "Failed" },
  ],
  [
    12 * 1440 + 30,
    "marcus",
    "Exports",
    "Exported audit log",
    "Audit log, 412 rows",
  ],
  [16 * 1440 + 200, "ravi", "Settings", "Added approved source", "Mayo Clinic"],
  [
    21 * 1440 + 45,
    "reyes",
    "Patient records",
    "Viewed chart",
    patient("P10477"),
    { patientId: "P10477" },
  ],
  [27 * 1440 + 400, "maya", "Settings", "Changed AI model", "Ask Inlay chat"],
]

const NOW = Date.UTC(2026, 9, 21, 0, 30)

const EVENTS: AuditEvent[] = SEEDS.map(
  ([minutes, key, category, action, item, extra], i) => {
    const a: Actor = ACTORS[key]
    return {
      id: `AL${String(90412 - i)}`,
      at: new Date(NOW - minutes * 60_000).toISOString(),
      actor: a.name,
      role: a.role,
      practice: a.practice,
      category,
      action,
      item,
      result: "Success",
      ip: a.ip,
      device: a.device,
      ...extra,
    }
  }
)

const timeFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Los_Angeles",
})

function atLabel(iso: string) {
  return timeFormat.format(new Date(iso))
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export type AuditScope = "admin" | "practice" | "provider"

function eventsFor(scope: AuditScope) {
  if (scope === "admin") return EVENTS
  const practice = EVENTS.filter((e) => e.practice === HARBORVIEW)
  if (scope === "practice") return practice
  return practice.filter(
    (e) =>
      e.actor === PROVIDER_NAME ||
      (e.patientId !== undefined && PROVIDER_PATIENTS.has(e.patientId))
  )
}

/** The audit log as a settings page, read only, scoped to the portal. */
export function AuditLogPage({ scope }: { scope: AuditScope }) {
  const rows = eventsFor(scope)
  const [openId, setOpenId] = React.useState<string | null>(null)
  const open = rows.find((e) => e.id === openId) ?? null
  const unique = (values: string[]) => [...new Set(values)].sort()

  const columns: Column<AuditEvent>[] = [
    {
      id: "at",
      header: "Date and time",
      className: "w-48 whitespace-nowrap tabular-nums text-foreground/80",
      cell: (e) => atLabel(e.at),
      sortValue: (e) => e.at,
    },
    {
      id: "actor",
      header: "User",
      cell: (e) => (
        <div className="flex flex-col">
          <span className="font-medium">{e.actor}</span>
          <span className="text-xs text-muted-foreground">{e.role}</span>
        </div>
      ),
      sortValue: (e) => e.actor,
    },
    {
      id: "action",
      header: "Action",
      cell: (e) => (
        <Button
          variant="link"
          className="h-auto p-0 font-medium text-foreground"
          onClick={() => setOpenId(e.id)}
        >
          {e.action}
        </Button>
      ),
      sortValue: (e) => e.action,
    },
    {
      id: "item",
      header: "Item",
      className: "hidden md:table-cell text-foreground/80",
      cell: (e) => e.item,
      sortValue: (e) => e.item,
    },
    ...(scope === "admin"
      ? [
          {
            id: "practice",
            header: "Practice",
            className: "hidden xl:table-cell text-foreground/80",
            cell: (e: AuditEvent) => e.practice,
            sortValue: (e: AuditEvent) => e.practice,
          },
        ]
      : []),
    {
      id: "ip",
      header: "IP address",
      className: "hidden lg:table-cell tabular-nums text-foreground/80",
      cell: (e) => e.ip,
    },
    {
      id: "result",
      header: "Result",
      className: "w-28",
      cell: (e) => (
        <StatusDot tone={e.result === "Success" ? "success" : "warning"}>
          {e.result}
        </StatusDot>
      ),
      sortValue: (e) => e.result,
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Directory
        title="Audit log"
        leading={<SettingsBack />}
        heading={<SettingsHeading />}
        noun="events"
        rows={rows}
        columns={columns}
        search={(e) => [e.actor, e.role, e.action, e.item, e.practice, e.ip]}
        statusTabs={{ options: AUDIT_CATEGORIES, value: (e) => e.category }}
        filters={[
          {
            id: "period",
            label: "Period",
            all: "Any time",
            options: PERIODS,
            match: (e, v) =>
              NOW - Date.parse(e.at) < PERIOD_DAYS[v] * 86_400_000,
          },
          {
            id: "user",
            label: "User",
            all: "All users",
            options: unique(rows.map((e) => e.actor)),
            match: (e, v) => e.actor === v,
          },
          ...(scope === "admin"
            ? [
                {
                  id: "practice",
                  label: "Practice",
                  all: "All practices",
                  options: unique(rows.map((e) => e.practice)),
                  match: (e: AuditEvent, v: string) => e.practice === v,
                },
              ]
            : []),
          {
            id: "result",
            label: "Result",
            all: "Any result",
            options: ["Success", "Failed"],
            match: (e, v) => e.result === v,
          },
        ]}
        exportName="Audit log"
        exportRow={(e) => ({
          "Event ID": e.id,
          "Date and time": atLabel(e.at),
          User: e.actor,
          Role: e.role,
          Practice: e.practice,
          Category: e.category,
          Action: e.action,
          Item: e.item,
          Changes: (e.changes ?? [])
            .map((c) => `${c.field}: ${c.from} to ${c.to}`)
            .join("; "),
          Result: e.result,
          "IP address": e.ip,
          Device: e.device,
        })}
        emptyIllustration="no-results"
        activeRowId={open?.id}
        aside={
          open && (
            <EventPanel
              key={open.id}
              event={open}
              onClose={() => setOpenId(null)}
            />
          )
        }
      />
    </div>
  )
}

/** One event's details beside the table: what, who, where, what changed. */
function EventPanel({
  event: e,
  onClose,
}: {
  event: AuditEvent
  onClose: () => void
}) {
  return (
    <aside
      aria-label={`Event ${e.id}`}
      className={cn(
        "flex w-[354px] shrink-0 flex-col overflow-hidden rounded-r-md border-y border-r bg-surface-sunken text-sm",
        "max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:w-full max-lg:max-w-[354px] max-lg:rounded-none max-lg:border-l max-lg:shadow-xl"
      )}
    >
      <header className="flex h-9 shrink-0 items-center justify-between gap-2 border-b bg-surface-head pr-3 pl-4">
        <span className="truncate font-medium text-primary-tint tabular-nums">
          {e.id}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Close event"
          onClick={onClose}
        >
          <IconClose />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-4 pb-3 *:shrink-0">
        <h2 className="text-base leading-snug font-medium text-foreground">
          {e.action}
        </h2>
        <DetailSection
          title="Event"
          rows={[
            { label: "Date and time", value: atLabel(e.at) },
            { label: "Category", value: e.category },
            { label: "Item", value: e.item },
            {
              label: "Result",
              value: (
                <StatusDot
                  tone={e.result === "Success" ? "success" : "warning"}
                >
                  {e.result}
                </StatusDot>
              ),
            },
          ]}
        />
        <DetailSection
          title="User"
          rows={[
            { label: "Name", value: e.actor },
            { label: "Role", value: e.role },
            { label: "Practice", value: e.practice },
            { label: "IP address", value: e.ip },
            { label: "Device", value: e.device },
          ]}
        />
        {e.changes && e.changes.length > 0 && (
          <DetailSection
            title="Changes"
            rows={e.changes.map((c) => ({
              label: c.field,
              value: (
                <span>
                  <span className="text-muted-foreground line-through">
                    {c.from}
                  </span>{" "}
                  to {c.to}
                </span>
              ),
            }))}
          />
        )}
      </div>
    </aside>
  )
}
