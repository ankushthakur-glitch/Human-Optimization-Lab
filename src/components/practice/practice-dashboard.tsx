"use client"

import * as React from "react"

import {
  type Provider,
  locations,
  providerName,
  providers,
} from "@/components/practice/practice-data"
import { PracticeShell } from "@/components/practice/practice-shell"
import { Avatar, Card, CardHeader } from "@/components/dashboard-kit-v2"
import { StatCardSkeleton } from "@/components/provider/home-v2/overview"
import {
  ConversionFunnel,
  MembershipTrend,
  PanelStats,
  type PanelMonth,
  usePanelMonths,
} from "@/components/provider/home-v2/panel"
import { TablePager, usePaged } from "@/components/table-pager"
import { ToolbarSelect } from "@/components/provider/reports/reports"
import { useNow } from "@/components/provider/schedule/schedule-data"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"

/* The clinic manager's dashboard: the provider home's panel view, summed
   over the practice's active providers (or one, or one location's). The
   same stat cards, members by month and the free to paid funnel, then each
   provider side by side.
   No tasks, urgent items or schedule: those are the physician's. */

const pct = (num: number, den: number) => (den ? Math.round((num / den) * 100) : 0)

export function PracticeDashboardScreen() {
  return (
    <PracticeShell active="dashboard">
      <Dashboard />
    </PracticeShell>
  )
}

function Dashboard() {
  const { items: provs, ready } = providers.use()
  const { items: locs } = locations.use()
  const [locationId, setLocationId] = React.useState("")
  const [providerId, setProviderId] = React.useState("")
  const now = useNow()

  const active = provs.filter(
    (p) => p.status === "Active" && (!locationId || p.locationIds.includes(locationId))
  )
  const shown = providerId ? active.filter((p) => p.id === providerId) : active
  const ids = shown.map((p) => p.id)

  const months = usePanelMonths(ids)

  return (
    <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-surface-sunken">
      <div className="flex w-full min-w-0 flex-col gap-5 px-6 pt-5 pb-8">
        <header className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg leading-7 font-semibold">Practice dashboard</h1>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <ToolbarSelect
              label="Location"
              className="w-48"
              items={[
                { label: "All locations", value: "" },
                ...locs.filter((l) => l.status === "Active").map((l) => ({ label: l.name, value: l.id })),
              ]}
              value={locationId}
              onChange={(v) => {
                setLocationId(v)
                setProviderId("")
              }}
            />
            <ToolbarSelect
              label="Provider"
              className="w-56"
              items={[
                { label: "All providers", value: "" },
                ...active.map((p) => ({ label: providerName(p), value: p.id })),
              ]}
              value={providerId}
              onChange={setProviderId}
            />
          </div>
        </header>

        {ready && now ? (
          <>
            <PanelStats months={months} practice />

            <div className="grid gap-4 xl:grid-cols-3">
              <MembershipTrend months={months} className="xl:col-span-2" />
              <ConversionFunnel months={months} />
            </div>

            <ByProvider providers={shown} />
          </>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------- by provider -- */

const HEAD =
  "sticky top-0 z-10 bg-surface-head [&_th]:h-9 [&_th]:px-4 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground"

/** This month's panel numbers for each provider, side by side: a fixed
    height card that scrolls inside and pages. */
function ByProvider({ providers: list }: { providers: Provider[] }) {
  const paged = usePaged(list, 8)
  return (
    <Card className="h-[520px]">
      <CardHeader title="By provider" actions={<span className="text-xs text-muted-foreground">This month</span>} />
      <div className="no-scrollbar min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader className={HEAD}>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead className="text-right">Optimization members</TableHead>
              <TableHead className="text-right">New members</TableHead>
              <TableHead className="text-right">Conversion rate</TableHead>
              <TableHead className="text-right">Continuing paid plan</TableHead>
              <TableHead className="text-right">Dropped off</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.visible.map((p) => (
              <ProviderRow key={p.id} provider={p} />
            ))}
          </TableBody>
        </Table>
      </div>
      <TablePager paged={paged} className="border-t border-border px-4 py-2" />
    </Card>
  )
}

function ProviderRow({ provider: p }: { provider: Provider }) {
  const months = usePanelMonths([p.id])
  const m: PanelMonth = months[months.length - 1]
  return (
    <TableRow className="[&_td]:px-4 [&_td]:py-2.5">
      <TableCell>
        <span className="flex items-center gap-2.5">
          <Avatar name={providerName(p)} photo={p.photo} size={28} />
          <span className="text-sm font-medium">{providerName(p)}</span>
        </span>
      </TableCell>
      <TableCell className="text-right tabular-nums">{m.members}</TableCell>
      <TableCell className="text-right tabular-nums">{m.joined}</TableCell>
      <TableCell className="text-right tabular-nums">{m.conversion}%</TableCell>
      <TableCell className="text-right tabular-nums">{pct(m.continuing, m.start)}%</TableCell>
      <TableCell className="text-right tabular-nums">{m.dropped}</TableCell>
    </TableRow>
  )
}
