"use client"

import * as React from "react"
import { flushSync } from "react-dom"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/design-system/ui/sonner"
import {
  IconAdd,
  IconArrowLeft,
  IconCalendar,
  IconClose,
  IconChevronDown,
  IconChevronUp,
  IconFileText,
  IconHome,
  IconFileList,
  IconLab,
  IconLanguage,
  IconLocation,
  IconMail,
  IconPhone,
  IconPrint,
  IconRefresh,
  IconSparkles,
  IconStethoscope,
  IconUserCircle,
  IconClock,
  IconDownload,
  IconEye,
  IconShieldCheck,
  IconClipboard,
  IconPill,
  IconShieldAlert,
  IconHeartPulse,
  IconImage,
  IconInjection,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { createCollection, today } from "@/components/practice/collection-store"
import {
  type HealthRecord,
  NIGHTLY_SYNC,
  type RecordState,
  builtRecordFor,
  healthRecordFor,
  recordSyncs,
} from "@/components/practice/health-record"
import { RecommendPlanDialog } from "@/components/practice/health-record-view"
import { chartEntries, withEntries } from "@/components/provider/chart-entries"
import { consentFileName, consentPdf } from "@/components/provider/consent-pdf"
import {
  PatientActions,
  PatientDetails,
} from "@/components/practice/patient-record"
import {
  type Patient,
  ageFrom,
  fullName,
  personAddress,
  sendPatientInvites,
  usDate,
} from "@/components/practice/practice-data"
import { avatarTone } from "@/components/practice/directory"
import {
  ChartDashboard,
  ChartOverview,
  type OverviewTab,
} from "@/components/provider/chart-dashboard"
import {
  DocumentsView,
  EncountersView,
  LabsView,
  StudiesView,
} from "@/components/provider/chart-views"
import {
  AllergiesView,
  DiagnosesView,
  MedicationsView,
  VaccinesView,
  VitalsView,
} from "@/components/provider/chart-records"
import {
  Section,
  SectionBar,
  SectionBody,
} from "@/components/provider/chart-layout"
import { DetailGrid } from "@/components/practice/record-page"
import { Avatar, AvatarFallback, AvatarImage } from "@/design-system/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/ui/dialog"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/design-system/ui/empty"
import { Input } from "@/design-system/ui/input"
import { Spinner } from "@/design-system/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system/ui/tooltip"
import { Illustration } from "@/components/illustrations/illustration"

/* The provider's patient chart, laid out like the Solid EHR "Patient
   Charting" frames: a patient banner that collapses, a chart nav on the left
   and the section on the right. Every clinical value comes from Health
   Gorilla once the patient has consented in the app; the chart reads it and
   never edits it. The provider can pull a fresh copy at any time with
   Sync now, on top of the nightly refresh. */

export type ChartSection =
  | "dashboard"
  | "overview"
  | "encounters"
  | "diagnoses"
  | "medications"
  | "allergies"
  | "vitals"
  | "labs"
  | "imaging"
  | "vaccines"
  | "documents"
  | "profile"

/* One section per kind of record in the Health Gorilla feed (the EHR data
   sheet): Encounter, Condition, MedicationStatement, AllergyIntolerance,
   Observation (vitals, labs), DiagnosticReport (lab, imaging, pathology),
   Procedure, Immunization, DocumentReference, and Patient for the profile. */
const SECTIONS: {
  id: ChartSection
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: "dashboard", label: "Dashboard", icon: IconHome },
  { id: "overview", label: "Overview", icon: IconFileList },
  { id: "encounters", label: "Encounters", icon: IconStethoscope },
  { id: "diagnoses", label: "Diagnoses", icon: IconClipboard },
  { id: "medications", label: "Medications", icon: IconPill },
  { id: "allergies", label: "Allergies", icon: IconShieldAlert },
  { id: "vitals", label: "Vitals", icon: IconHeartPulse },
  { id: "labs", label: "Lab results", icon: IconLab },
  { id: "imaging", label: "Imaging", icon: IconImage },
  { id: "vaccines", label: "Vaccines", icon: IconInjection },
  { id: "documents", label: "Documents", icon: IconFileText },
  { id: "profile", label: "Profile", icon: IconUserCircle },
]

/* -------------------------------------------------------------------------- */
/*  URL state                                                                  */
/* -------------------------------------------------------------------------- */

/* Section, tab and the open item live in the URL, so a reload or a shared
   link lands on the same place in the chart. */
export function useChartParams() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const asked = params.get("section") as ChartSection | null
  const section: ChartSection = SECTIONS.some((s) => s.id === asked)
    ? asked!
    : "dashboard"

  const go = React.useCallback(
    (next: { section?: ChartSection; tab?: string; item?: string }) => {
      const query = new URLSearchParams()
      const s = next.section ?? section
      if (s !== "dashboard") query.set("section", s)
      if (next.tab) query.set("tab", next.tab)
      if (next.item) query.set("item", next.item)
      const qs = query.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, section]
  )

  return {
    section,
    tab: params.get("tab") ?? "",
    item: params.get("item") ?? "",
    go,
  }
}

/* -------------------------------------------------------------------------- */
/*  Sync                                                                       */
/* -------------------------------------------------------------------------- */

const SYNC_MS = 2200

function nowLocal() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${today()}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "09/28/2026, 3:04 PM" from a local "2026-09-28T15:04". */
export function dateTime(at: string) {
  if (!at) return ""
  const [date, time = "00:00"] = at.split("T")
  const [h, m] = time.split(":").map(Number)
  const hour = h % 12 || 12
  return `${usDate(date)}, ${hour}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`
}

/**
 * The chart's record and its sync. Before consent there is nothing to pull.
 * After consent the record starts from its nightly state; a sync by hand
 * finishes a record that was still building or had failed at a source.
 */
export function useChartRecord(patient: Patient) {
  const { items } = recordSyncs.use()
  const saved = items.find((s) => s.id === patient.id)
  const base = React.useMemo(() => healthRecordFor(patient), [patient])
  const state: RecordState =
    base.state === "Awaiting consent"
      ? base.state
      : (saved?.state ?? base.state)
  const { items: entries } = chartEntries.use()
  /* The synced record, with anything the practice entered by hand on top. */
  const record: HealthRecord = React.useMemo(
    () =>
      withEntries(
        state === base.state ? base : builtRecordFor(patient),
        entries
      ),
    [base, entries, patient, state]
  )
  const syncedAt =
    state === "Awaiting consent"
      ? ""
      : (saved?.at ?? (base.lastSync ? `${base.lastSync}T${NIGHTLY_SYNC}` : ""))

  const [syncing, setSyncing] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  React.useEffect(() => () => clearTimeout(timer.current), [])

  const sync = React.useCallback(() => {
    if (state === "Awaiting consent" || syncing) return
    setSyncing(true)
    timer.current = setTimeout(() => {
      const built = builtRecordFor(patient)
      const entry = { id: patient.id, at: nowLocal(), state: built.state }
      if (recordSyncs.get().some((s) => s.id === patient.id))
        recordSyncs.patch(patient.id, entry)
      else recordSyncs.add([entry])
      setSyncing(false)
      const sources = built.sourceIds.length
      toast.success(state === "Active" ? "Record synced" : "Record ready", {
        description:
          state === "Active"
            ? `Checked ${sources} sources through Health Gorilla. Nothing new since the last sync.`
            : `All ${sources} sources reported: ${built.encounters.length} encounters, ${built.labReports.length} lab reports and ${built.documents.length} documents.`,
      })
    }, SYNC_MS)
  }, [patient, state, syncing])

  return { record, state, syncedAt, syncing, sync }
}

/* -------------------------------------------------------------------------- */
/*  Chart                                                                      */
/* -------------------------------------------------------------------------- */

export function PatientChart({ patient }: { patient: Patient }) {
  const { section, tab, item, go } = useChartParams()
  const chart = useChartRecord(patient)
  const [recommending, setRecommending] = React.useState(false)
  const [consentOpen, setConsentOpen] = React.useState(false)
  /* Folded to one line on every section; the chevron opens or folds it for
     all sections at once, so moving between sections keeps its state. */
  const [collapsed, setCollapsed] = React.useState(true)

  /* The banner and the chart fill the window; each section scrolls inside
     the chart. On a short window the page scrolls instead of crushing it. */
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-surface-sunken px-4 pt-3 pb-4 print:overflow-visible print:bg-card">
      <ChartHeader
        patient={patient}
        chart={chart}
        collapsed={collapsed}
        onToggle={() => morph(() => setCollapsed(!collapsed))}
        onRecommend={() => setRecommending(true)}
        onConsent={() => setConsentOpen(true)}
      />

      <div className="flex min-h-[420px] flex-1 overflow-hidden rounded-lg bg-card shadow-[0_0_5px_rgb(0_0_0/0.06)] [view-transition-name:chart-body] max-md:flex-col print:overflow-visible">
        <ChartNav active={section} onSelect={(s) => go({ section: s })} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {section === "profile" ? (
            <ProfileSection patient={patient} />
          ) : chart.state !== "Active" ? (
            <RecordNotReady patient={patient} chart={chart} />
          ) : section === "dashboard" ? (
            <ChartDashboard
              patient={patient}
              record={chart.record}
              onOpen={(s, i, t) => go({ section: s, item: i, tab: t })}
            />
          ) : section === "overview" ? (
            <ChartOverview
              record={chart.record}
              tab={(tab as OverviewTab) || "face-sheet"}
              onTab={(t) => go({ tab: t === "face-sheet" ? "" : t })}
              onOpen={(s, i, t) => go({ section: s, item: i, tab: t })}
            />
          ) : section === "encounters" ? (
            <EncountersView
              patient={patient}
              record={chart.record}
              selected={item}
              onSelect={(i) => go({ item: i })}
            />
          ) : section === "labs" ? (
            <LabsView
              patient={patient}
              record={chart.record}
              selected={item}
              onSelect={(i) => go({ item: i })}
            />
          ) : section === "diagnoses" ? (
            <DiagnosesView record={chart.record} />
          ) : section === "medications" ? (
            <MedicationsView
              record={chart.record}
              tab={tab === "past" ? "past" : "active"}
              onTab={(t) => go({ tab: t === "active" ? "" : t })}
            />
          ) : section === "allergies" ? (
            <AllergiesView record={chart.record} />
          ) : section === "vitals" ? (
            <VitalsView
              record={chart.record}
              tab={tab === "table" || tab === "trends" ? tab : "cards"}
              onTab={(t) => go({ tab: t === "cards" ? "" : t, item })}
              selected={item}
              onSelect={(i) => go({ tab: "trends", item: i })}
            />
          ) : section === "imaging" ? (
            <StudiesView
              patient={patient}
              record={chart.record}
              selected={item}
              onSelect={(i) => go({ item: i })}
            />
          ) : section === "vaccines" ? (
            <VaccinesView patient={patient} record={chart.record} />
          ) : (
            <DocumentsView
              patient={patient}
              record={chart.record}
              selected={item}
              onSelect={(i) => go({ item: i })}
            />
          )}
        </div>
      </div>

      <RecommendPlanDialog
        patient={patient}
        record={chart.record}
        open={recommending}
        onOpenChange={setRecommending}
      />
      <ConsentDialog
        patient={patient}
        chart={chart}
        open={consentOpen}
        onOpenChange={setConsentOpen}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Header                                                                     */
/* -------------------------------------------------------------------------- */

type Chart = ReturnType<typeof useChartRecord>

/* Folding the banner swaps its layout, so the browser morphs the old frame
   into the new one; the named parts (see globals.css) glide on their own. */
function morph(update: () => void) {
  if (
    !document.startViewTransition ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return update()
  document.startViewTransition(() => flushSync(update))
}

function initials(p: Patient) {
  return `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`.toUpperCase()
}

/* The patient 360 banner. Open, its details sit on three rows so the card
   is as tall as the three action buttons beside it; folded, it is one line. */
function ChartHeader({
  patient: p,
  chart,
  collapsed,
  onToggle,
  onRecommend,
  onConsent,
}: {
  patient: Patient
  chart: Chart
  collapsed: boolean
  onToggle: () => void
  onRecommend: () => void
  onConsent: () => void
}) {
  const { record, state } = chart
  const conditionTags = React.useMemo(
    () => [
      ...new Set(
        record.conditions
          .filter((c) => c.status === "Active")
          .map((c) => c.tag ?? c.name)
      ),
    ],
    [record]
  )
  const { items: saved } = patientTags.use()
  const tags = saved.find((t) => t.id === p.id)?.tags ?? conditionTags
  const [tagsOpen, setTagsOpen] = React.useState(false)
  /* Folded, the action buttons fill the card as squares with larger icons;
     open, they stay small and stacked. */
  const iconFill = collapsed ? "aspect-square h-auto w-auto" : undefined
  const age = p.dob ? `${usDate(p.dob)} (${ageFrom(p.dob)} yrs)` : ""

  return (
    <div className="relative z-10 flex shrink-0 items-stretch gap-3 print:hidden">
      <div
        className={cn(
          "relative flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-3 rounded-lg bg-card shadow-[0_0_5px_rgb(0_0_0/0.06)] [view-transition-name:chart-banner]",
          collapsed ? "px-3 py-2" : "p-3"
        )}
      >
        {/* The avatar is exactly as tall as the text beside it: the 24px name
            row plus the details (one 19.5px row folded, two open) and the
            gap between them. Fixed sizes, not a stretch, since a stretched
            avatar widens, squeezes the text into more lines and grows again. */}
        <div
          className={cn(
            "flex min-w-0 items-center",
            collapsed ? "gap-3" : "gap-5"
          )}
        >
          <Avatar
            className={cn(
              "shrink-0 [view-transition-name:chart-avatar] after:hidden",
              collapsed ? "size-12" : "size-[77px]"
            )}
          >
            {p.photo && <AvatarImage src={p.photo} alt="" />}
            <AvatarFallback
              className={cn(
                "font-medium",
                avatarTone(fullName(p)),
                collapsed ? "text-xs" : "text-lg"
              )}
            >
              {initials(p)}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              "flex min-w-0 flex-col",
              collapsed ? "gap-1" : "gap-2"
            )}
          >
            <div className="flex flex-wrap items-center gap-2 [view-transition-name:chart-name]">
              <h1 className="text-base font-semibold">
                {fullName(p)} ({p.id})
              </h1>
              {tags.slice(0, 3).map((t) => (
                <TagChip
                  key={t}
                  tag={t}
                  condition={conditionTags.includes(t)}
                />
              ))}
              {tags.length > 3 && (
                <Badge variant="outline" title={tags.slice(3).join(", ")}>
                  +{tags.length - 3}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setTagsOpen(true)}
                className="text-primary-tint hover:text-primary-tint"
              >
                <IconAdd />
                {tags.length ? "Add" : "Add tag"}
              </Button>
            </div>
            {collapsed ? (
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-foreground/80">
                <Meta icon={IconCalendar}>{age}</Meta>
                <Meta icon={IconPhone}>{p.phone}</Meta>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 text-[13px] text-foreground/80 sm:grid-cols-[auto_auto_minmax(0,1fr)]">
                <Meta icon={IconCalendar}>{age}</Meta>
                <Meta icon={IconPhone}>{p.phone}</Meta>
                <Meta icon={IconMail}>{p.noEmail ? "No email" : p.email}</Meta>
                <Meta icon={IconLanguage}>
                  {p.languages.join(", ") || "Not provided"}
                </Meta>
                <Meta icon={IconClock}>{p.timeZone || "Not provided"}</Meta>
                <Meta icon={IconLocation} title={personAddress(p)}>
                  {personAddress(p) || "Not provided"}
                </Meta>
              </div>
            )}
          </div>
        </div>

        <SyncPanel chart={chart} collapsed={collapsed} />
      </div>

      <div
        className={cn(
          "flex shrink-0 justify-center rounded-lg bg-card shadow-[0_0_5px_rgb(0_0_0/0.06)] [view-transition-name:chart-actions] max-sm:hidden",
          collapsed
            ? "flex-row items-stretch gap-2 p-2"
            : "flex-col items-center gap-1.5 px-2.5 py-2"
        )}
      >
        <HeaderIcon
          label="Recommend plan"
          className={iconFill}
          large={collapsed}
          icon={IconSparkles}
          disabled={state !== "Active"}
          onClick={onRecommend}
        />
        <HeaderIcon
          label="Print chart"
          className={iconFill}
          large={collapsed}
          icon={IconPrint}
          disabled={state !== "Active"}
          onClick={() => window.print()}
        />
        <HeaderIcon
          label="Record consent"
          className={iconFill}
          large={collapsed}
          icon={IconShieldCheck}
          onClick={onConsent}
        />
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Show patient details" : "Hide patient details"}
        aria-expanded={!collapsed}
        className="absolute -bottom-4 left-1/2 z-20 flex h-4 w-12 -translate-x-1/2 items-center justify-center rounded-b-md border border-t-0 bg-card text-muted-foreground shadow-[0_2px_3px_rgb(0_0_0/0.05)] [view-transition-name:chart-toggle] hover:text-foreground"
      >
        {collapsed ? (
          <IconChevronDown className="size-4" />
        ) : (
          <IconChevronUp className="size-4" />
        )}
      </button>

      <TagsDialog
        key={tagsOpen ? "open" : "closed"}
        open={tagsOpen}
        onOpenChange={setTagsOpen}
        tags={tags}
        conditionTags={conditionTags}
        onSave={(next) => {
          if (patientTags.get().some((t) => t.id === p.id))
            patientTags.patch(p.id, { tags: next })
          else patientTags.add([{ id: p.id, tags: next }])
          setTagsOpen(false)
          toast.success("Tags updated")
        }}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Tags                                                                       */
/* -------------------------------------------------------------------------- */

/* The banner's tags start from the active conditions in the record; once the
   provider changes them they keep their own list per patient. Tags are the
   provider's labels, so editing them never touches the record itself. */
const patientTags = createCollection<{ id: string; tags: string[] }>(
  "hol-patient-tags",
  [],
  "v1"
)

const PRESET_TAGS = [
  "New patient",
  "Follow up",
  "Needs labs",
  "High risk",
  "Weight loss",
  "Hormone therapy",
  "VIP",
]

function TagChip({
  tag,
  condition,
  onRemove,
}: {
  tag: string
  condition: boolean
  onRemove?: () => void
}) {
  return (
    <Badge
      variant={condition ? "destructive" : "info"}
      className={cn(onRemove && "h-6 gap-0.5 pr-0")}
    >
      {tag}
      {onRemove && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          aria-label={`Remove ${tag}`}
          className="size-6 text-current opacity-60 hover:bg-transparent hover:text-current hover:opacity-100"
        >
          <IconClose />
        </Button>
      )}
    </Badge>
  )
}

function TagsDialog({
  open,
  onOpenChange,
  tags,
  conditionTags,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tags: string[]
  conditionTags: string[]
  onSave: (tags: string[]) => void
}) {
  const [draft, setDraft] = React.useState(tags)
  const [text, setText] = React.useState("")
  const query = text.trim().toLowerCase()
  const has = (t: string) =>
    draft.some((d) => d.toLowerCase() === t.toLowerCase())
  const suggestions = [...new Set([...conditionTags, ...PRESET_TAGS])].filter(
    (t) => !has(t) && (!query || t.toLowerCase().includes(query))
  )

  function add(tag: string) {
    const clean = tag.trim().replace(/\s+/g, " ")
    if (!clean || has(clean)) return
    setDraft((d) => [...d, clean])
    setText("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Patient tags</DialogTitle>
          <DialogDescription className="sr-only">
            Add or remove the tags shown on the patient banner.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Added</span>
          {draft.length ? (
            <div className="flex flex-wrap gap-2">
              {draft.map((t) => (
                <TagChip
                  key={t}
                  tag={t}
                  condition={conditionTags.includes(t)}
                  onRemove={() => setDraft((d) => d.filter((x) => x !== t))}
                />
              ))}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">No tags</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="tag-input" className="text-sm font-medium">
            Add tag
          </label>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              add(text)
            }}
          >
            <Input
              id="tag-input"
              value={text}
              maxLength={32}
              autoComplete="off"
              placeholder="Search or type a custom tag"
              onChange={(e) => setText(e.target.value)}
            />
            <Button
              type="submit"
              variant="outline"
              disabled={!query || has(text.trim())}
            >
              <IconAdd />
              Add
            </Button>
          </form>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {suggestions.map((t) => (
                <Badge
                  key={t}
                  variant="outline"
                  render={<button type="button" onClick={() => add(t)} />}
                  className="h-6 cursor-pointer hover:bg-surface-hover"
                >
                  <IconAdd />
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSave(draft)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Meta({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title?: string
  children: React.ReactNode
}) {
  return (
    <span className="flex min-w-0 items-center gap-1.5" title={title}>
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{children}</span>
    </span>
  )
}

/* Where the record stands with Health Gorilla, and the one button that
   pulls a fresh copy. It sits on the banner's right edge. */
function SyncPanel({ chart, collapsed }: { chart: Chart; collapsed: boolean }) {
  const { record, state, syncedAt, syncing, sync } = chart
  const waiting = state === "Awaiting consent"
  const status = syncing
    ? "Syncing now"
    : waiting
      ? "Waiting for consent"
      : dateTime(syncedAt)
  const detail =
    state === "Active"
      ? `${record.sourceIds.length} sources connected`
      : state === "Building"
        ? "Record still building"
        : state === "Source exception"
          ? "Last sync failed at a source"
          : "Nothing pulled yet"

  const button = (
    <Button
      variant="outline"
      size="sm"
      disabled={waiting || syncing}
      onClick={sync}
      className={cn(
        "w-[116px] justify-center border-primary/40 bg-card text-primary-tint hover:text-primary-tint",
        state === "Source exception" &&
          "border-destructive/40 text-destructive hover:text-destructive"
      )}
    >
      {syncing ? <Spinner /> : <IconRefresh />}
      {syncing
        ? "Syncing"
        : state === "Source exception"
          ? "Retry sync"
          : "Sync now"}
    </Button>
  )

  return (
    <div
      className={cn(
        "ml-auto flex shrink-0 rounded-md border border-primary/30 bg-primary-surface [view-transition-name:chart-sync] max-lg:ml-0",
        collapsed
          ? "flex-row items-center gap-4 py-1.5 pr-1.5 pl-3"
          : "flex-row items-center gap-5 self-stretch py-2 pr-3 pl-3"
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span
          className={cn(
            "flex items-center gap-1.5 font-semibold text-foreground",
            collapsed ? "text-[13px]" : "text-sm"
          )}
        >
          <span
            aria-hidden
            className={cn(
              "size-2 shrink-0 rounded-full",
              syncing
                ? "animate-pulse bg-primary"
                : state === "Active"
                  ? "bg-success"
                  : state === "Source exception"
                    ? "bg-destructive"
                    : "bg-muted-foreground/60"
            )}
          />
          Health Gorilla sync
        </span>
        <span className="truncate text-[13px] text-foreground/80">
          {status}
        </span>
        {!collapsed && (
          <span className="truncate text-xs text-muted-foreground">
            {detail}
          </span>
        )}
      </div>
      {waiting ? (
        <Tooltip>
          <TooltipTrigger render={<span tabIndex={0} />}>
            {button}
          </TooltipTrigger>
          <TooltipContent>Available once the patient consents</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
    </div>
  )
}

function HeaderIcon({
  label,
  icon: Icon,
  onClick,
  disabled,
  className,
  large,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick?: () => void
  disabled?: boolean
  className?: string
  large?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={cn(
              "size-7 border-primary/60 text-primary-tint",
              className
            )}
          />
        }
      >
        <Icon className={large ? "size-6!" : "size-4!"} />
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  )
}

/* The consent that lets HOL pull the record: what the patient agreed to in
   the app, and what it covers. */
function ConsentDialog({
  patient: p,
  chart,
  open,
  onOpenChange,
}: {
  patient: Patient
  chart: Chart
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const waiting = chart.state === "Awaiting consent"
  const withdrawn = p.status === "Consent withdrawn"
  // The signed form, shown in the dialog or saved.
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null)
  const pdf = () => URL.createObjectURL(consentPdf(p, withdrawn))
  const view = () => setPdfUrl(pdf())
  const back = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setPdfUrl(null)
  }
  const download = () => {
    const url = pdf()
    const a = document.createElement("a")
    a.href = url
    a.download = consentFileName(p)
    a.click()
    URL.revokeObjectURL(url)
  }
  const viewing = pdfUrl !== null
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) back()
        onOpenChange(next)
      }}
    >
      <DialogContent
        className={cn(
          "sm:max-w-lg",
          viewing && "h-[88vh] grid-rows-[auto_1fr_auto] sm:max-w-4xl"
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Record consent
            <Badge
              variant={
                withdrawn ? "destructive" : waiting ? "outline" : "success"
              }
            >
              {withdrawn ? "Withdrawn" : waiting ? "Not given" : "Active"}
            </Badge>
          </DialogTitle>
          <DialogDescription className="sr-only">
            The consent that lets HOL pull this patient&apos;s records.
          </DialogDescription>
        </DialogHeader>
        {pdfUrl ? (
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
            title="Record consent form"
            className="size-full min-h-0 rounded-lg border bg-surface-sunken"
          />
        ) : (
          <DetailGrid
            className="grid-cols-2"
            items={[
              {
                label: "Given on",
                value: waiting ? "" : usDate(p.invitedAt),
              },
              { label: "Given in", value: waiting ? "" : "HOL patient app" },
              { label: "Retrieved through", value: "Health Gorilla" },
              { label: "Valid", value: "Until the patient withdraws it" },
              {
                label: "Covers",
                value:
                  "Records from hospitals, clinics, labs and imaging centers on Carequality, CommonWell, eHealth Exchange and the lab networks, pulled read only.",
                wide: true,
              },
            ]}
          />
        )}
        <DialogFooter>
          {!waiting && (
            <div className="flex gap-3 sm:mr-auto">
              {viewing ? (
                <Button variant="outline" onClick={back}>
                  <IconArrowLeft />
                  Back
                </Button>
              ) : (
                <Button variant="outline" onClick={view}>
                  <IconEye />
                  View PDF
                </Button>
              )}
              <Button variant="outline" onClick={download}>
                <IconDownload />
                Download
              </Button>
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => {
              back()
              onOpenChange(false)
            }}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/*  Nav                                                                        */
/* -------------------------------------------------------------------------- */

function ChartNav({
  active,
  onSelect,
}: {
  active: ChartSection
  onSelect: (section: ChartSection) => void
}) {
  return (
    <nav
      aria-label="Patient chart"
      className="flex shrink-0 gap-0.5 border-border py-2 max-md:overflow-x-auto max-md:border-b md:w-[160px] md:flex-col md:overflow-y-auto md:border-r print:hidden"
    >
      {SECTIONS.map((s) => {
        const on = s.id === active
        return (
          <button
            key={s.id}
            type="button"
            aria-current={on ? "page" : undefined}
            onClick={() => onSelect(s.id)}
            className={cn(
              "relative flex h-10 shrink-0 items-center gap-2 px-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground",
              on &&
                "bg-primary-surface font-medium text-primary hover:bg-primary-surface hover:text-primary dark:text-primary-tint"
            )}
          >
            <s.icon className="size-5 shrink-0" />
            <span className="whitespace-nowrap">{s.label}</span>
            {on && (
              <span className="absolute inset-y-0 right-0 w-0.5 bg-primary max-md:inset-x-0 max-md:top-auto max-md:h-0.5 max-md:w-auto" />
            )}
          </button>
        )
      })}
    </nav>
  )
}

/* -------------------------------------------------------------------------- */
/*  Profile                                                                    */
/* -------------------------------------------------------------------------- */

function ProfileSection({ patient }: { patient: Patient }) {
  return (
    <Section>
      <SectionBar
        title="Profile info"
        actions={<PatientActions patient={patient} />}
      />
      <SectionBody className="flex flex-col gap-4 *:shrink-0">
        <PatientDetails patient={patient} />
      </SectionBody>
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Before the record is ready                                                 */
/* -------------------------------------------------------------------------- */

function RecordNotReady({
  patient,
  chart,
}: {
  patient: Patient
  chart: Chart
}) {
  const { state, record, syncing, sync } = chart
  const content =
    state === "Awaiting consent"
      ? {
          art: "consent-pending" as const,
          title: "No record yet",
          text:
            patient.status === "Consent withdrawn"
              ? `${patient.firstName} withdrew consent. Nothing new is pulled from Health Gorilla.`
              : `The chart fills in once ${patient.firstName} consents in the HOL app and Health Gorilla returns the record.`,
        }
      : state === "Building"
        ? {
            art: "record-syncing" as const,
            title: "Building the record",
            text: "Health Gorilla is still collecting from the connected sources. Results appear as each one reports in.",
          }
        : {
            art: "sync-failed" as const,
            title: "Sync failed",
            text: record.exception ?? "",
          }

  return (
    <Empty className="flex-1 py-16">
      <EmptyHeader>
        <EmptyMedia>
          <Illustration name={content.art} />
        </EmptyMedia>
        <EmptyTitle>{content.title}</EmptyTitle>
        <EmptyDescription>{content.text}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {state === "Awaiting consent" ? (
          patient.status === "Not invited" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                sendPatientInvites([patient.id])
                toast.success("Invite sent", {
                  description: `${fullName(patient)} will get an email to join the HOL app.`,
                })
              }}
            >
              <IconMail />
              Send invite
            </Button>
          )
        ) : (
          <Button variant="outline" size="sm" disabled={syncing} onClick={sync}>
            {syncing ? <Spinner /> : <IconRefresh />}
            {syncing
              ? "Syncing"
              : state === "Building"
                ? "Sync now"
                : "Retry sync"}
          </Button>
        )}
      </EmptyContent>
    </Empty>
  )
}
