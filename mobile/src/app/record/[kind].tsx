import { useLocalSearchParams } from "expo-router"
import * as React from "react"

import type { RecordKind } from "@/app/results"
import { PageNotFoundState } from "@/components/error-state"
import { Badge, FlowScreen } from "@/components/flow"
import { List, ListRow } from "@/components/list"
import {
  ALLERGIES,
  DOCUMENTS,
  IMMUNIZATIONS,
  ORDER_LABEL,
  ORDERS,
  ORIGIN_LABEL,
  PROBLEMS,
  PROCEDURES,
  VISITS,
  type OrderState,
} from "@/lib/record"

/* One part of the record as a list. Each entry says where it came from;
   where another place lists it differently, both stay visible as a
   difference until the doctor settles it. */

const ORDER_TONE: Record<OrderState, "high" | "low" | "primary" | "ok"> = {
  overdue: "high",
  due: "low",
  "due-soon": "low",
  planned: "primary",
  done: "ok",
}

const TITLES: Record<RecordKind, string> = {
  conditions: "Conditions",
  allergies: "Allergies",
  visits: "Visits",
  procedures: "Procedures",
  orders: "Tests ordered",
  immunizations: "Immunizations",
  documents: "Documents",
}

export default function RecordListScreen() {
  const { kind } = useLocalSearchParams<{ kind: RecordKind }>()
  if (!(kind in TITLES)) return <PageNotFoundState />

  return (
    <FlowScreen title={TITLES[kind]}>
      <List>
        {kind === "conditions" &&
          PROBLEMS.map((p) => (
            <ListRow
              key={p.id}
              title={p.name}
              meta={`Since ${p.since}, ${ORIGIN_LABEL[p.origin]}`}
              note={"difference" in p && p.difference ? { text: p.difference } : undefined}
            />
          ))}
        {kind === "allergies" &&
          ALLERGIES.map((a) => (
            <ListRow
              key={a.id}
              title={a.name}
              meta={`${a.reaction}, ${a.lists.map((o) => ORIGIN_LABEL[o]).join(" and ")}`}
              note={a.difference ? { text: a.difference } : undefined}
            />
          ))}
        {kind === "visits" &&
          VISITS.map((v) => (
            <ListRow
              key={v.id}
              title={v.name}
              meta={`${v.where}, ${v.date}`}
              note={v.note ? { text: v.note, tone: "primary" } : undefined}
              right={v.origin === "you" ? <Badge tone="ink">You told us</Badge> : undefined}
            />
          ))}
        {kind === "procedures" &&
          PROCEDURES.map((p) => <ListRow key={p.id} title={p.name} meta={`${p.where}, ${p.date}`} />)}
        {kind === "orders" &&
          ORDERS.map((o) => (
            <ListRow
              key={o.id}
              title={o.name}
              meta={`${o.by}, ordered ${o.ordered}. ${o.due}`}
              right={<Badge tone={ORDER_TONE[o.state]}>{ORDER_LABEL[o.state]}</Badge>}
            />
          ))}
        {kind === "immunizations" && IMMUNIZATIONS.map((i) => <ListRow key={i.id} title={i.name} meta={i.date} />)}
        {kind === "documents" && DOCUMENTS.map((d) => <ListRow key={d.id} title={d.name} meta={`${d.where}, ${d.date}`} />)}
      </List>
    </FlowScreen>
  )
}
