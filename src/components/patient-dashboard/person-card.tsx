"use client"

import { PersonCard } from "@/components/dashboard-kit-v2/person-card"
import { usDay } from "@/components/provider/mock-clock"
import type { DashboardModel } from "@/components/patient-dashboard/model"
import { HeaderLink, sectionDomId } from "@/components/patient-dashboard/ui"

/* "About {first name}": the person's own goal beside the summary, in their
   words, with what matters most, what to focus on first and the last
   visit. Mark reviewed shows until the intake has been read. No scores. */

export function AboutPerson({
  model,
  firstName,
  onReview,
}: {
  model: DashboardModel
  firstName: string
  onReview: () => void
}) {
  const intake = model.intake!
  const { review } = model
  return (
    <PersonCard
      id={sectionDomId("person")}
      title={`About ${firstName}`}
      description={`Intake ${usDay(intake.completedAt)}`}
      actions={
        !intake.reviewed ? (
          <HeaderLink onClick={onReview}>Mark reviewed</HeaderLink>
        ) : undefined
      }
      quote={intake.reason}
      pairs={[
        { label: "What matters most", value: intake.mattersMost },
        { label: "Focus first", value: intake.focusFirst },
      ]}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">Last visit</span>
        <span className="text-[13px] font-medium tabular-nums">
          {review ? `${usDay(review.at)} · ${review.by}` : "No visit on record"}
        </span>
      </div>
    </PersonCard>
  )
}
