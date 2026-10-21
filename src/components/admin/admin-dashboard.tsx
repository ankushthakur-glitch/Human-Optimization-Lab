"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { AdminShell } from "@/components/admin/admin-shell"
import {
  EnrolmentFunnel,
  InviteTrend,
  PatientStatus,
  PracticeGrowth,
  StatTiles,
} from "@/components/admin/dashboard-charts"
import {
  holAverages,
  practiceKpis,
} from "@/components/admin/adoption-kpis"
import {
  DateRangeFilter,
  PRESETS,
  labelOf,
  periodOf,
  type RangeValue,
} from "@/components/admin/date-range-filter"
import {
  type Adoption,
  adoptionInPeriod,
  combineAdoption,
  usePlatformAdoption,
} from "@/components/admin/practice-adoption"
import {
  HEAD,
  NothingYet,
  RateCell,
  TableCard,
} from "@/components/admin/practice-adoption-view"
import { REGIONS, usePractices } from "@/components/admin/practices-store"
import { type MapRegion, UsRegionMap } from "@/components/admin/us-region-map"
import { Button } from "@/design-system/ui/button"
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"

/* The HOL admin's view across every practice: adoption nationwide or for one
   region, and which regions (or, inside a region, which practices) trail the
   HOL average. The scope lives in ?region= and the period in ?range= (or
   ?from= and ?to= for a custom one) so a view can be shared. */

const ALL = "all"

const SCOPES = [
  { label: "All regions", value: ALL },
  ...REGIONS.map((region) => ({ label: region, value: region })),
]

const DAY = /^\d{4}-\d{2}-\d{2}$/

/** The period in the URL, falling back to all time. */
function rangeFrom(params: URLSearchParams): RangeValue {
  const from = params.get("from")
  const to = params.get("to")
  if (from && to && DAY.test(from) && DAY.test(to) && from <= to)
    return { preset: "custom", from, to }
  const preset = PRESETS.find((p) => p.value === params.get("range"))
  return { preset: preset?.value ?? "all" }
}

type Row = {
  key: string
  name: string
  href?: string
  practices?: number
  adoption: Adoption
}

export function AdminDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requested = searchParams.get("region") ?? ALL
  const scope = SCOPES.some((s) => s.value === requested) ? requested : ALL

  const range = rangeFrom(searchParams)
  const period = periodOf(range)
  const { from, to } = period
  /* Presets read in sentence case after a comma; custom days as they are. */
  const rangeLabel = labelOf(range)
  const periodLabel =
    range.preset === "custom"
      ? rangeLabel
      : rangeLabel.charAt(0).toLowerCase() + rangeLabel.slice(1)

  const { practices } = usePractices()
  const allTime = usePlatformAdoption(practices)
  /* Patients count toward the period they were invited in. */
  const byPractice = new Map(
    [...allTime].map(([id, a]) => [id, adoptionInPeriod(a, from, to)])
  )
  const hol = React.useMemo(() => holAverages(practices), [practices])

  const inScope = practices.filter(
    (p) => byPractice.has(p.id) && (scope === ALL || p.region === scope)
  )
  const total = combineAdoption(inScope.map((p) => byPractice.get(p.id)!))

  /* Nationwide the rows are regions; inside a region they are practices. */
  const rows: Row[] =
    scope === ALL
      ? REGIONS.flatMap((region) => {
          const members = inScope.filter((p) => p.region === region)
          if (!members.length) return []
          return [
            {
              key: region,
              name: region,
              practices: members.length,
              adoption: combineAdoption(
                members.map((p) => byPractice.get(p.id)!)
              ),
            },
          ]
        })
      : inScope.map((p) => ({
          key: p.id,
          name: p.name,
          href: `/screens/admin/practices/${p.id}`,
          adoption: byPractice.get(p.id)!,
        }))

  /* The map always shades every region, whatever the scope. */
  const mapRegions: MapRegion[] = REGIONS.flatMap((region) => {
    const members = practices.filter(
      (p) => byPractice.has(p.id) && p.region === region
    )
    if (!members.length) return []
    return [
      {
        name: region,
        practices: members.length,
        adoption: combineAdoption(members.map((p) => byPractice.get(p.id)!)),
      },
    ]
  })

  /* Lowest enrolment first: where HOL is losing patients. */
  rows.sort((a, b) => (a.adoption.rate ?? 2) - (b.adoption.rate ?? 2))

  /* Every row, ready for the map: a region row scopes the dashboard to it,
     a practice row opens the practice. */
  const rated = rows.map((row) => ({
    key: row.key,
    name: row.name,
    rate: row.adoption.rate,
    enrolled: row.adoption.enrolled,
    open: row.adoption.open,
    onPick: () => (row.href ? router.push(row.href) : setScope(row.name)),
  }))

  function go(nextScope: string, nextRange: RangeValue) {
    const params = new URLSearchParams()
    if (nextScope !== ALL) params.set("region", nextScope)
    if (nextRange.preset === "custom") {
      params.set("from", nextRange.from)
      params.set("to", nextRange.to)
    } else if (nextRange.preset !== "all") {
      params.set("range", nextRange.preset)
    }
    const query = params.toString()
    router.replace(`/screens/admin/dashboard${query ? `?${query}` : ""}`)
  }

  function setScope(next: string) {
    go(next, range)
  }

  return (
    <AdminShell active="dashboard">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-surface-sunken px-4 pt-4 pb-6 sm:px-6">
        {/* The title and region picker stay pinned while the page scrolls,
            on the page's own fill so the cards pass under them. */}
        <div className="sticky -top-4 z-20 -mx-4 -mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3 bg-surface-sunken px-4 py-3 sm:-mx-6 sm:px-6">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Dashboard
          </h1>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <DateRangeFilter
              value={range}
              onChange={(next) => go(scope, next)}
            />
            <Select
              items={SCOPES}
              value={scope}
              onValueChange={(value: string | null) => setScope(value ?? ALL)}
            >
              <SelectTrigger
                size="sm"
                className="w-full rounded-md bg-card sm:w-56"
                aria-label="Region"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectGroup>
                  {SCOPES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <StatTiles kpis={practiceKpis(total, hol)} />

        {rows.length > 0 && (
          <div className="grid shrink-0 gap-4 lg:grid-cols-3">
            <UsRegionMap
              regions={mapRegions}
              scope={scope === ALL ? null : scope}
              scopeLabel={scope === ALL ? "United States" : scope}
              rowNoun={
                scope === ALL
                  ? { one: "region", many: "regions" }
                  : { one: "practice", many: "practices" }
              }
              average={hol.enrolled}
              onPickRegion={setScope}
              rows={rated}
            />
            <InviteTrend
              adoption={total}
              period={period}
              periodLabel={periodLabel}
            />
            <PatientStatus adoption={total} />
            <PracticeGrowth
              practices={practices.filter(
                (p) => scope === ALL || p.region === scope
              )}
              period={period}
            />
            <EnrolmentFunnel adoption={total} />
          </div>
        )}

        {rows.length === 0 ? (
          <NothingYet
            title="No practices in this region"
            illustration="practices-empty"
          />
        ) : (
          <div className="flex shrink-0 flex-col">
            <TableCard>
              <Table>
                <TableHeader className={HEAD}>
                  <TableRow>
                    <TableHead>
                      {scope === ALL ? "Region" : "Practice"}
                    </TableHead>
                    {scope === ALL && (
                      <TableHead className="text-center">Practices</TableHead>
                    )}
                    <TableHead className="hidden text-center sm:table-cell">
                      Providers
                    </TableHead>
                    <TableHead className="hidden text-center sm:table-cell">
                      Patients
                    </TableHead>
                    <TableHead className="hidden text-center md:table-cell">
                      Enrolled
                    </TableHead>
                    <TableHead className="hidden text-center md:table-cell">
                      Pending
                    </TableHead>
                    <TableHead className="hidden text-center md:table-cell">
                      Declined
                    </TableHead>
                    <TableHead>Enrolment rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_td]:px-4 [&_td]:py-2.5">
                  {rows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="max-w-[18rem]">
                        <Button
                          variant="link"
                          className="block h-auto max-w-full truncate p-0 text-left"
                          {...(row.href
                            ? {
                                nativeButton: false,
                                render: <Link href={row.href} />,
                              }
                            : { onClick: () => setScope(row.name) })}
                        >
                          {row.name}
                        </Button>
                      </TableCell>
                      {scope === ALL && (
                        <TableCell className="text-center tabular-nums">
                          {row.practices}
                        </TableCell>
                      )}
                      <TableCell className="hidden text-center tabular-nums sm:table-cell">
                        {row.adoption.providers.length}
                      </TableCell>
                      <TableCell className="hidden text-center tabular-nums sm:table-cell">
                        {row.adoption.open}
                      </TableCell>
                      <TableCell className="hidden text-center tabular-nums md:table-cell">
                        {row.adoption.enrolled}
                      </TableCell>
                      <TableCell className="hidden text-center tabular-nums md:table-cell">
                        {row.adoption.invited}
                      </TableCell>
                      <TableCell className="hidden text-center tabular-nums md:table-cell">
                        {row.adoption.declined}
                      </TableCell>
                      <TableCell>
                        <RateCell rate={row.adoption.rate} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableCard>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
