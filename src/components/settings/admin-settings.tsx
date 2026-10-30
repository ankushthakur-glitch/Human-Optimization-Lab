"use client"

import * as React from "react"
import {
  IconAdd,
  IconBilling,
  IconClipboard,
  IconCreditCard,
  IconFileText,
  IconLab,
  IconHandshake,
  IconHistory,
  IconShield,
  IconSparkles,
  IconTarget,
  IconTrash,
} from "@/design-system/icons"

import { AdminShell } from "@/components/admin/admin-shell"
import { TextField } from "@/components/form-kit"
import {
  BiomarkersPage,
  RangesPage,
  SexAgeRulesPage,
} from "@/components/clinical/catalog"
import { TestCasesPage } from "@/components/clinical/eval-evidence"
import { AlertRulesPage } from "@/components/clinical/protocols-rules"
import { CataloguePanel } from "@/components/admin/billing/catalogue"
import { AuditLogPage } from "@/components/settings/audit-log"
import {
  CancellationPolicy,
  PatientPayments,
} from "@/components/settings/billing-settings"
import { PartnersPage } from "@/components/settings/partners"
import { RolesPage } from "@/components/settings/roles"
import {
  INTERVAL_UNITS,
  MODELS,
  RERATE_INTERVALS,
  SOURCES,
  TEMPLATE_SECTIONS,
  TESTS,
  TEST_GUARDS,
  TOP_UPS,
} from "@/components/settings/settings-data"
import {
  ChoiceSelect,
  NumberInput,
  SettingsBack,
  SettingsFrame,
  type SettingsGroup,
  SettingsHeading,
  SettingsHome,
  SettingsRoute,
  SettingsSection,
  SettingsTable,
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
import { Field, FieldLabel } from "@/design-system/ui/field"
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
        id: "top-ups",
        label: "AI credit top ups",
        render: () => <TopUps />,
      },
    ],
  },
  {
    id: "billing",
    title: "Billing",
    icon: IconBilling,
    pages: [
      {
        id: "catalogue",
        label: "Catalogue and pricing",
        render: () => (
          <CataloguePanel
            leading={<SettingsBack />}
            heading={<SettingsHeading />}
          />
        ),
      },
      {
        id: "patients",
        label: "Patient payments",
        render: () => <PatientPayments />,
      },
      {
        id: "cancellations",
        label: "Cancellations",
        render: () => <CancellationPolicy />,
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
  /* The clinical content console, folded into Settings on 30 Oct. */
  {
    id: "clinical",
    title: "Clinical catalog",
    icon: IconLab,
    pages: [
      {
        id: "biomarkers",
        label: "Biomarkers",
        render: () => <BiomarkersPage />,
      },
      { id: "ranges", label: "Ranges", render: () => <RangesPage /> },
      {
        id: "sex-age",
        label: "Sex and age rules",
        render: () => <SexAgeRulesPage />,
      },
    ],
  },
  {
    id: "rules",
    title: "Rules",
    icon: IconFileText,
    pages: [
      { id: "alerts", label: "Alert rules", render: () => <AlertRulesPage /> },
      {
        id: "cases",
        label: "Test cases",
        render: () => <TestCasesPage />,
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
          <ValueRow label="Active members">
            <span className="text-sm tabular-nums">
              <span className="font-medium">412</span>
              <span className="text-muted-foreground">
                , 318 monthly and 94 annual
              </span>
            </span>
          </ValueRow>
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

/** The AI credit a member can buy once the chat allowance runs out, sold
    in dollars of credit, never in questions. */
function TopUps() {
  const settings = useSettings<{ items: PriceItem[] }>("top-ups-v2", {
    items: TOP_UPS,
  })
  const items = settings.draft.items
  const noun = "top up"
  const [adding, setAdding] = React.useState(false)
  const [name, setName] = React.useState("")
  const [price, setPrice] = React.useState(0)

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
        title="AI credit top ups"
        action={
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <IconAdd />
            Add {noun}
          </Button>
        }
      >
        <SettingsTable
          columns={[
            { header: "Package" },
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
                  placeholder="Package name"
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
                    id: `new-${Date.now()}`,
                    name: name.trim(),
                    price,
                    on: true,
                  },
                ],
              })
              setName("")
              setPrice(0)
              setAdding(false)
            }}
          >
            <DialogHeader>
              <DialogTitle>Add top up</DialogTitle>
              <DialogDescription className="sr-only">
                AI credit a member can buy.
              </DialogDescription>
            </DialogHeader>
            <TextField
              id="top-up-name"
              label="Package name"
              required
              placeholder="$10 of AI credit"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Field>
              <FieldLabel>Price</FieldLabel>
              <NumberInput
                label="Price"
                prefix="$"
                value={price}
                onChange={setPrice}
                className="w-full"
              />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdding(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add top up</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SettingsFrame>
  )
}

/* -------------------------------------------------------------------------- */
/*  AI                                                                         */
/* -------------------------------------------------------------------------- */

/* Two pools, per the 29 Oct call. The background AI (plans, trends, record
   analysis) has its own budget baked into the membership price: it is never
   limited, so the app never stops working; Inlay is only alerted when a
   member runs well over it. Only Ask Inlay chat is limited, in dollars of
   tokens (never questions), and members can top it up. Free patients
   have no AI at all (user, 30 Oct). */
const LIMIT_PERIODS = ["Week", "Month"] as const

type Allowance = { amount: number; per: string }

function AllowanceCard({
  who,
  value,
  onChange,
}: {
  who: string
  value: Allowance
  onChange: (value: Allowance) => void
}) {
  return (
    <ValueCard>
      <ValueRow label="Period">
        <ChoiceSelect
          label={`${who} allowance period`}
          value={value.per}
          options={LIMIT_PERIODS}
          onChange={(p) => onChange({ ...value, per: p })}
        />
      </ValueRow>
      <ValueRow label="Chat allowance">
        <NumberInput
          label={`${who} chat allowance`}
          prefix="$"
          unit={`of tokens a ${value.per.toLowerCase()}`}
          value={value.amount}
          min={0}
          onChange={(amount) => onChange({ ...value, amount })}
          className="w-60"
        />
      </ValueRow>
    </ValueCard>
  )
}

function AiCredit() {
  const settings = useSettings("ai-credit-v3", {
    background: 6,
    alertAt: 200,
    paid: { amount: 5, per: "Month" } as Allowance,
    grace: true,
  })
  const d = settings.draft
  return (
    <SettingsFrame action={settings.actions}>
      <SettingsSection title="Background AI">
        <ValueCard>
          <ValueRow label="Limit" meta="Plans, trends, record analysis">
            <span className="text-sm font-medium">Never limited</span>
          </ValueRow>
          <ValueRow label="Budget per member">
            <NumberInput
              label="Background AI budget per member"
              prefix="$"
              unit="a month"
              value={d.background}
              onChange={(background) => settings.patch({ background })}
              className="w-48"
            />
          </ValueRow>
          <ValueRow label="Alert Inlay above">
            <NumberInput
              label="Alert Inlay above"
              unit="% of budget"
              value={d.alertAt}
              onChange={(alertAt) => settings.patch({ alertAt })}
              className="w-48"
            />
          </ValueRow>
        </ValueCard>
      </SettingsSection>
      <SettingsSection title="Ask Inlay chat, members">
        <AllowanceCard
          who="Member"
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
