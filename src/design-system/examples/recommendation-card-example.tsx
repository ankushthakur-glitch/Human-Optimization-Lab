"use client"

import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Calendar01Icon,
  Idea01Icon,
  TestTube01Icon,
} from "@hugeicons/core-free-icons"

import { Example, ExampleWrapper } from "@/design-system/examples/example"
import {
  RecommendationCard,
  RecommendationCardConfidence,
  RecommendationCardFooter,
  RecommendationCardGroup,
  RecommendationCardHeader,
  RecommendationCardIcon,
  RecommendationCardReason,
  RecommendationCardTitle,
} from "@/design-system/ui/recommendation-card"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"

export default function RecommendationCardExample() {
  return (
    <ExampleWrapper>
      <RecommendationDefault />
      <RecommendationConfidence />
      <RecommendationStack />
      <RecommendationDismissed />
    </ExampleWrapper>
  )
}

function RecommendationDefault() {
  return (
    <Example title="Default">
      <RecommendationCard>
        <RecommendationCardHeader>
          <RecommendationCardIcon>
            <HugeiconsIcon icon={TestTube01Icon} />
          </RecommendationCardIcon>
          <div className="min-w-0 flex-1">
            <RecommendationCardTitle>
              Order a repeat A1c
            </RecommendationCardTitle>
            <RecommendationCardReason>
              The last result was 8.2% in March and there is no order on file
              since. The care plan asks for one every three months.
            </RecommendationCardReason>
          </div>
        </RecommendationCardHeader>
        <RecommendationCardConfidence value={82} />
        <RecommendationCardFooter>
          <Button size="sm" onClick={() => toast("Order drafted")}>
            Draft the order
          </Button>
          <Button variant="ghost" size="sm">
            Not now
          </Button>
        </RecommendationCardFooter>
      </RecommendationCard>
    </Example>
  )
}

function RecommendationConfidence() {
  return (
    <Example title="Confidence">
      <div className="flex w-full flex-col gap-4">
        <RecommendationCard>
          <RecommendationCardHeader>
            <RecommendationCardIcon>
              <HugeiconsIcon icon={Calendar01Icon} />
            </RecommendationCardIcon>
            <div className="min-w-0 flex-1">
              <RecommendationCardTitle>
                Book a 3-month follow-up
              </RecommendationCardTitle>
              <RecommendationCardReason>
                Supported by the visit note and the standing care plan.
              </RecommendationCardReason>
            </div>
          </RecommendationCardHeader>
          <RecommendationCardConfidence value={94} />
        </RecommendationCard>
        <RecommendationCard>
          <RecommendationCardHeader>
            <RecommendationCardIcon className="bg-warning-surface text-warning">
              <HugeiconsIcon icon={Idea01Icon} />
            </RecommendationCardIcon>
            <div className="min-w-0 flex-1">
              <RecommendationCardTitle>
                Consider a referral
              </RecommendationCardTitle>
              <RecommendationCardReason>
                Weaker signal. Inferred from two notes, neither of which says
                it outright. Worth a look, not worth acting on blind.
              </RecommendationCardReason>
            </div>
          </RecommendationCardHeader>
          <RecommendationCardConfidence value={38} />
        </RecommendationCard>
      </div>
    </Example>
  )
}

function RecommendationStack() {
  return (
    <Example title="Stacked">
      <RecommendationCardGroup>
        {[
          {
            title: "Close the mammogram gap",
            reason: "Due since January. Two outreach attempts, no response.",
            confidence: 88,
          },
          {
            title: "Reconcile the med list",
            reason: "Two entries differ only by dose form.",
            confidence: 71,
          },
        ].map((r) => (
          <RecommendationCard key={r.title}>
            <RecommendationCardHeader>
              <RecommendationCardIcon>
                <HugeiconsIcon icon={Idea01Icon} />
              </RecommendationCardIcon>
              <div className="min-w-0 flex-1">
                <RecommendationCardTitle>{r.title}</RecommendationCardTitle>
                <RecommendationCardReason>{r.reason}</RecommendationCardReason>
              </div>
            </RecommendationCardHeader>
            <RecommendationCardConfidence value={r.confidence} />
          </RecommendationCard>
        ))}
      </RecommendationCardGroup>
    </Example>
  )
}

function RecommendationDismissed() {
  return (
    <Example title="Acted on">
      <RecommendationCard className="opacity-75">
        <RecommendationCardHeader>
          <RecommendationCardIcon className="bg-success-surface text-success">
            <HugeiconsIcon icon={TestTube01Icon} />
          </RecommendationCardIcon>
          <div className="min-w-0 flex-1">
            <RecommendationCardTitle>
              Order a repeat A1c
            </RecommendationCardTitle>
            <RecommendationCardReason>
              Order ORD-9032 drafted and sent for signature.
            </RecommendationCardReason>
          </div>
          <Badge variant="success">Accepted</Badge>
        </RecommendationCardHeader>
      </RecommendationCard>
    </Example>
  )
}
