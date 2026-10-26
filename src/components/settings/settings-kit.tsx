"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "@/design-system/ui/sonner"
import { IconArrowLeft, IconChevronRight } from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { SUB_TAB, SUB_TABS_LIST } from "@/components/practice/directory"
import { RECORD_CARD, RecordPage } from "@/components/practice/record-page"
import { Button } from "@/design-system/ui/button"
import { Card, CardContent } from "@/design-system/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/design-system/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/ui/select"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"

/* The Settings module both consoles share, laid out like the Solid EHR and
   Amazing Grace Center settings: a grid of group cards, each listing its
   pages; a page opens with a back arrow, the group's name and its pages as a
   segmented switch, the page's actions on the right, then white cards. */

/* -------------------------------------------------------------------------- */
/*  Registry                                                                   */
/* -------------------------------------------------------------------------- */

/* Each setting carries its status from the settings scope sheet. Only
   settings the client has discussed show for now; widen SHOWN to bring the
   partly agreed and open ones back. */
export type SettingStatus = "Discussed" | "Partly" | "Open"

const SHOWN: SettingStatus[] = ["Discussed"]

/** Whether a setting with this sheet status is on screen. */
export function shown(status: SettingStatus) {
  return SHOWN.includes(status)
}

export type SettingsPage = {
  id: string
  label: string
  /** The sheet's status; Discussed when left out. */
  status?: SettingStatus
  /** A page that already lives elsewhere in the portal opens there. */
  href?: string
  render?: () => React.ReactNode
}

export type SettingsGroup = {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  pages: SettingsPage[]
}

type SettingsScope = {
  base: string
  groups: SettingsGroup[]
  group: SettingsGroup
  page: SettingsPage
}

const ScopeContext = React.createContext<SettingsScope | null>(null)

/** The groups and pages on screen: hidden pages drop out, and a group with
    none left drops out with them. */
function visible(groups: SettingsGroup[]) {
  return groups
    .map((g) => ({
      ...g,
      pages: g.pages.filter((p) => shown(p.status ?? "Discussed")),
    }))
    .filter((g) => g.pages.length > 0)
}

function pageHref(base: string, group: SettingsGroup, page: SettingsPage) {
  return page.href ?? `${base}/${group.id}/${page.id}`
}

/* -------------------------------------------------------------------------- */
/*  Landing                                                                    */
/* -------------------------------------------------------------------------- */

/** The landing grid: one card per group, its pages as chevron rows. */
export function SettingsHome({
  base,
  groups,
  title = "Settings",
}: {
  base: string
  groups: SettingsGroup[]
  title?: string
}) {
  groups = visible(groups)
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-surface-sunken px-4 pt-4 pb-6">
      <h1 className="mb-3 text-lg font-semibold tracking-tight">{title}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {groups.map((group) => (
          <Card key={group.id} className={cn(RECORD_CARD, "min-h-56 gap-2")}>
            <CardContent className="flex flex-col gap-1">
              <div className="mb-2 flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-surface text-primary-tint">
                  <group.icon className="size-4" />
                </span>
                <h2 className="text-[15px] font-semibold">{group.title}</h2>
              </div>
              <nav aria-label={group.title} className="-mx-2 flex flex-col">
                {group.pages.map((page) => (
                  <Link
                    key={page.id}
                    href={pageHref(base, group, page)}
                    className="flex h-8 items-center justify-between rounded-md px-2 text-sm text-foreground/85 transition-colors hover:bg-surface-row-hover hover:text-foreground"
                  >
                    {page.label}
                    <IconChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                ))}
              </nav>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

/** Resolves /settings/[group]/[page] and renders that page in its group. */
export function SettingsRoute({
  base,
  groups,
  groupId,
  pageId,
}: {
  base: string
  groups: SettingsGroup[]
  groupId: string
  pageId: string
}) {
  groups = visible(groups)
  const group = groups.find((g) => g.id === groupId)
  const page = group?.pages.find((p) => p.id === pageId && p.render)
  if (!group || !page?.render)
    return <SettingsHome base={base} groups={groups} />
  return (
    <ScopeContext.Provider value={{ base, groups, group, page }}>
      {page.render()}
    </ScopeContext.Provider>
  )
}

/**
 * A settings page's frame: back to the landing grid, the group's name, its
 * pages as the segmented switch, and the page's own actions on the right.
 */
export function SettingsFrame({
  action,
  fill,
  children,
}: {
  action?: React.ReactNode
  fill?: boolean
  children: React.ReactNode
}) {
  const scope = React.useContext(ScopeContext)
  if (!scope) return null
  const { base, group } = scope
  const tabs = group.pages.length > 1 ? <SettingsTabs /> : null

  return (
    <RecordPage
      title={group.title}
      backHref={base}
      hideTitle={tabs !== null}
      badge={tabs}
      action={action}
      fill={fill}
    >
      {children}
    </RecordPage>
  )
}

/** The page's heading on a page that is one table, sitting on the table's
    own toolbar after SettingsBack: the group's pages as the segmented switch,
    or the group's name when it has one page. */
export function SettingsHeading() {
  const scope = React.useContext(ScopeContext)
  if (!scope) return null
  if (scope.group.pages.length < 2)
    return (
      <h1 className="truncate text-lg font-semibold tracking-tight">
        {scope.group.title}
      </h1>
    )
  return <SettingsTabs />
}

/** The group's pages as the segmented switch. */
export function SettingsTabs() {
  const scope = React.useContext(ScopeContext)
  const router = useRouter()
  if (!scope || scope.group.pages.length < 2) return null
  const { base, group, page } = scope
  return (
    <Tabs
      value={page.id}
      onValueChange={(next) => {
        const target = group.pages.find((p) => p.id === next)
        if (target) router.push(pageHref(base, group, target))
      }}
    >
      <TabsList className={SUB_TABS_LIST}>
        {group.pages.map((p) => (
          <TabsTrigger key={p.id} value={p.id} className={SUB_TAB}>
            {p.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

/** The back arrow alone, for a page that is one table and needs no title
    row: it sits on the table's toolbar. */
export function SettingsBack() {
  const scope = React.useContext(ScopeContext)
  if (!scope) return null
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Back to settings"
      nativeButton={false}
      render={<Link href={scope.base} />}
    >
      <IconArrowLeft className="size-5" />
    </Button>
  )
}

/* -------------------------------------------------------------------------- */
/*  Saved values                                                               */
/* -------------------------------------------------------------------------- */

/* Saved pages live in sessionStorage; each key is read once and cached so
   the snapshot keeps one reference until it is saved again. */
const savedCache = new Map<string, unknown>()
const savedListeners = new Set<() => void>()

function readSaved(key: string): unknown {
  if (!savedCache.has(key)) {
    let value: unknown = undefined
    try {
      const raw = sessionStorage.getItem(`hol-settings:${key}`)
      value = raw ? JSON.parse(raw) : undefined
    } catch {
      // Blocked storage: fall back to the defaults.
    }
    savedCache.set(key, value)
  }
  return savedCache.get(key)
}

function writeSaved(key: string, value: unknown) {
  savedCache.set(key, value)
  try {
    sessionStorage.setItem(`hol-settings:${key}`, JSON.stringify(value))
  } catch {
    // Blocked storage: the change lasts until the page reloads.
  }
  savedListeners.forEach((listener) => listener())
}

function subscribeSaved(listener: () => void) {
  savedListeners.add(listener)
  return () => savedListeners.delete(listener)
}

/**
 * A settings page's values: a draft the page edits, the saved copy kept for
 * the session, and the Save and Discard actions for the frame.
 */
export function useSettings<T>(key: string, initial: T) {
  const [fallback] = React.useState(initial)
  const saved = React.useSyncExternalStore(
    subscribeSaved,
    () => (readSaved(key) as T | undefined) ?? fallback,
    () => fallback
  )
  /* Null while the page shows exactly what is saved. */
  const [edits, setEdits] = React.useState<T | null>(null)
  const draft = edits ?? saved
  const dirty =
    edits !== null && JSON.stringify(saved) !== JSON.stringify(edits)

  function setDraft(next: T) {
    setEdits(next)
  }

  function patch(changes: Partial<T>) {
    setEdits((current) => ({ ...(current ?? saved), ...changes }))
  }

  function save() {
    writeSaved(key, draft)
    setEdits(null)
    toast.success("Settings saved")
  }

  function discard() {
    setEdits(null)
  }

  const actions = (
    <div className="flex items-center gap-2">
      {dirty && (
        <Button variant="outline" size="sm" onClick={discard}>
          Discard
        </Button>
      )}
      <Button size="sm" disabled={!dirty} onClick={save}>
        Save
      </Button>
    </div>
  )

  return { draft, setDraft, patch, dirty, save, discard, actions }
}

/* -------------------------------------------------------------------------- */
/*  Blocks                                                                     */
/* -------------------------------------------------------------------------- */

/** A heading on the canvas, then its card, as the notification settings do. */
export function SettingsSection({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** One white card holding a table with the grey head row. */
export function SettingsTable({
  columns,
  children,
  className,
  equal,
}: {
  columns: { header: string; className?: string }[]
  children: React.ReactNode
  className?: string
  /** Columns without a width share the row equally. */
  equal?: boolean
}) {
  return (
    <Card
      className={cn(
        "min-w-0 gap-0 overflow-hidden rounded-md border py-0 shadow-[0_0_5px_rgb(0_0_0/0.06)] ring-0",
        className
      )}
    >
      <Table className={cn(equal && "table-fixed")}>
        <TableHeader className="bg-surface-head [&_th]:h-9 [&_th]:px-4 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground">
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead key={column.header} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="[&_td]:h-12 [&_td]:px-4 [&_td]:py-2">
          {children}
        </TableBody>
      </Table>
    </Card>
  )
}

/** A card of single values: the setting's name on the left, its control on
    the right, one hairline between rows. */
export function ValueCard({ children }: { children: React.ReactNode }) {
  return (
    <Card
      className={cn(
        "min-w-0 gap-0 rounded-md border py-0 shadow-[0_0_5px_rgb(0_0_0/0.06)] ring-0"
      )}
    >
      <div className="divide-y">{children}</div>
    </Card>
  )
}

export function ValueRow({
  label,
  meta,
  children,
}: {
  label: string
  /** A short muted qualifier after the name, e.g. "Inlay admin only". */
  meta?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="text-sm font-medium">{label}</span>
        {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  )
}

/** A whole number with its unit after it, e.g. "5 questions". */
export function NumberInput({
  value,
  onChange,
  unit,
  prefix,
  label,
  min = 0,
  className,
}: {
  value: number
  onChange: (value: number) => void
  unit?: string
  prefix?: string
  label: string
  min?: number
  className?: string
}) {
  return (
    <InputGroup className={cn("w-40", className)}>
      {prefix && (
        <InputGroupAddon>
          <InputGroupText>{prefix}</InputGroupText>
        </InputGroupAddon>
      )}
      <InputGroupInput
        type="number"
        inputMode="numeric"
        min={min}
        aria-label={label}
        value={Number.isFinite(value) ? value : ""}
        onChange={(event) => onChange(Number(event.target.value))}
        className="tabular-nums"
      />
      {unit && (
        <InputGroupAddon align="inline-end">
          <InputGroupText>{unit}</InputGroupText>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}

/** A status as a coloured dot and a word, for the lists. */
export function StatusDot({
  tone,
  children,
}: {
  tone: "success" | "warning" | "muted"
  children: React.ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          tone === "success" && "bg-success",
          tone === "warning" && "bg-warning",
          tone === "muted" && "bg-muted-foreground/50"
        )}
      />
      {children}
    </span>
  )
}

/** A compact select for a value row or a table cell; the row names it. */
export function ChoiceSelect({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: string
  onChange: (value: string) => void
  options: readonly string[]
  label: string
  className?: string
}) {
  const items = options.map((option) => ({ label: option, value: option }))
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next: string | null) => next && onChange(next)}
    >
      <SelectTrigger aria-label={label} className={cn("w-40", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
