"use client"

import * as React from "react"
import { toast } from "@/design-system/ui/sonner"
import {
  IconAdd,
  IconEdit,
  IconLock,
  IconLockOpen,
  IconTrash,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import {
  FormSection,
  MultiSelectDropdownField,
  SelectField,
  SheetForm,
  TextField,
} from "@/components/form-kit"
import { shortDate } from "@/components/practice/practice-data"
import {
  type Column,
  Directory,
  NAME_LINK,
  RowMenu,
} from "@/components/practice/directory"
import {
  FormFooter,
  SideSheet,
  SideSheetHeader,
} from "@/components/practice/sheets"
import {
  ALERT_ACTIONS,
  ALGORITHM_VERSIONS,
  type AlertRule,
  CATEGORIES,
  OPERATORS,
  PILLARS,
  PRIORITIES,
  PROTOCOL_TYPES,
  type Protocol,
  TODAY,
  alertRules,
  biomarkers,
  protocols,
} from "@/components/clinical/clinical-data"
import { TextAreaField } from "@/components/clinical/clinical-kit"
import {
  ChoiceSelect,
  NumberInput,
  SettingsBack,
  SettingsFrame,
  SettingsHeading,
  SettingsSection,
  SettingsTable,
  StatusDot,
  ValueCard,
  ValueRow,
  useSettings,
} from "@/components/settings/settings-kit"
import { Button } from "@/design-system/ui/button"
import { DropdownMenuItem } from "@/design-system/ui/dropdown-menu"
import { Switch } from "@/design-system/ui/switch"
import { TableCell, TableRow } from "@/design-system/ui/table"

/* Protocols (authoring only: versioning and the approval workflow are not
   part of this build), the deterministic alert rules, the Inlay score
   weights and the forecast thresholds. */

const AUTHOR = "Dr. Edward Blanchard"

function nameLink(label: string, onClick: () => void) {
  return (
    <Button
      variant="link"
      className={cn(NAME_LINK, "font-medium")}
      onClick={onClick}
    >
      {label}
    </Button>
  )
}

function useBiomarkerNames() {
  const { items } = biomarkers.use()
  return {
    markers: items.filter((b) => b.status === "Active"),
    nameOf: (id: string) => items.find((b) => b.id === id)?.name ?? id,
    idOf: (name: string) => items.find((b) => b.name === name)?.id,
    unitOf: (id: string) => items.find((b) => b.id === id)?.unit ?? "",
  }
}

/* -------------------------------------------------------------------------- */
/*  Protocols                                                         */
/* -------------------------------------------------------------------------- */

export function ProtocolsPage() {
  const { items } = protocols.use()
  const { nameOf } = useBiomarkerNames()
  const [editing, setEditing] = React.useState<Protocol | "new" | null>(null)

  const columns: Column<Protocol>[] = [
    {
      id: "id",
      header: "ID",
      className: "hidden w-20 text-primary-tint tabular-nums md:table-cell",
      cell: (p) => p.id,
      sortValue: (p) => p.id,
    },
    {
      id: "title",
      header: "Title",
      cell: (p) => nameLink(p.title, () => setEditing(p)),
      sortValue: (p) => p.title,
    },
    {
      id: "type",
      header: "Type",
      cell: (p) => p.type,
    },
    {
      id: "pillar",
      header: "Pillar",
      className: "text-foreground/80",
      cell: (p) => p.pillar,
      sortValue: (p) => p.pillar,
    },
    {
      id: "biomarkers",
      header: "Biomarkers",
      className: "hidden max-w-72 truncate text-foreground/80 lg:table-cell",
      cell: (p) => p.biomarkerIds.map(nameOf).join(", "),
    },
    {
      id: "author",
      header: "Author",
      className: "hidden text-foreground/80 xl:table-cell",
      cell: (p) => p.author,
    },
    {
      id: "updated",
      header: "Last updated",
      className: "hidden tabular-nums text-foreground/80 md:table-cell",
      cell: (p) => shortDate(p.updatedAt),
      sortValue: (p) => p.updatedAt,
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
        <RowMenu label={`Actions for ${p.title}`}>
          <DropdownMenuItem onClick={() => setEditing(p)}>
            <IconEdit />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const status = p.status === "Active" ? "Retired" : "Active"
              protocols.patch(p.id, { status })
              toast.success(
                status === "Retired"
                  ? `${p.title} retired`
                  : `${p.title} restored`
              )
            }}
          >
            {p.status === "Active" ? <IconLock /> : <IconLockOpen />}
            {p.status === "Active" ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
        </RowMenu>
      ),
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Directory
        title="Protocols"
        leading={<SettingsBack />}
        statusTabs={{ options: PROTOCOL_TYPES, value: (p) => p.type }}
        noun="protocols"
        rows={items}
        columns={columns}
        search={(p) => [p.id, p.title, p.pillar, p.author]}
        filters={[
          {
            id: "pillar",
            label: "Pillar",
            all: "All pillars",
            options: PILLARS,
            match: (p, v) => p.pillar === v,
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
          label: "Add protocol",
          icon: <IconAdd />,
          onClick: () => setEditing("new"),
        }}
        exportName="Protocols"
        exportRow={(p) => ({
          ID: p.id,
          Title: p.title,
          Type: p.type,
          Pillar: p.pillar,
          Biomarkers: p.biomarkerIds.map(nameOf).join(", "),
          Author: p.author,
          "Last updated": p.updatedAt,
          Status: p.status,
        })}
        emptyIllustration="no-results"
      />
      <SideSheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        wide
      >
        {editing && (
          <ProtocolForm
            protocol={editing === "new" ? null : editing}
            items={items}
            onClose={() => setEditing(null)}
          />
        )}
      </SideSheet>
    </div>
  )
}

function ProtocolForm({
  protocol,
  items,
  onClose,
}: {
  protocol: Protocol | null
  items: Protocol[]
  onClose: () => void
}) {
  const { markers, nameOf, idOf } = useBiomarkerNames()
  const [draft, setDraft] = React.useState({
    title: protocol?.title ?? "",
    type: protocol?.type ?? "Protocol",
    pillar: protocol?.pillar ?? "",
    biomarkerIds: protocol?.biomarkerIds ?? [],
    summary: protocol?.summary ?? "",
    steps: protocol?.steps ?? "",
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!draft.title.trim()) next.title = "Enter a title"
    if (!draft.pillar) next.pillar = "Select a pillar"
    setErrors(next)
    if (Object.keys(next).length) return
    const values = { ...draft, title: draft.title.trim(), updatedAt: TODAY }
    if (protocol) {
      protocols.patch(protocol.id, values)
      toast.success("Protocol saved")
    } else {
      const prefix = "PR"
      const n = items.filter((p) => p.id.startsWith(prefix)).length + 1
      protocols.add([
        {
          ...values,
          id: `${prefix}${String(n).padStart(3, "0")}`,
          author: AUTHOR,
          status: "Active",
        },
      ])
      toast.success(`${draft.type} added`)
    }
    onClose()
  }

  return (
    <>
      <SideSheetHeader
        title={protocol ? protocol.title : "Add protocol"}
        description="The protocol's details and steps."
      />
      <SheetForm id="protocol-form" onSubmit={submit}>
        <FormSection title="Details">
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-3">
            <TextField
              id="protocol-title"
              label="Title"
              required
              value={draft.title}
              error={errors.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="sm:col-span-3"
            />
            <SelectField
              id="protocol-type"
              label="Type"
              options={PROTOCOL_TYPES}
              value={draft.type}
              onChange={(type) =>
                setDraft({ ...draft, type: type || "Protocol" })
              }
            />
            <SelectField
              id="protocol-pillar"
              label="Pillar"
              required
              options={PILLARS}
              value={draft.pillar}
              error={errors.pillar}
              onChange={(pillar) => setDraft({ ...draft, pillar })}
            />
            <MultiSelectDropdownField
              id="protocol-biomarkers"
              label="Biomarkers"
              options={markers.map((b) => b.name)}
              value={draft.biomarkerIds.map(nameOf)}
              placeholder="Select biomarkers"
              onChange={(names) =>
                setDraft({
                  ...draft,
                  biomarkerIds: names
                    .map(idOf)
                    .filter((id): id is string => !!id),
                })
              }
            />
          </div>
        </FormSection>
        <FormSection title="Content">
          <TextAreaField
            id="protocol-summary"
            label="Summary"
            rows={3}
            value={draft.summary}
            onChange={(summary) => setDraft({ ...draft, summary })}
          />
          <TextAreaField
            id="protocol-steps"
            label="Steps"
            rows={10}
            value={draft.steps}
            onChange={(steps) => setDraft({ ...draft, steps })}
          />
        </FormSection>
      </SheetForm>
      <FormFooter
        formId="protocol-form"
        submitLabel={protocol ? "Save changes" : "Add protocol"}
        onCancel={onClose}
      />
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Alert rules                                                                */
/* -------------------------------------------------------------------------- */

const PRIORITY_TONE: Record<string, "warning" | "success" | "muted"> = {
  Urgent: "warning",
  High: "warning",
  Routine: "muted",
}

function conditionOf(rule: AlertRule, unit: string) {
  const amount = rule.percent ? `${rule.value}%` : `${rule.value} ${unit}`
  return `${rule.operator.toLowerCase()} ${amount}`
}

export function AlertRulesPage() {
  const { items } = alertRules.use()
  const { nameOf, unitOf } = useBiomarkerNames()
  const [editing, setEditing] = React.useState<AlertRule | "new" | null>(null)

  const columns: Column<AlertRule>[] = [
    {
      id: "name",
      header: "Rule",
      cell: (r) => nameLink(r.name, () => setEditing(r)),
      sortValue: (r) => r.name,
    },
    {
      id: "when",
      header: "When",
      cell: (r) => (
        <span>
          <span className="font-medium">{nameOf(r.biomarkerId)}</span>{" "}
          <span className="text-foreground/80 tabular-nums">
            {conditionOf(r, unitOf(r.biomarkerId))}
          </span>
        </span>
      ),
    },
    {
      id: "priority",
      header: "Priority",
      cell: (r) => (
        <StatusDot tone={PRIORITY_TONE[r.priority] ?? "muted"}>
          {r.priority}
        </StatusDot>
      ),
      sortValue: (r) => PRIORITIES.indexOf(r.priority as never),
    },
    {
      id: "actions-taken",
      header: "Then",
      className: "hidden text-foreground/80 lg:table-cell",
      cell: (r) => r.actions.join(", "),
    },
    {
      id: "on",
      header: "On",
      className: "w-20",
      cell: (r) => (
        <Switch
          size="sm"
          checked={r.on}
          aria-label={`Turn ${r.name} ${r.on ? "off" : "on"}`}
          onCheckedChange={(on) => alertRules.patch(r.id, { on })}
        />
      ),
    },
    {
      id: "actions",
      header: "",
      className: "w-12 text-right",
      cell: (r) => (
        <RowMenu label={`Actions for ${r.name}`}>
          <DropdownMenuItem onClick={() => setEditing(r)}>
            <IconEdit />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              alertRules.remove(r.id)
              toast.success(`${r.name} deleted`)
            }}
          >
            <IconTrash />
            Delete
          </DropdownMenuItem>
        </RowMenu>
      ),
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Directory
        title="Alert rules"
        leading={<SettingsBack />}
        heading={<SettingsHeading />}
        noun="rules"
        rows={items}
        columns={columns}
        search={(r) => [r.name, nameOf(r.biomarkerId)]}
        filters={[
          {
            id: "priority",
            label: "Priority",
            all: "Any priority",
            options: PRIORITIES,
            match: (r, v) => r.priority === v,
          },
          {
            id: "action",
            label: "Action",
            all: "Any action",
            options: ALERT_ACTIONS,
            match: (r, v) => r.actions.includes(v),
          },
          {
            id: "on",
            label: "State",
            all: "On and off",
            options: ["On", "Off"],
            match: (r, v) => (v === "On") === r.on,
          },
        ]}
        primaryAction={{
          label: "Add rule",
          icon: <IconAdd />,
          onClick: () => setEditing("new"),
        }}
        hideExport
        exportName="Alert rules"
        exportRow={(r) => ({
          Rule: r.name,
          Biomarker: nameOf(r.biomarkerId),
          When: conditionOf(r, unitOf(r.biomarkerId)),
          Priority: r.priority,
          Then: r.actions.join(", "),
          On: r.on ? "Yes" : "No",
        })}
        emptyIllustration="no-results"
      />
      <SideSheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        {editing && (
          <AlertRuleForm
            rule={editing === "new" ? null : editing}
            count={items.length}
            onClose={() => setEditing(null)}
          />
        )}
      </SideSheet>
    </div>
  )
}

function AlertRuleForm({
  rule,
  count,
  onClose,
}: {
  rule: AlertRule | null
  count: number
  onClose: () => void
}) {
  const { markers, nameOf, idOf, unitOf } = useBiomarkerNames()
  const [draft, setDraft] = React.useState({
    name: rule?.name ?? "",
    biomarkerId: rule?.biomarkerId ?? "",
    operator: rule?.operator ?? "Above",
    value: rule?.value ?? 0,
    priority: rule?.priority ?? "High",
    actions: rule?.actions ?? ["Notify physician"],
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const percent = draft.operator === "Rises by" || draft.operator === "Falls by"

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!draft.name.trim()) next.name = "Enter the rule's name"
    if (!draft.biomarkerId) next.biomarker = "Select a biomarker"
    if (!draft.actions.length) next.actions = "Select at least one action"
    setErrors(next)
    if (Object.keys(next).length) return
    const values = { ...draft, name: draft.name.trim(), percent }
    if (rule) {
      alertRules.patch(rule.id, values)
      toast.success("Rule saved")
    } else {
      alertRules.add([
        {
          ...values,
          id: `AR${String(count + 1).padStart(3, "0")}`,
          on: true,
        },
      ])
      toast.success("Rule added")
    }
    onClose()
  }

  return (
    <>
      <SideSheetHeader
        title={rule ? "Edit rule" : "Add rule"}
        description="The condition, priority and what happens when it fires."
      />
      <SheetForm id="alert-rule-form" onSubmit={submit}>
        <TextField
          id="rule-name"
          label="Rule name"
          required
          value={draft.name}
          error={errors.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <FormSection title="When">
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <SelectField
              id="rule-biomarker"
              label="Biomarker"
              required
              options={markers.map((b) => b.name)}
              value={draft.biomarkerId ? nameOf(draft.biomarkerId) : ""}
              error={errors.biomarker}
              onChange={(name) =>
                setDraft({ ...draft, biomarkerId: idOf(name) ?? "" })
              }
              className="sm:col-span-2"
            />
            <SelectField
              id="rule-operator"
              label="Condition"
              options={OPERATORS}
              value={draft.operator}
              onChange={(operator) =>
                setDraft({ ...draft, operator: operator || "Above" })
              }
            />
            <TextField
              id="rule-value"
              label={
                percent
                  ? "Change in %"
                  : `Value${draft.biomarkerId ? ` (${unitOf(draft.biomarkerId)})` : ""}`
              }
              type="number"
              value={draft.value}
              onChange={(e) =>
                setDraft({ ...draft, value: Number(e.target.value) })
              }
            />
          </div>
        </FormSection>
        <FormSection title="Then">
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <SelectField
              id="rule-priority"
              label="Priority"
              options={PRIORITIES}
              value={draft.priority}
              onChange={(priority) =>
                setDraft({ ...draft, priority: priority || "High" })
              }
            />
            <MultiSelectDropdownField
              id="rule-actions"
              label="Actions"
              required
              options={ALERT_ACTIONS}
              value={draft.actions}
              error={errors.actions}
              placeholder="Select actions"
              onChange={(actions) => setDraft({ ...draft, actions })}
            />
          </div>
        </FormSection>
      </SheetForm>
      <FormFooter
        formId="alert-rule-form"
        submitLabel={rule ? "Save changes" : "Add rule"}
        onCancel={onClose}
      />
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Score weights                                                              */
/* -------------------------------------------------------------------------- */

const DOMAIN_WEIGHTS: Record<string, number> = {
  Cardiometabolic: 20,
  Lipids: 15,
  Hormones: 10,
  Thyroid: 5,
  Inflammation: 15,
  Liver: 10,
  Kidney: 10,
  "Blood count": 5,
  Nutrients: 10,
}

/** Weights that add up to 100; a single biomarker carries everything. */
function evenWeights(ids: string[]) {
  const each = Math.floor(100 / Math.max(ids.length, 1))
  return Object.fromEntries(
    ids.map((id, i) => [id, i === 0 ? 100 - each * (ids.length - 1) : each])
  )
}

function TotalRow({ total }: { total: number }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="font-semibold">Total</TableCell>
      <TableCell>
        <span
          className={
            total === 100
              ? "font-semibold tabular-nums"
              : "font-semibold text-destructive tabular-nums"
          }
        >
          {total}%
        </span>
        {total !== 100 && (
          <span className="ml-2 text-sm text-destructive">
            Weights must add up to 100%
          </span>
        )}
      </TableCell>
    </TableRow>
  )
}

export function ScoreWeightsPage() {
  const { items } = biomarkers.use()
  const active = items.filter((b) => b.status === "Active")
  const [seedMarkers] = React.useState(() =>
    Object.fromEntries(
      CATEGORIES.map((c) => [
        c,
        evenWeights(active.filter((b) => b.category === c).map((b) => b.id)),
      ])
    )
  )
  const settings = useSettings("clinical-score-weights", {
    algorithm: ALGORITHM_VERSIONS[0] as string,
    domains: DOMAIN_WEIGHTS,
    markers: seedMarkers as Record<string, Record<string, number>>,
  })
  const d = settings.draft
  const [domain, setDomain] = React.useState<string>(CATEGORIES[0])
  const domainTotal = Object.values(d.domains).reduce((a, b) => a + b, 0)
  const inDomain = active.filter((b) => b.category === domain)
  const markerWeights = d.markers[domain] ?? {}
  const markerTotal = inDomain.reduce(
    (sum, b) => sum + (markerWeights[b.id] ?? 0),
    0
  )
  const valid = domainTotal === 100 && markerTotal === 100

  return (
    <SettingsFrame
      action={
        <div className="flex items-center gap-2">
          {settings.dirty && (
            <Button variant="outline" size="sm" onClick={settings.discard}>
              Discard
            </Button>
          )}
          <Button
            size="sm"
            disabled={!settings.dirty || !valid}
            onClick={settings.save}
          >
            Save
          </Button>
        </div>
      }
    >
      <SettingsSection title="Algorithm">
        <ValueCard>
          <ValueRow label="Algorithm version">
            <ChoiceSelect
              label="Algorithm version"
              value={d.algorithm}
              options={ALGORITHM_VERSIONS}
              onChange={(algorithm) => settings.patch({ algorithm })}
              className="w-32"
            />
          </ValueRow>
        </ValueCard>
      </SettingsSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsSection title="Overall score">
          <SettingsTable
            columns={[{ header: "Domain" }, { header: "Weight", className: "w-56" }]}
          >
            {CATEGORIES.map((c) => (
              <TableRow key={c}>
                <TableCell className="font-medium">{c}</TableCell>
                <TableCell>
                  <NumberInput
                    label={`${c} weight`}
                    unit="%"
                    value={d.domains[c] ?? 0}
                    onChange={(v) =>
                      settings.patch({ domains: { ...d.domains, [c]: v } })
                    }
                    className="w-28"
                  />
                </TableCell>
              </TableRow>
            ))}
            <TotalRow total={domainTotal} />
          </SettingsTable>
        </SettingsSection>

        <SettingsSection
          title="Domain score"
          action={
            <ChoiceSelect
              label="Domain"
              value={domain}
              options={CATEGORIES}
              onChange={setDomain}
              className="w-44"
            />
          }
        >
          <SettingsTable
            columns={[
              { header: "Biomarker" },
              { header: "Weight", className: "w-56" },
            ]}
          >
            {inDomain.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell>
                  <NumberInput
                    label={`${b.name} weight`}
                    unit="%"
                    value={markerWeights[b.id] ?? 0}
                    onChange={(v) =>
                      settings.patch({
                        markers: {
                          ...d.markers,
                          [domain]: { ...markerWeights, [b.id]: v },
                        },
                      })
                    }
                    className="w-28"
                  />
                </TableCell>
              </TableRow>
            ))}
            <TotalRow total={markerTotal} />
          </SettingsTable>
        </SettingsSection>
      </div>
    </SettingsFrame>
  )
}

/* -------------------------------------------------------------------------- */
/*  Forecast thresholds                                                        */
/* -------------------------------------------------------------------------- */

export function ForecastPage() {
  const settings = useSettings("clinical-forecast", {
    confidence: 70,
    points: 3,
    span: 6,
    horizon: 12,
    hideBelow: true,
    overrides: CATEGORIES.map((c) => ({
      category: c as string,
      points: c === "Hormones" || c === "Thyroid" ? 4 : 3,
      confidence: c === "Hormones" ? 75 : 70,
    })),
  })
  const d = settings.draft
  return (
    <SettingsFrame action={settings.actions}>
      <SettingsSection title="Every biomarker">
        <ValueCard>
          <ValueRow label="Minimum confidence">
            <NumberInput
              label="Minimum confidence"
              unit="%"
              value={d.confidence}
              onChange={(confidence) =>
                settings.patch({ confidence: Math.min(confidence, 100) })
              }
            />
          </ValueRow>
          <ValueRow label="Minimum data points">
            <NumberInput
              label="Minimum data points"
              unit="readings"
              min={2}
              value={d.points}
              onChange={(points) => settings.patch({ points })}
            />
          </ValueRow>
          <ValueRow label="Minimum time span">
            <NumberInput
              label="Minimum time span"
              unit="months"
              min={1}
              value={d.span}
              onChange={(span) => settings.patch({ span })}
            />
          </ValueRow>
          <ValueRow label="Forecast ahead">
            <NumberInput
              label="Forecast ahead"
              unit="months"
              min={1}
              value={d.horizon}
              onChange={(horizon) => settings.patch({ horizon })}
            />
          </ValueRow>
          <ValueRow label="Hide forecasts below the threshold">
            <Switch
              checked={d.hideBelow}
              aria-label="Hide forecasts below the threshold"
              onCheckedChange={(hideBelow) => settings.patch({ hideBelow })}
            />
          </ValueRow>
        </ValueCard>
      </SettingsSection>
      <SettingsSection title="By category">
        <SettingsTable
          columns={[
            { header: "Category" },
            { header: "Minimum data points", className: "w-56" },
            { header: "Minimum confidence", className: "w-56" },
          ]}
        >
          {d.overrides.map((row, i) => (
            <TableRow key={row.category}>
              <TableCell className="font-medium">{row.category}</TableCell>
              <TableCell>
                <NumberInput
                  label={`${row.category} minimum data points`}
                  unit="readings"
                  min={2}
                  value={row.points}
                  onChange={(points) =>
                    settings.patch({
                      overrides: d.overrides.map((o, j) =>
                        j === i ? { ...o, points } : o
                      ),
                    })
                  }
                />
              </TableCell>
              <TableCell>
                <NumberInput
                  label={`${row.category} minimum confidence`}
                  unit="%"
                  value={row.confidence}
                  onChange={(confidence) =>
                    settings.patch({
                      overrides: d.overrides.map((o, j) =>
                        j === i
                          ? { ...o, confidence: Math.min(confidence, 100) }
                          : o
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
