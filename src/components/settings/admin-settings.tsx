"use client"

import * as React from "react"
import { toast } from "@/design-system/ui/sonner"
import {
  IconAdd,
  IconClipboard,
  IconCreditCard,
  IconEdit,
  IconFileText,
  IconHandshake,
  IconHistory,
  IconLock,
  IconLockOpen,
  IconShield,
  IconSparkles,
  IconTarget,
  IconTrash,
} from "@/design-system/icons"

import { AdminShell } from "@/components/admin/admin-shell"
import {
  MultiSelectDropdownField,
  SelectField,
  TextField,
} from "@/components/form-kit"
import {
  type Column,
  Directory,
  RowMenu,
} from "@/components/practice/directory"
import { AuditLogPage } from "@/components/settings/audit-log"
import { ConsentDocsPage } from "@/components/settings/consent-docs"
import { PartnersPage } from "@/components/settings/partners"
import { RolesPage } from "@/components/settings/roles"
import {
  INTERVAL_UNITS,
  LONGEVITY_ITEMS,
  MODELS,
  PHASES,
  type Phase,
  type Plan,
  RERATE_INTERVALS,
  RETEST_INTERVALS,
  SOURCES,
  TEMPLATE_SECTIONS,
  TESTS,
  TEST_GUARDS,
  TOP_UPS,
  plans,
} from "@/components/settings/settings-data"
import {
  ChoiceSelect,
  NumberInput,
  SettingsBack,
  SettingsFrame,
  type SettingStatus,
  type SettingsGroup,
  SettingsHome,
  SettingsRoute,
  SettingsSection,
  SettingsTable,
  SettingsHeading,
  StatusDot,
  ValueCard,
  ValueRow,
  shown,
  useSettings,
} from "@/components/settings/settings-kit"
import { Button } from "@/design-system/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/ui/dialog"
import { DropdownMenuItem } from "@/design-system/ui/dropdown-menu"
import { Input } from "@/design-system/ui/input"
import { Switch } from "@/design-system/ui/switch"
import { TableCell, TableRow } from "@/design-system/ui/table"

/* The Super Admin's Settings: what the Inlay team maintains for every
   practice, per the "Admin Settings" tab of the settings scope sheet, plus
   the back end items it marks "Yes, Inlay admin only" (AI models, approved
   sources). */

const BASE = "/screens/admin/settings"

const GROUPS: SettingsGroup[] = [
  {
    id: "roles",
    title: "Roles",
    icon: IconShield,
    pages: [
      {
        id: "permissions",
        label: "Roles and permissions",
        render: () => <RolesPage />,
      },
    ],
  },
  {
    id: "plans",
    title: "Optimization plans",
    icon: IconTarget,
    pages: [
      {
        id: "catalogue",
        label: "Plan catalogue",
        render: () => <PlanCatalogue />,
      },
      {
        id: "intervals",
        label: "Test intervals",
        render: () => <TestIntervals />,
      },
      { id: "limits", label: "Limits", render: () => <CarePlanLimits /> },
    ],
  },
  {
    id: "care-plan",
    title: "Care plan",
    icon: IconClipboard,
    pages: [
      {
        id: "template",
        label: "Template",
        status: "Open",
        render: () => <CarePlanTemplate />,
      },
    ],
  },
  {
    id: "pricing",
    title: "Subscription and pricing",
    icon: IconCreditCard,
    pages: [
      { id: "membership", label: "Membership", render: () => <Membership /> },
      {
        id: "longevity",
        label: "Longevity tests",
        render: () => <PriceList kind="longevity" />,
      },
      {
        id: "top-ups",
        label: "AI credit top ups",
        status: "Partly",
        render: () => <PriceList kind="top-ups" />,
      },
    ],
  },
  {
    id: "ai",
    title: "AI",
    icon: IconSparkles,
    pages: [
      { id: "credit", label: "AI credit", render: () => <AiCredit /> },
      {
        id: "models",
        label: "Models",
        status: "Open",
        render: () => <AiModels />,
      },
      {
        id: "sources",
        label: "Approved sources",
        status: "Open",
        render: () => <Sources />,
      },
    ],
  },
  {
    id: "partners",
    title: "Partners",
    icon: IconHandshake,
    pages: [{ id: "list", label: "Partners", render: () => <PartnersPage /> }],
  },
  {
    id: "consent",
    title: "Consent",
    icon: IconFileText,
    pages: [
      {
        id: "documents",
        label: "Consent documents",
        render: () => <ConsentDocsPage />,
      },
    ],
  },
  {
    id: "security",
    title: "Security",
    icon: IconHistory,
    pages: [
      {
        id: "audit-log",
        label: "Audit log",
        render: () => <AuditLogPage scope="admin" />,
      },
    ],
  },
]

export function AdminSettingsHome() {
  return (
    <AdminShell active="settings">
      <SettingsHome base={BASE} groups={GROUPS} />
    </AdminShell>
  )
}

export function AdminSettingsPage({
  group,
  page,
}: {
  group: string
  page: string
}) {
  return (
    <AdminShell active="settings">
      <SettingsRoute
        base={BASE}
        groups={GROUPS}
        groupId={group}
        pageId={page}
      />
    </AdminShell>
  )
}

/* -------------------------------------------------------------------------- */
/*  Optimization plans                                                         */
/* -------------------------------------------------------------------------- */

const PHASE_TONE: Record<Phase, "success" | "warning" | "muted"> = {
  V1: "success",
  V2: "warning",
  Later: "muted",
}

/** The master list of 81 plans and the tests suggested with each. */
function PlanCatalogue() {
  const { items } = plans.use()
  const [editing, setEditing] = React.useState<Plan | "new" | null>(null)

  /* Phase and retesting are still open in the scope sheet. */
  const allColumns: (Column<Plan> & { status?: SettingStatus })[] = [
    {
      id: "id",
      header: "ID",
      className: "hidden w-20 text-primary-tint tabular-nums md:table-cell",
      cell: (p) => p.id,
      sortValue: (p) => p.id,
    },
    {
      id: "name",
      header: "Plan",
      cell: (p) => (
        <Button
          variant="link"
          className="h-auto p-0 font-medium text-foreground"
          onClick={() => setEditing(p)}
        >
          {p.name}
        </Button>
      ),
      sortValue: (p) => p.name,
    },
    {
      id: "phase",
      status: "Open",
      header: "Phase",
      cell: (p) => <StatusDot tone={PHASE_TONE[p.phase]}>{p.phase}</StatusDot>,
      sortValue: (p) => PHASES.indexOf(p.phase),
    },
    {
      id: "tests",
      header: "Suggested tests",
      className: "hidden lg:table-cell max-w-96 truncate text-foreground/80",
      cell: (p) => p.tests.join(", "),
    },
    {
      id: "retest",
      status: "Open",
      header: "Retest",
      className: "hidden md:table-cell text-foreground/80",
      cell: (p) => p.retest,
    },
    {
      id: "status",
      header: "Status",
      cell: (p) => (
        <StatusDot tone={p.status === "Active" ? "success" : "muted"}>
          {p.status}
        </StatusDot>
      ),
    },
    {
      id: "actions",
      header: "",
      className: "w-12 text-right",
      cell: (p) => (
        <RowMenu label={`Actions for ${p.name}`}>
          <DropdownMenuItem onClick={() => setEditing(p)}>
            <IconEdit />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const status = p.status === "Active" ? "Retired" : "Active"
              plans.patch(p.id, { status })
              toast.success(
                status === "Retired"
                  ? `${p.name} retired`
                  : `${p.name} restored`
              )
            }}
          >
            {p.status === "Active" ? <IconLock /> : <IconLockOpen />}
            {p.status === "Active" ? "Retire" : "Restore"}
          </DropdownMenuItem>
        </RowMenu>
      ),
    },
  ]

  const columns = allColumns.filter((c) => shown(c.status ?? "Discussed"))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Directory
        title="Plan catalogue"
        leading={<SettingsBack />}
        heading={<SettingsHeading />}
        noun="plans"
        rows={items}
        columns={columns}
        search={(p) => [p.id, p.name, ...p.tests]}
        statusTabs={
          shown("Open") ? { options: PHASES, value: (p) => p.phase } : undefined
        }
        filters={[
          {
            id: "test",
            label: "Suggested test",
            all: "All tests",
            options: TESTS,
            match: (p, v) => p.tests.includes(v),
          },
          {
            id: "status",
            label: "Status",
            all: "Any status",
            options: ["Active", "Retired"],
            match: (p, v) => p.status === v,
          },
        ]}
        primaryAction={{
          label: "Add plan",
          icon: <IconAdd />,
          onClick: () => setEditing("new"),
        }}
        exportName="Optimization plans"
        exportRow={(p) => ({
          ID: p.id,
          Plan: p.name,
          "Suggested tests": p.tests.join(", "),
          ...(shown("Open") ? { Phase: p.phase, Retest: p.retest } : {}),
          Status: p.status,
        })}
        emptyIllustration="no-results"
      />
      <Dialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <DialogContent className="sm:max-w-lg">
          {editing && (
            <PlanForm
              plan={editing === "new" ? null : editing}
              count={items.length}
              onClose={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PlanForm({
  plan,
  count,
  onClose,
}: {
  plan: Plan | null
  count: number
  onClose: () => void
}) {
  const [draft, setDraft] = React.useState({
    name: plan?.name ?? "",
    phase: plan?.phase ?? "V1",
    tests: plan?.tests ?? [],
    retest: plan?.retest ?? RETEST_INTERVALS[0],
  })
  const [error, setError] = React.useState("")

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!draft.name.trim()) {
      setError("Enter the plan's name")
      return
    }
    const values = {
      ...draft,
      name: draft.name.trim(),
      phase: draft.phase as Phase,
    }
    if (plan) {
      plans.patch(plan.id, values)
      toast.success("Plan updated")
    } else {
      plans.add([
        {
          ...values,
          id: `PL${String(count + 1).padStart(3, "0")}`,
          status: "Active",
        },
      ])
      toast.success("Plan added")
    }
    onClose()
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{plan ? "Edit plan" : "Add plan"}</DialogTitle>
        <DialogDescription className="sr-only">
          The plan&apos;s name, suggested tests, phase and retesting.
        </DialogDescription>
      </DialogHeader>
      <TextField
        id="plan-name"
        label="Plan name"
        required
        value={draft.name}
        error={error}
        onChange={(e) => {
          setDraft({ ...draft, name: e.target.value })
          setError("")
        }}
      />
      <MultiSelectDropdownField
        id="plan-tests"
        label="Suggested tests"
        options={TESTS}
        value={draft.tests}
        placeholder="Select tests"
        onChange={(tests) => setDraft({ ...draft, tests })}
      />
      {shown("Open") && (
        <SelectField
          id="plan-phase"
          label="Phase"
          options={PHASES}
          value={draft.phase}
          onChange={(phase) => setDraft({ ...draft, phase: phase as Phase })}
        />
      )}
      {shown("Open") && (
        <SelectField
          id="plan-retest"
          label="Retest"
          options={RETEST_INTERVALS}
          value={draft.retest}
          onChange={(retest) => setDraft({ ...draft, retest })}
        />
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{plan ? "Save changes" : "Add plan"}</Button>
      </DialogFooter>
    </form>
  )
}

/** Tests that must never be recommended more often than a set period. */
function TestIntervals() {
  const settings = useSettings("test-intervals", { rows: TEST_GUARDS })
  const rows = settings.draft.rows

  function update(i: number, changes: Partial<(typeof rows)[number]>) {
    settings.patch({
      rows: rows.map((row, j) => (j === i ? { ...row, ...changes } : row)),
    })
  }

  return (
    <SettingsFrame action={settings.actions}>
      <SettingsSection
        title="Minimum interval per test"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              settings.patch({
                rows: [...rows, { test: "", every: 1, unit: "Years" }],
              })
            }
          >
            <IconAdd />
            Add test
          </Button>
        }
      >
        <SettingsTable
          columns={[
            { header: "Test" },
            { header: "No sooner than", className: "w-72" },
            { header: "", className: "w-14" },
          ]}
        >
          {rows.map((row, i) => (
            <TableRow key={i}>
              <TableCell>
                {row.test ? (
                  <span className="font-medium">{row.test}</span>
                ) : (
                  <ChoiceSelect
                    label="Test"
                    value={row.test}
                    options={TESTS}
                    onChange={(test) => update(i, { test })}
                    className="w-64"
                  />
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <NumberInput
                    label={`Interval for ${row.test}`}
                    value={row.every}
                    min={1}
                    onChange={(every) => update(i, { every })}
                    className="w-20"
                  />
                  <ChoiceSelect
                    label="Unit"
                    value={row.unit}
                    options={INTERVAL_UNITS}
                    onChange={(unit) => update(i, { unit })}
                    className="w-28"
                  />
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${row.test || "test"}`}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() =>
                    settings.patch({ rows: rows.filter((_, j) => j !== i) })
                  }
                >
                  <IconTrash />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </SettingsTable>
      </SettingsSection>
    </SettingsFrame>
  )
}

/* -------------------------------------------------------------------------- */
/*  Care plan                                                                  */
/* -------------------------------------------------------------------------- */

/** The sections the AI fills for each plan. */
function CarePlanTemplate() {
  const settings = useSettings("care-plan-template", {
    sections: TEMPLATE_SECTIONS,
  })
  const sections = settings.draft.sections
  return (
    <SettingsFrame action={settings.actions}>
      <SettingsSection title="Care plan sections">
        <SettingsTable
          columns={[
            { header: "Section" },
            { header: "Order", className: "w-24" },
            { header: "Included", className: "w-28" },
          ]}
        >
          {sections.map((section, i) => (
            <TableRow key={section.id}>
              <TableCell className="font-medium">{section.name}</TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {i + 1}
              </TableCell>
              <TableCell>
                <Switch
                  size="sm"
                  checked={section.on}
                  aria-label={`Include ${section.name}`}
                  onCheckedChange={(on) =>
                    settings.patch({
                      sections: sections.map((s) =>
                        s.id === section.id ? { ...s, on } : s
                      ),
                    })
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </SettingsTable>
      </SettingsSection>
    </SettingsFrame>
  )
}

function CarePlanLimits() {
  const settings = useSettings("care-plan-limits", {
    plans: 5,
    symptoms: 3,
    rerate: "Every week" as string,
  })
  const d = settings.draft
  return (
    <SettingsFrame action={settings.actions}>
      {shown("Partly") && (
        <SettingsSection title="Plans">
          <ValueCard>
            <ValueRow label="Plans recommended at once">
              <NumberInput
                label="Plans recommended at once"
                value={d.plans}
                min={1}
                unit="plans"
                onChange={(plans) => settings.patch({ plans })}
              />
            </ValueRow>
          </ValueCard>
        </SettingsSection>
      )}
      <SettingsSection title="Symptoms">
        <ValueCard>
          <ValueRow label="Symptoms a patient tracks">
            <NumberInput
              label="Symptoms a patient tracks"
              value={d.symptoms}
              min={1}
              unit="symptoms"
              onChange={(symptoms) => settings.patch({ symptoms })}
            />
          </ValueRow>
          {shown("Partly") && (
            <ValueRow label="Symptom re-rating">
              <ChoiceSelect
                label="Symptom re-rating"
                value={d.rerate}
                options={RERATE_INTERVALS}
                onChange={(rerate) => settings.patch({ rerate })}
              />
            </ValueRow>
          )}
        </ValueCard>
      </SettingsSection>
    </SettingsFrame>
  )
}

/* -------------------------------------------------------------------------- */
/*  Subscription and pricing                                                   */
/* -------------------------------------------------------------------------- */

function Membership() {
  const settings = useSettings("membership-v2", {
    monthly: 149,
    annualOn: true,
    discount: 15,
    hsa: false,
  })
  const d = settings.draft
  /* The annual price follows from the monthly one less the discount. */
  const full = d.monthly * 12
  const annual = Math.round(full * (1 - d.discount / 100))
  return (
    <SettingsFrame action={settings.actions}>
      <SettingsSection title="Optimization membership">
        <ValueCard>
          <ValueRow label="Monthly price">
            <NumberInput
              label="Monthly price"
              prefix="$"
              unit="a month"
              value={d.monthly}
              onChange={(monthly) => settings.patch({ monthly })}
            />
          </ValueRow>
          <ValueRow label="Annual plan">
            <Switch
              checked={d.annualOn}
              aria-label="Offer an annual plan"
              onCheckedChange={(annualOn) => settings.patch({ annualOn })}
            />
          </ValueRow>
          {d.annualOn && (
            <ValueRow label="Annual discount">
              <NumberInput
                label="Annual discount"
                unit="% off"
                value={d.discount}
                onChange={(discount) =>
                  settings.patch({ discount: Math.min(discount, 100) })
                }
              />
            </ValueRow>
          )}
          {d.annualOn && (
            <ValueRow label="Annual price">
              <span className="text-sm tabular-nums">
                <span className="font-medium">
                  ${annual.toLocaleString("en-US")} a year
                </span>
                {full > annual && (
                  <span className="text-muted-foreground">
                    , saves ${(full - annual).toLocaleString("en-US")} on $
                    {full.toLocaleString("en-US")}
                  </span>
                )}
              </span>
            </ValueRow>
          )}
        </ValueCard>
      </SettingsSection>
      {shown("Partly") && (
        <SettingsSection title="Payment">
          <ValueCard>
            <ValueRow label="Show the HSA screen before payment">
              <Switch
                checked={d.hsa}
                aria-label="Show the HSA screen before payment"
                onCheckedChange={(hsa) => settings.patch({ hsa })}
              />
            </ValueRow>
          </ValueCard>
        </SettingsSection>
      )}
    </SettingsFrame>
  )
}

type PriceItem = { id: string; name: string; price: number; on: boolean }

/** A charged list: the longevity tests, or the AI credit top ups. */
function PriceList({ kind }: { kind: "longevity" | "top-ups" }) {
  const seed = kind === "longevity" ? LONGEVITY_ITEMS : TOP_UPS
  const settings = useSettings<{ items: PriceItem[] }>(kind, { items: seed })
  const items = settings.draft.items
  const noun = kind === "longevity" ? "test" : "top up"

  function update(id: string, changes: Partial<PriceItem>) {
    settings.patch({
      items: items.map((item) =>
        item.id === id ? { ...item, ...changes } : item
      ),
    })
  }

  return (
    <SettingsFrame action={settings.actions}>
      <SettingsSection
        title={kind === "longevity" ? "Longevity tests" : "AI credit top ups"}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              settings.patch({
                items: [
                  ...items,
                  { id: `new-${Date.now()}`, name: "", price: 0, on: false },
                ],
              })
            }
          >
            <IconAdd />
            Add {noun}
          </Button>
        }
      >
        <SettingsTable
          columns={[
            { header: kind === "longevity" ? "Test" : "Package" },
            { header: "Price", className: "w-48" },
            { header: "Offered", className: "w-28" },
            { header: "", className: "w-14" },
          ]}
        >
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Input
                  aria-label={`${noun} name`}
                  value={item.name}
                  placeholder={
                    kind === "longevity" ? "Test name" : "Package name"
                  }
                  onChange={(e) => update(item.id, { name: e.target.value })}
                  className="max-w-96 border-transparent bg-transparent px-0 font-medium shadow-none focus-visible:border-input focus-visible:px-3"
                />
              </TableCell>
              <TableCell>
                <NumberInput
                  label={`Price for ${item.name || noun}`}
                  prefix="$"
                  value={item.price}
                  onChange={(price) => update(item.id, { price })}
                  className="w-32"
                />
              </TableCell>
              <TableCell>
                <Switch
                  size="sm"
                  checked={item.on}
                  aria-label={`Offer ${item.name || noun}`}
                  onCheckedChange={(on) => update(item.id, { on })}
                />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${item.name || noun}`}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() =>
                    settings.patch({
                      items: items.filter((i) => i.id !== item.id),
                    })
                  }
                >
                  <IconTrash />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </SettingsTable>
      </SettingsSection>
    </SettingsFrame>
  )
}

/* -------------------------------------------------------------------------- */
/*  AI                                                                         */
/* -------------------------------------------------------------------------- */

/* Each allowance is a number of questions or a dollar amount of tokens,
   over a week or a month. Five questions a week for free patients, per the
   scope sheet; the paid figure is a placeholder until it is agreed. */
const LIMIT_BY = ["Questions", "Token spend"] as const
const LIMIT_PERIODS = ["Week", "Month"] as const

type Allowance = { by: string; amount: number; per: string }

function AllowanceCard({
  who,
  value,
  onChange,
}: {
  who: string
  value: Allowance
  onChange: (value: Allowance) => void
}) {
  const tokens = value.by === "Token spend"
  const per = `a ${value.per.toLowerCase()}`
  return (
    <ValueCard>
      <ValueRow label="Limit by">
        <ChoiceSelect
          label={`${who} limit by`}
          value={value.by}
          options={LIMIT_BY}
          onChange={(by) => onChange({ ...value, by })}
        />
      </ValueRow>
      <ValueRow label="Period">
        <ChoiceSelect
          label={`${who} allowance period`}
          value={value.per}
          options={LIMIT_PERIODS}
          onChange={(p) => onChange({ ...value, per: p })}
        />
      </ValueRow>
      <ValueRow label="Allowance">
        <NumberInput
          label={`${who} allowance`}
          prefix={tokens ? "$" : undefined}
          unit={tokens ? `of tokens ${per}` : `questions ${per}`}
          value={value.amount}
          min={0}
          onChange={(amount) => onChange({ ...value, amount })}
          className="w-56"
        />
      </ValueRow>
    </ValueCard>
  )
}

function AiCredit() {
  const settings = useSettings("ai-credit-allowance", {
    free: { by: "Questions", amount: 5, per: "Week" } as Allowance,
    paid: { by: "Questions", amount: 40, per: "Week" } as Allowance,
    grace: true,
  })
  const d = settings.draft
  return (
    <SettingsFrame action={settings.actions}>
      <SettingsSection title="Free patients">
        <AllowanceCard
          who="Free"
          value={d.free}
          onChange={(free) => settings.patch({ free })}
        />
      </SettingsSection>
      <SettingsSection title="Paid patients">
        <AllowanceCard
          who="Paid"
          value={d.paid}
          onChange={(paid) => settings.patch({ paid })}
        />
      </SettingsSection>
      {/* Not in the scope sheet: the grace chat for one in progress. */}
      {shown("Open") && (
        <SettingsSection title="At the limit">
          <ValueCard>
            <ValueRow label="Let a chat in progress finish">
              <Switch
                checked={d.grace}
                aria-label="Let a chat in progress finish"
                onCheckedChange={(grace) => settings.patch({ grace })}
              />
            </ValueRow>
          </ValueCard>
        </SettingsSection>
      )}
    </SettingsFrame>
  )
}

function AiModels() {
  const settings = useSettings("ai-models", {
    chat: "Claude Sonnet 5.5" as string,
    escalate: "Claude Opus 5.5" as string,
    carePlan: "Claude Opus 5.5" as string,
  })
  const d = settings.draft
  return (
    <SettingsFrame action={settings.actions}>
      <SettingsSection title="Models">
        <ValueCard>
          <ValueRow label="Ask Inlay chat">
            <ChoiceSelect
              label="Ask Inlay chat model"
              value={d.chat}
              options={MODELS}
              onChange={(chat) => settings.patch({ chat })}
              className="w-48"
            />
          </ValueRow>
          <ValueRow label="Harder questions">
            <ChoiceSelect
              label="Model for harder questions"
              value={d.escalate}
              options={MODELS}
              onChange={(escalate) => settings.patch({ escalate })}
              className="w-48"
            />
          </ValueRow>
          <ValueRow label="Care plan drafts">
            <ChoiceSelect
              label="Care plan model"
              value={d.carePlan}
              options={MODELS}
              onChange={(carePlan) => settings.patch({ carePlan })}
              className="w-48"
            />
          </ValueRow>
        </ValueCard>
      </SettingsSection>
    </SettingsFrame>
  )
}

/** The reputable sources the AI may draw on. */
function Sources() {
  const settings = useSettings("ai-sources", { items: SOURCES })
  const items = settings.draft.items
  const [adding, setAdding] = React.useState(false)
  const [name, setName] = React.useState("")
  const [domain, setDomain] = React.useState("")

  function update(id: string, on: boolean) {
    settings.patch({
      items: items.map((s) => (s.id === id ? { ...s, on } : s)),
    })
  }

  return (
    <SettingsFrame action={settings.actions}>
      <SettingsSection
        title={`Approved sources (${items.filter((s) => s.on).length})`}
        action={
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <IconAdd />
            Add source
          </Button>
        }
      >
        <SettingsTable
          columns={[
            { header: "Source" },
            { header: "Website", className: "hidden md:table-cell" },
            { header: "Approved", className: "w-28" },
            { header: "", className: "w-14" },
          ]}
        >
          {items.map((source) => (
            <TableRow key={source.id}>
              <TableCell className="font-medium">{source.name}</TableCell>
              <TableCell className="hidden text-foreground/80 md:table-cell">
                {source.domain}
              </TableCell>
              <TableCell>
                <Switch
                  size="sm"
                  checked={source.on}
                  aria-label={`Approve ${source.name}`}
                  onCheckedChange={(on) => update(source.id, on)}
                />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${source.name}`}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() =>
                    settings.patch({
                      items: items.filter((s) => s.id !== source.id),
                    })
                  }
                >
                  <IconTrash />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </SettingsTable>
      </SettingsSection>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-md">
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!name.trim()) return
              settings.patch({
                items: [
                  ...items,
                  {
                    id: `src-${Date.now()}`,
                    name: name.trim(),
                    domain: domain.trim(),
                    on: true,
                  },
                ],
              })
              setName("")
              setDomain("")
              setAdding(false)
            }}
          >
            <DialogHeader>
              <DialogTitle>Add source</DialogTitle>
              <DialogDescription className="sr-only">
                A source the AI may draw on.
              </DialogDescription>
            </DialogHeader>
            <TextField
              id="source-name"
              label="Source name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              id="source-domain"
              label="Website"
              placeholder="example.org"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdding(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add source</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SettingsFrame>
  )
}
