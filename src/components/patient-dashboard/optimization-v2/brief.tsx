"use client"

import * as React from "react"
import { Copy01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/design-system/ui/button"
import { AIBrief, type BriefFeedback, KitIcon } from "@/components/dashboard-kit-v2"
import { type PatientContext, briefAsText, briefMeta, composeBrief } from "@/lib/brief"
import type { Source } from "@/lib/brief/types"
import { ME } from "@/components/patient-dashboard/model"
import { audit } from "@/components/provider/work-items"
import { clockTime, usDay } from "@/components/provider/mock-clock"
import { optDomId } from "@/components/patient-dashboard/optimization-v2/ui"

/* Tier 2's brief: composed, never stored. The one footer action copies the
   items as plain text, prefixed as AI-drafted; chip opens, copies and
   thumbs go to the audit log. */

const ABOUT = {
  model: "Inlay summary model (template version 5)",
  limitations:
    "Reads only the records on this page. States facts with their sources and makes no recommendation; verify each line against its source before acting.",
}

const COPIED_MS = 2000

export function SinceBrief({
  ctx,
  patientId,
  generatedAt,
  onOpenSource,
}: {
  ctx: PatientContext
  patientId: string
  /** The sync the brief was generated from. */
  generatedAt: string
  onOpenSource: (source: Source) => void
}) {
  const items = React.useMemo(() => composeBrief("patient", ctx), [ctx])
  const meta = React.useMemo(() => briefMeta(ctx), [ctx])
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => () => clearTimeout(timer.current ?? undefined), [])

  const from = ctx.core.review?.at ?? ctx.opt?.data.planSince ?? generatedAt

  async function copy() {
    try {
      await navigator.clipboard.writeText(briefAsText(items, meta))
    } catch {
      /* The clipboard is unavailable; the button still reports the attempt. */
    }
    audit(ME, "Copy brief to visit note", patientId)
    setCopied(true)
    clearTimeout(timer.current ?? undefined)
    timer.current = setTimeout(() => setCopied(false), COPIED_MS)
  }

  function feedback(f: BriefFeedback) {
    audit(ME, f.rating === "up" ? "Brief rated helpful" : `Brief rated not helpful: ${f.reason ?? ""}`, patientId)
  }

  return (
    <AIBrief
      id={optDomId("brief")}
      title="Since your last review"
      meta={meta}
      items={items}
      emptyText="Nothing new since your last review"
      generatedAt={clockTime(generatedAt)}
      about={{ ...ABOUT, window: `${usDay(from)} to ${usDay(generatedAt)}` }}
      action={
        <Button variant="outline" size="sm" onClick={copy} aria-live="polite">
          <KitIcon icon={Copy01Icon} size={14} />
          {copied ? "Copied" : "Copy to visit note"}
        </Button>
      }
      onOpenSource={(s) => {
        audit(ME, `Open brief source: ${s.label}`, patientId)
        onOpenSource(s)
      }}
      onFeedback={feedback}
    />
  )
}
