"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { AdminShell } from "@/components/admin/admin-shell"
import {
  KpiGrid,
  holAverages,
  practiceKpis,
  toneFor,
} from "@/components/admin/adoption-kpis"
import {
  type Adoption,
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
   HOL average. The scope lives in ?region= so a view can be shared. */

const ALL = "all"

const SCOPES = [
  { label: "All regions", value: ALL },
  ...REGIONS.map((region) => ({ label: region, value: region })),
]

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

  const { practices } = usePractices()
  const byPractice = usePlatformAdoption(practices)
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

  /* Lowest enrolment first: where HOL is losing patients. */
  rows.sort(
    (a, b) => (a.adoption.rate ?? 2) - (b.adoption.rate ?? 2)
  )

  function setScope(next: string) {
    router.replace(
      next === ALL
        ? "/screens/admin/dashboard"
        : `/screens/admin/dashboard?region=${encodeURIComponent(next)}`
    )
  }

  return (
    <AdminShell active="dashboard">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-surface-sunken px-4 pt-4 pb-6 sm:px-6">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Dashboard
          </h1>
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

        <KpiGrid kpis={practiceKpis(total, hol)} />

        {rows.length === 0 ? (
          <NothingYet
            title="No practices in this region"
            illustration="practices-empty"
          />
        ) : (
          <TableCard>
            <Table>
              <TableHeader className={HEAD}>
                <TableRow>
                  <TableHead>{scope === ALL ? "Region" : "Practice"}</TableHead>
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
                      <RateCell
                        rate={row.adoption.rate}
                        behind={
                          row.adoption.rate !== null &&
                          toneFor(row.adoption.rate, hol.enrolled) === "alert"
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
        )}
      </div>
    </AdminShell>
  )
}
