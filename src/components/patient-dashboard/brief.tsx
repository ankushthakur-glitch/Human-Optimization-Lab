"use client"

import * as React from "react"
import { Copy01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/design-system/ui/button"
import {
  AIBrief,
  type BriefFeedback,
  KitIcon,
} from "@/components/dashboard-kit-v2"
import { NOW, clockTime, usDay } from "@/components/provider/mock-clock"
import { audit } from "@/components/provider/work-items"
import { ME } from "@/components/patient-dashboard/model"
import { sectionDomId } from "@/components/patient-dashboard/ui"
import {
  type BriefItem,
  type PatientContext,
  type Source,
  briefAsText,
  briefMeta,
} from "@/lib/brief"

/* Since your last review: the AI brief for a patient page. The items come
   from composeBrief over the same model the cards read (see lib/brief);
   this card only lays them out, copies them as text for a visit note,
   takes feedback and writes the audit log. Nothing here places an order,
   adds a diagnosis or messages the patient. */

const TITLE = "Since your last review"

export function PatientBrief({
  ctx,
  items,
  syncedAt,
  onOpenSource,
}: {
  ctx: PatientContext
  items: BriefItem[]
  /** When the chart's records were last pulled, the brief's generation time. */
  syncedAt?: string
  onOpenSource: (source: Source) => void
}) {
  const { core } = ctx
  const meta = briefMeta(ctx)
  const generatedAt = syncedAt ?? NOW
  const patientId = core.data.patientId
  const [copied, setCopied] = React.useState(false)

  /* One generation entry per brief content, so a re-render is not a new summary. */
  const signature = items.map((i) => i.id).join("|")
  const logged = React.useRef<string | null>(null)
  React.useEffect(() => {
    const key = `brief:${patientId}:${signature}`
    if (logged.current === key) return
    logged.current = key
    audit(ME, `Brief generated (${items.length} items, template v5)`, key)
  }, [patientId, signature, items.length])

  async function copy() {
    const text = briefAsText(items, meta)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* Clipboard access can be refused; the audit entry still records the attempt. */
    }
    audit(ME, "Copy to visit note", `brief:${patientId}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function feedback(f: BriefFeedback) {
    audit(
      ME,
      f.rating === "up"
        ? "Brief rated helpful"
        : `Brief rated not helpful: ${f.reason ?? "no reason"}`,
      `brief:${patientId}`
    )
  }

  return (
    <AIBrief
      id={sectionDomId("brief")}
      title={TITLE}
      meta={meta}
      items={items}
      emptyText="Nothing new since your last review"
      generatedAt={clockTime(generatedAt)}
      about={{
        model: "Inlay clinical summary, template v5",
        window: core.review
          ? `${usDay(core.review.at)} to ${usDay(NOW)}`
          : `Up to ${usDay(NOW)}`,
        limitations:
          "Reads only the records in this chart. It states what the records say, with a source for every sentence, and makes no diagnosis or recommendation.",
      }}
      action={
        <Button variant="outline" size="sm" onClick={copy}>
          <KitIcon icon={Copy01Icon} size={14} />
          {copied ? "Copied" : "Copy to visit note"}
        </Button>
      }
      onOpenSource={(s) => {
        audit(ME, `Open source: ${s.label}`, s.refId)
        onOpenSource(s)
      }}
      onFeedback={feedback}
      className="h-full"
    />
  )
}
