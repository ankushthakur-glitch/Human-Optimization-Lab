import { Example, ExampleWrapper } from "@/design-system/examples/example"
import {
  InsightCard,
  InsightCardBody,
  InsightCardDelta,
  InsightCardGrid,
  InsightCardLabel,
  InsightCardValue,
  InsightSparkline,
} from "@/design-system/ui/insight-card"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"

const TREND = [12, 14, 13, 17, 16, 21, 24, 23, 28]
const DECLINE = [42, 40, 41, 36, 33, 31, 28, 26, 22]

export default function InsightCardsExample() {
  return (
    <ExampleWrapper>
      <InsightGrid />
      <InsightWithTrend />
      <InsightNarrative />
      <InsightFlat />
    </ExampleWrapper>
  )
}

function InsightGrid() {
  return (
    <Example title="Grid">
      <InsightCardGrid>
        <InsightCard>
          <InsightCardLabel>Open care gaps</InsightCardLabel>
          <InsightCardValue>128</InsightCardValue>
          <InsightCardDelta direction="down">-14 this week</InsightCardDelta>
        </InsightCard>
        <InsightCard>
          <InsightCardLabel>Overdue follow-ups</InsightCardLabel>
          <InsightCardValue>28</InsightCardValue>
          <InsightCardDelta direction="up">+6 this week</InsightCardDelta>
        </InsightCard>
      </InsightCardGrid>
    </Example>
  )
}

function InsightWithTrend() {
  return (
    <Example title="With a trend">
      <InsightCardGrid>
        <InsightCard>
          <InsightCardLabel>Messages handled</InsightCardLabel>
          <InsightCardValue>28</InsightCardValue>
          <InsightSparkline points={TREND} />
          <InsightCardDelta direction="up">
            +133% vs. last month
          </InsightCardDelta>
        </InsightCard>
        <InsightCard>
          <InsightCardLabel>Median time to close</InsightCardLabel>
          <InsightCardValue>22m</InsightCardValue>
          <InsightSparkline points={DECLINE} className="text-success" />
          <InsightCardDelta direction="down">
            -48% vs. last month
          </InsightCardDelta>
        </InsightCard>
      </InsightCardGrid>
    </Example>
  )
}

function InsightNarrative() {
  return (
    <Example title="With a finding">
      <InsightCard>
        <div className="flex items-start gap-2">
          <InsightCardLabel className="flex-1">
            Potassium — last 5 draws
          </InsightCardLabel>
          <Badge variant="warning">Watch</Badge>
        </div>
        <InsightCardValue>5.3 mmol/L</InsightCardValue>
        <InsightSparkline points={[4.4, 4.6, 4.9, 5.1, 5.3]} />
        <InsightCardBody>
          Rising at every draw since January and now above the reference range.
          The trend matters more than the single value here.
        </InsightCardBody>
        <Button variant="outline" size="sm" className="w-fit">
          Open the panel
        </Button>
      </InsightCard>
    </Example>
  )
}

function InsightFlat() {
  return (
    <Example title="No movement">
      <InsightCardGrid>
        <InsightCard>
          <InsightCardLabel>Panel size</InsightCardLabel>
          <InsightCardValue>1,204</InsightCardValue>
          <InsightCardDelta direction="flat">No change</InsightCardDelta>
        </InsightCard>
        <InsightCard>
          <InsightCardLabel>Unread results</InsightCardLabel>
          <InsightCardValue>0</InsightCardValue>
          <InsightCardBody>Cleared this morning.</InsightCardBody>
        </InsightCard>
      </InsightCardGrid>
    </Example>
  )
}
