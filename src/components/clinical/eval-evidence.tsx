"use client"

import * as React from "react"
import { toast } from "@/design-system/ui/sonner"
import {
  IconAdd,
  IconCheckCircle,
  IconEdit,
  IconPlayCircle,
  IconRefresh,
  IconTrash,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import {
  DateField,
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
  CASE_AREAS,
  CHANGE_TYPES,
  type EvidenceSource,
  GATE_RUNS,
  type GateRun,
  RE_REVIEW_REASONS,
  SEVERITIES,
  SOURCE_STATUSES,
  SOURCE_TYPES,
  type SourceStatus,
  TODAY,
  type TestCase,
  VERSION_LOG,
  type VersionEntry,
  addDays,
  protocols,
  sourceStatus,
  sources,
  testCases,
} from "@/components/clinical/clinical-data"
import { TextAreaField } from "@/components/clinical/clinical-kit"
import {
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/ui/dialog"
import { DropdownMenuItem } from "@/design-system/ui/dropdown-menu"
import { Switch } from "@/design-system/ui/switch"
import { TableCell, TableRow } from "@/design-system/ui/table"

/* Eval (the graded test cases, the regression gate every change passes and
   the version log) and Evidence (sources with review and expiry dates). */

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

const RESULT_TONE = {
  Pass: "success",
  Passed: "success",
  Fail: "warning",
  Blocked: "warning",
  "Not run": "muted",
} as const

/* -------------------------------------------------------------------------- */
/*  Test-case library                                                          */
/* -------------------------------------------------------------------------- */

export function TestCasesPage() {
  const { items } = testCases.use()
  const [editing, setEditing] = React.useState<TestCase | "new" | null>(null)

  const columns: Column<TestCase>[] = [
    {
      id: "id",
      header: "ID",
      className: "hidden w-20 text-primary-tint tabular-nums md:table-cell",
      cell: (c) => c.id,
      sortValue: (c) => c.id,
    },
    {
      id: "title",
      header: "Case",
      cell: (c) => nameLink(c.title, () => setEditing(c)),
      sortValue: (c) => c.title,
    },
    {
      id: "area",
      header: "Area",
      className: "text-foreground/80",
      cell: (c) => c.area,
      sortValue: (c) => c.area,
    },
    {
      id: "severity",
      header: "Severity",
      cell: (c) => c.severity,
      sortValue: (c) => SEVERITIES.indexOf(c.severity as never),
    },
    {
      id: "expected",
      header: "Expected",
      className: "hidden max-w-80 truncate text-foreground/80 xl:table-cell",
      cell: (c) => c.expected,
    },
    {
      id: "result",
      header: "Last result",
      cell: (c) => (
        <StatusDot tone={RESULT_TONE[c.lastResult]}>{c.lastResult}</StatusDot>
      ),
    },
    {
      id: "run",
      header: "Last run",
      className: "hidden tabular-nums text-foreground/80 md:table-cell",
      cell: (c) => shortDate(c.lastRun),
      sortValue: (c) => c.lastRun,
    },
    {
      id: "actions",
      header: "",
      className: "w-12 text-right",
      cell: (c) => (
        <RowMenu label={`Actions for ${c.title}`}>
          <DropdownMenuItem onClick={() => setEditing(c)}>
            <IconEdit />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              testCases.remove(c.id)
              toast.success(`${c.title} deleted`)
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
        title="Test-case library"
        leading={<SettingsBack />}
        heading={<SettingsHeading />}
        noun="cases"
        rows={items}
        columns={columns}
        search={(c) => [c.id, c.title, c.scenario, c.area]}
        filters={[
          {
            id: "severity",
            label: "Severity",
            all: "Any severity",
            options: SEVERITIES,
            match: (c, v) => c.severity === v,
          },
          {
            id: "area",
            label: "Area",
            all: "All areas",
            options: CASE_AREAS,
            match: (c, v) => c.area === v,
          },
          {
            id: "result",
            label: "Last result",
            all: "Any result",
            options: ["Pass", "Fail", "Not run"],
            match: (c, v) => c.lastResult === v,
          },
        ]}
        primaryAction={{
          label: "Add case",
          icon: <IconAdd />,
          onClick: () => setEditing("new"),
        }}
        exportName="Clinical test cases"
        exportRow={(c) => ({
          ID: c.id,
          Case: c.title,
          Area: c.area,
          Severity: c.severity,
          Scenario: c.scenario,
          Expected: c.expected,
          Grading: c.grading,
          "Last result": c.lastResult,
          "Last run": c.lastRun,
        })}
        emptyIllustration="no-results"
      />
      <SideSheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        wide
      >
        {editing && (
          <TestCaseForm
            testCase={editing === "new" ? null : editing}
            count={items.length}
            onClose={() => setEditing(null)}
          />
        )}
      </SideSheet>
    </div>
  )
}

function TestCaseForm({
  testCase,
  count,
  onClose,
}: {
  testCase: TestCase | null
  count: number
  onClose: () => void
}) {
  const [draft, setDraft] = React.useState({
    title: testCase?.title ?? "",
    area: testCase?.area ?? "",
    severity: testCase?.severity ?? "Major",
    scenario: testCase?.scenario ?? "",
    expected: testCase?.expected ?? "",
    grading: testCase?.grading ?? "",
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!draft.title.trim()) next.title = "Enter the case's name"
    if (!draft.area) next.area = "Select an area"
    setErrors(next)
    if (Object.keys(next).length) return
    const values = { ...draft, title: draft.title.trim() }
    if (testCase) {
      testCases.patch(testCase.id, values)
      toast.success("Case saved")
    } else {
      testCases.add([
        {
          ...values,
          id: `TC${String(count + 1).padStart(3, "0")}`,
          author: AUTHOR,
          lastResult: "Not run",
          lastRun: "",
        },
      ])
      toast.success("Case added")
    }
    onClose()
  }

  return (
    <>
      <SideSheetHeader
        title={testCase ? testCase.title : "Add case"}
        description="The scenario, the expected outcome and how it is graded."
      />
      <SheetForm id="test-case-form" onSubmit={submit}>
        <FormSection title="Details">
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-3">
            <TextField
              id="case-title"
              label="Case name"
              required
              value={draft.title}
              error={errors.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <SelectField
              id="case-area"
              label="Area"
              required
              options={CASE_AREAS}
              value={draft.area}
              error={errors.area}
              onChange={(area) => setDraft({ ...draft, area })}
            />
            <SelectField
              id="case-severity"
              label="Severity"
              options={SEVERITIES}
              value={draft.severity}
              onChange={(severity) =>
                setDraft({ ...draft, severity: severity || "Major" })
              }
            />
          </div>
        </FormSection>
        <FormSection title="Case">
          <TextAreaField
            id="case-scenario"
            label="Patient scenario"
            value={draft.scenario}
            onChange={(scenario) => setDraft({ ...draft, scenario })}
          />
          <TextAreaField
            id="case-expected"
            label="Expected outcome"
            value={draft.expected}
            onChange={(expected) => setDraft({ ...draft, expected })}
          />
          <TextAreaField
            id="case-grading"
            label="Grading"
            rows={3}
            value={draft.grading}
            onChange={(grading) => setDraft({ ...draft, grading })}
          />
        </FormSection>
      </SheetForm>
      <FormFooter
        formId="test-case-form"
        submitLabel={testCase ? "Save changes" : "Add case"}
        onCancel={onClose}
      />
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Regression gate                                                            */
/* -------------------------------------------------------------------------- */

export function RegressionGatePage() {
  const settings = useSettings("clinical-regression-gate", {
    passRate: 95,
    blockCritical: true,
    runOn: Object.fromEntries(CHANGE_TYPES.map((t) => [t, true])) as Record<
      string,
      boolean
    >,
  })
  const d = settings.draft
  const { items: cases } = testCases.use()
  const [runs, setRuns] = React.useState<GateRun[]>(GATE_RUNS)

  function runNow() {
    const passed = cases.filter((c) => c.lastResult === "Pass").length
    const failedCritical = cases.filter(
      (c) => c.lastResult === "Fail" && c.severity === "Critical"
    ).length
    const passRate = Math.round((passed / Math.max(cases.length, 1)) * 100)
    const blocked =
      passRate < d.passRate || (d.blockCritical && failedCritical > 0)
    const n = Number(runs[0]?.id.split("-")[1] ?? 1000) + 1
    setRuns([
      {
        id: `RUN-${n}`,
        change: "Manual run",
        type: "Prompt",
        cases: cases.length,
        passRate,
        critical: failedCritical,
        result: blocked ? "Blocked" : "Passed",
        ranAt: `${TODAY} ${new Date().toTimeString().slice(0, 5)}`,
      },
      ...runs,
    ])
    toast.success(blocked ? "Run finished: blocked" : "Run finished: passed")
  }

  return (
    <SettingsFrame action={settings.actions}>
      <SettingsSection title="Gate">
        <ValueCard>
          <ValueRow label="Minimum pass rate">
            <NumberInput
              label="Minimum pass rate"
              unit="%"
              value={d.passRate}
              onChange={(passRate) =>
                settings.patch({ passRate: Math.min(passRate, 100) })
              }
            />
          </ValueRow>
          <ValueRow label="Block on any critical failure">
            <Switch
              checked={d.blockCritical}
              aria-label="Block on any critical failure"
              onCheckedChange={(blockCritical) =>
                settings.patch({ blockCritical })
              }
            />
          </ValueRow>
        </ValueCard>
      </SettingsSection>
      <SettingsSection title="Run before shipping a change to">
        <ValueCard>
          {CHANGE_TYPES.map((type) => (
            <ValueRow key={type} label={type}>
              <Switch
                checked={d.runOn[type] ?? false}
                aria-label={`Run before shipping a change to ${type}`}
                onCheckedChange={(on) =>
                  settings.patch({ runOn: { ...d.runOn, [type]: on } })
                }
              />
            </ValueRow>
          ))}
        </ValueCard>
      </SettingsSection>
      <SettingsSection
        title="Recent runs"
        action={
          <Button variant="outline" size="sm" onClick={runNow}>
            <IconPlayCircle />
            Run now
          </Button>
        }
      >
        <SettingsTable
          columns={[
            { header: "Run", className: "w-28" },
            { header: "Change" },
            { header: "Cases", className: "hidden w-24 md:table-cell" },
            { header: "Pass rate", className: "w-28" },
            { header: "Critical failures", className: "hidden w-36 md:table-cell" },
            { header: "Result", className: "w-28" },
            { header: "Ran", className: "hidden w-44 lg:table-cell" },
          ]}
        >
          {runs.map((run) => (
            <TableRow key={run.id}>
              <TableCell className="text-primary-tint tabular-nums">
                {run.id}
              </TableCell>
              <TableCell>
                <span className="font-medium">{run.change}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {run.type}
                </span>
              </TableCell>
              <TableCell className="hidden tabular-nums md:table-cell">
                {run.cases}
              </TableCell>
              <TableCell className="tabular-nums">{run.passRate}%</TableCell>
              <TableCell className="hidden tabular-nums md:table-cell">
                {run.critical}
              </TableCell>
              <TableCell>
                <StatusDot tone={RESULT_TONE[run.result]}>{run.result}</StatusDot>
              </TableCell>
              <TableCell className="hidden text-foreground/80 tabular-nums lg:table-cell">
                {run.ranAt}
              </TableCell>
            </TableRow>
          ))}
        </SettingsTable>
      </SettingsSection>
    </SettingsFrame>
  )
}

/* -------------------------------------------------------------------------- */
/*  Version log                                                                */
/* -------------------------------------------------------------------------- */

export function VersionLogPage() {
  const columns: Column<VersionEntry>[] = [
    {
      id: "logged",
      header: "Logged",
      className: "w-44 tabular-nums text-foreground/80",
      cell: (v) => v.loggedAt,
      sortValue: (v) => v.loggedAt,
    },
    {
      id: "type",
      header: "Component",
      cell: (v) => v.type,
      sortValue: (v) => v.type,
    },
    {
      id: "name",
      header: "Name",
      cell: (v) => <span className="font-medium">{v.name}</span>,
      sortValue: (v) => v.name,
    },
    {
      id: "version",
      header: "Version",
      cell: (v) => (
        <span className="tabular-nums">
          <span className="text-muted-foreground">{v.previous}</span>
          <span className="px-1.5 text-muted-foreground">to</span>
          <span className="font-medium">{v.version}</span>
        </span>
      ),
    },
    {
      id: "by",
      header: "Changed by",
      className: "hidden text-foreground/80 md:table-cell",
      cell: (v) => v.changedBy,
    },
    {
      id: "run",
      header: "Eval run",
      className: "hidden text-primary-tint tabular-nums md:table-cell",
      cell: (v) => v.run,
    },
    {
      id: "note",
      header: "Note",
      className: "hidden max-w-72 truncate text-foreground/80 xl:table-cell",
      cell: (v) => v.note,
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Directory
        title="Version log"
        leading={<SettingsBack />}
        heading={<SettingsHeading />}
        noun="entries"
        rows={VERSION_LOG}
        columns={columns}
        search={(v) => [v.name, v.version, v.changedBy, v.run, v.note]}
        filters={[
          {
            id: "type",
            label: "Component",
            all: "All components",
            options: CHANGE_TYPES,
            match: (v, value) => v.type === value,
          },
        ]}
        exportName="Version log"
        exportRow={(v) => ({
          Logged: v.loggedAt,
          Component: v.type,
          Name: v.name,
          Previous: v.previous,
          Version: v.version,
          "Changed by": v.changedBy,
          "Eval run": v.run,
          Note: v.note,
        })}
        emptyIllustration="no-results"
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Source expiry and re-review                                                */
/* -------------------------------------------------------------------------- */

const SOURCE_TONE: Record<SourceStatus, "success" | "warning" | "muted"> = {
  Current: "success",
  "Review due": "warning",
  "Re-review": "warning",
  Expired: "muted",
}

export function SourcesPage() {
  const { items } = sources.use()
  const { items: protocolItems } = protocols.use()
  const [editing, setEditing] = React.useState<EvidenceSource | "new" | null>(
    null
  )
  const [flagging, setFlagging] = React.useState<EvidenceSource | null>(null)
  const titleOf = (id: string) =>
    protocolItems.find((p) => p.id === id)?.title ?? id

  function markReviewed(s: EvidenceSource) {
    sources.patch(s.id, {
      reviewedAt: TODAY,
      reviewBy: addDays(TODAY, 365),
      reReview: undefined,
    })
    toast.success(`${s.publisher} source marked reviewed`)
  }

  const columns: Column<EvidenceSource>[] = [
    {
      id: "title",
      header: "Source",
      className: "max-w-96",
      cell: (s) => (
        <div className="flex min-w-0 flex-col">
          {nameLink(s.title, () => setEditing(s))}
          <span className="truncate text-xs text-muted-foreground">
            {s.publisher}
          </span>
        </div>
      ),
      sortValue: (s) => s.title,
    },
    {
      id: "type",
      header: "Type",
      className: "hidden text-foreground/80 md:table-cell",
      cell: (s) => s.type,
    },
    {
      id: "used",
      header: "Used in",
      className: "hidden max-w-60 truncate text-foreground/80 lg:table-cell",
      cell: (s) => s.protocolIds.map(titleOf).join(", "),
    },
    {
      id: "reviewed",
      header: "Last reviewed",
      className: "hidden tabular-nums text-foreground/80 xl:table-cell",
      cell: (s) => shortDate(s.reviewedAt),
      sortValue: (s) => s.reviewedAt,
    },
    {
      id: "review-by",
      header: "Review by",
      className: "tabular-nums",
      cell: (s) => shortDate(s.reviewBy),
      sortValue: (s) => s.reviewBy,
    },
    {
      id: "expires",
      header: "Expires",
      className: "hidden tabular-nums md:table-cell",
      cell: (s) => shortDate(s.expires),
      sortValue: (s) => s.expires,
    },
    {
      id: "status",
      header: "Status",
      cell: (s) => {
        const status = sourceStatus(s)
        return (
          <div className="flex flex-col">
            <StatusDot tone={SOURCE_TONE[status]}>{status}</StatusDot>
            {s.reReview && (
              <span className="pl-3 text-xs text-muted-foreground">
                {s.reReview.reason}
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: "actions",
      header: "",
      className: "w-12 text-right",
      cell: (s) => (
        <RowMenu label={`Actions for ${s.title}`}>
          <DropdownMenuItem onClick={() => setEditing(s)}>
            <IconEdit />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => markReviewed(s)}>
            <IconCheckCircle />
            Mark reviewed
          </DropdownMenuItem>
          {!s.reReview && (
            <DropdownMenuItem onClick={() => setFlagging(s)}>
              <IconRefresh />
              Trigger re-review
            </DropdownMenuItem>
          )}
        </RowMenu>
      ),
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Directory
        title="Evidence sources"
        leading={<SettingsBack />}
        statusTabs={{ options: SOURCE_STATUSES, value: sourceStatus }}
        noun="sources"
        rows={items}
        columns={columns}
        search={(s) => [s.title, s.publisher, s.type]}
        filters={[
          {
            id: "type",
            label: "Type",
            all: "All types",
            options: SOURCE_TYPES,
            match: (s, v) => s.type === v,
          },
        ]}
        primaryAction={{
          label: "Add source",
          icon: <IconAdd />,
          onClick: () => setEditing("new"),
        }}
        exportName="Evidence sources"
        exportRow={(s) => ({
          Source: s.title,
          Publisher: s.publisher,
          Type: s.type,
          "Used in": s.protocolIds.map(titleOf).join(", "),
          "Last reviewed": s.reviewedAt,
          "Review by": s.reviewBy,
          Expires: s.expires,
          Status: sourceStatus(s),
        })}
        emptyIllustration="no-results"
      />
      <SideSheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        wide
      >
        {editing && (
          <SourceForm
            source={editing === "new" ? null : editing}
            count={items.length}
            onClose={() => setEditing(null)}
          />
        )}
      </SideSheet>
      <ReReviewDialog source={flagging} onClose={() => setFlagging(null)} />
    </div>
  )
}

function SourceForm({
  source,
  count,
  onClose,
}: {
  source: EvidenceSource | null
  count: number
  onClose: () => void
}) {
  const { items: protocolItems } = protocols.use()
  const [draft, setDraft] = React.useState({
    title: source?.title ?? "",
    publisher: source?.publisher ?? "",
    type: source?.type ?? "Guideline",
    url: source?.url ?? "",
    protocolIds: source?.protocolIds ?? [],
    reviewedAt: source?.reviewedAt ?? TODAY,
    reviewBy: source?.reviewBy ?? addDays(TODAY, 365),
    expires: source?.expires ?? addDays(TODAY, 730),
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const titleOf = (id: string) =>
    protocolItems.find((p) => p.id === id)?.title ?? id

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!draft.title.trim()) next.title = "Enter the source's title"
    if (!draft.publisher.trim()) next.publisher = "Enter the publisher"
    if (!draft.reviewBy) next.reviewBy = "Pick a review date"
    if (!draft.expires) next.expires = "Pick an expiry date"
    setErrors(next)
    if (Object.keys(next).length) return
    const values = { ...draft, title: draft.title.trim() }
    if (source) {
      sources.patch(source.id, values)
      toast.success("Source saved")
    } else {
      sources.add([
        { ...values, id: `EV${String(count + 1).padStart(3, "0")}` },
      ])
      toast.success("Source added")
    }
    onClose()
  }

  return (
    <>
      <SideSheetHeader
        title={source ? "Edit source" : "Add source"}
        description="The source, where it is used and its review dates."
      />
      <SheetForm id="source-form" onSubmit={submit}>
        <FormSection title="Source">
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-3">
            <TextField
              id="source-title"
              label="Title"
              required
              value={draft.title}
              error={errors.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="sm:col-span-3"
            />
            <TextField
              id="source-publisher"
              label="Publisher"
              required
              value={draft.publisher}
              error={errors.publisher}
              onChange={(e) =>
                setDraft({ ...draft, publisher: e.target.value })
              }
            />
            <SelectField
              id="source-type"
              label="Type"
              options={SOURCE_TYPES}
              value={draft.type}
              onChange={(type) =>
                setDraft({ ...draft, type: type || "Guideline" })
              }
            />
            <TextField
              id="source-url"
              label="Website"
              placeholder="example.org"
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            />
            <MultiSelectDropdownField
              id="source-protocols"
              label="Used in"
              options={protocolItems.map((p) => p.title)}
              value={draft.protocolIds.map(titleOf)}
              placeholder="Select protocols"
              onChange={(titles) =>
                setDraft({
                  ...draft,
                  protocolIds: titles
                    .map((t) => protocolItems.find((p) => p.title === t)?.id)
                    .filter((id): id is string => !!id),
                })
              }
              className="sm:col-span-3"
            />
          </div>
        </FormSection>
        <FormSection title="Review">
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-3">
            <DateField
              id="source-reviewed"
              label="Last reviewed"
              value={draft.reviewedAt}
              max={TODAY}
              onChange={(reviewedAt) => setDraft({ ...draft, reviewedAt })}
            />
            <DateField
              id="source-review-by"
              label="Review by"
              required
              value={draft.reviewBy}
              error={errors.reviewBy}
              onChange={(reviewBy) => setDraft({ ...draft, reviewBy })}
            />
            <DateField
              id="source-expires"
              label="Expires"
              required
              value={draft.expires}
              error={errors.expires}
              onChange={(expires) => setDraft({ ...draft, expires })}
            />
          </div>
        </FormSection>
      </SheetForm>
      <FormFooter
        formId="source-form"
        submitLabel={source ? "Save changes" : "Add source"}
        onCancel={onClose}
      />
    </>
  )
}

/** Flags a source for a new review and names the protocols it affects. */
function ReReviewDialog({
  source,
  onClose,
}: {
  source: EvidenceSource | null
  onClose: () => void
}) {
  const { items: protocolItems } = protocols.use()
  const [reason, setReason] = React.useState<string>(RE_REVIEW_REASONS[0])
  const used = source
    ? protocolItems.filter((p) => source.protocolIds.includes(p.id))
    : []

  return (
    <Dialog open={source !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {source && (
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              sources.patch(source.id, { reReview: { reason, at: TODAY } })
              toast.success(
                used.length
                  ? `Re-review triggered for ${used.length} protocol${used.length > 1 ? "s" : ""}`
                  : "Re-review triggered"
              )
              onClose()
            }}
          >
            <DialogHeader>
              <DialogTitle>Trigger re-review</DialogTitle>
              <DialogDescription className="sr-only">
                Flag this source and the protocols that use it for review.
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm font-medium">{source.title}</p>
            <SelectField
              id="re-review-reason"
              label="Reason"
              options={RE_REVIEW_REASONS}
              value={reason}
              onChange={(r) => setReason(r || RE_REVIEW_REASONS[0])}
            />
            {used.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Protocols to review</span>
                <ul className="flex flex-col gap-1 text-sm text-foreground/85">
                  {used.map((p) => (
                    <li key={p.id}>{p.title}</li>
                  ))}
                </ul>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Trigger re-review</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
