"use client"

import { Badge, DataTable, Row, Td, Th } from "@/components/dashboard-kit-v2"
import { usDay } from "@/components/provider/mock-clock"
import type { DashboardModel } from "@/components/patient-dashboard/model"
import { EDGE, SectionCard } from "@/components/patient-dashboard/section-card"

/* Validation mode: a chart nobody has reviewed yet lists where its records
   came from, in the brief's slot, because every item would otherwise count
   as new. Validate record then starts the review window. */

export function RecordSources({ model }: { model: DashboardModel }) {
  return (
    <SectionCard
      id="brief"
      title="Record sources"
      description={`${model.sources.length} sources`}
      flush
    >
      <DataTable aria-label="Record sources" minWidth={640}>
        <thead>
          <tr>
            <Th className={EDGE}>Source</Th>
            <Th>Records</Th>
            <Th className="text-right">Date range</Th>
            <Th className={`${EDGE} text-right`}>Last received</Th>
          </tr>
        </thead>
        <tbody>
          {model.sources.map((s) => (
            <Row key={s.source}>
              <Td className={`${EDGE} py-2.5`}>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="text-sm font-medium">{s.source}</span>
                  {!s.isPractice && <Badge tone="outline">Outside</Badge>}
                </span>
              </Td>
              <Td>
                <span className="flex flex-wrap gap-1.5">
                  {s.counts.map((c) => (
                    <Badge key={c.label} tone="outline">
                      {c.label}
                    </Badge>
                  ))}
                </span>
              </Td>
              <Td className="text-right whitespace-nowrap text-muted-foreground tabular-nums">
                {usDay(s.first)} to {usDay(s.last)}
              </Td>
              <Td
                className={`${EDGE} text-right whitespace-nowrap text-muted-foreground tabular-nums`}
              >
                {usDay(s.last)}
              </Td>
            </Row>
          ))}
        </tbody>
      </DataTable>
    </SectionCard>
  )
}
