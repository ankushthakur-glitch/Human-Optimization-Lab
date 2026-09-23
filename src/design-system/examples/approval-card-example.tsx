"use client"

import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  Delete02Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons"

import { Example, ExampleWrapper } from "@/design-system/examples/example"
import {
  ApprovalCard,
  ApprovalCardActions,
  ApprovalCardDescription,
  ApprovalCardDetail,
  ApprovalCardDetails,
  ApprovalCardHeader,
  ApprovalCardIcon,
  ApprovalCardTitle,
} from "@/design-system/ui/approval-card"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import { Checkbox } from "@/design-system/ui/checkbox"

export default function ApprovalCardExample() {
  return (
    <ExampleWrapper>
      <ApprovalDefault />
      <ApprovalDanger />
      <ApprovalResolved />
      <ApprovalWithScope />
    </ExampleWrapper>
  )
}

function ApprovalDefault() {
  return (
    <Example title="Default">
      <ApprovalCard>
        <ApprovalCardHeader>
          <ApprovalCardIcon>
            <HugeiconsIcon icon={Mail01Icon} />
          </ApprovalCardIcon>
          <div className="min-w-0 flex-1">
            <ApprovalCardTitle>Send a follow-up message</ApprovalCardTitle>
            <ApprovalCardDescription>
              The message goes to the patient portal, not to an external
              address.
            </ApprovalCardDescription>
          </div>
        </ApprovalCardHeader>
        <ApprovalCardDetails>
          <ApprovalCardDetail label="Tool">
            send_portal_message
          </ApprovalCardDetail>
          <ApprovalCardDetail label="Recipient">
            R. Álvarez · MRN 40921
          </ApprovalCardDetail>
          <ApprovalCardDetail label="Subject">
            Repeat A1c before your next visit
          </ApprovalCardDetail>
        </ApprovalCardDetails>
        <ApprovalCardActions>
          <Button variant="ghost" size="sm" onClick={() => toast("Declined")}>
            Decline
          </Button>
          <Button size="sm" onClick={() => toast("Message sent")}>
            Approve
          </Button>
        </ApprovalCardActions>
      </ApprovalCard>
    </Example>
  )
}

function ApprovalDanger() {
  return (
    <Example title="Destructive">
      <ApprovalCard tone="danger">
        <ApprovalCardHeader>
          <ApprovalCardIcon className="bg-destructive/10 text-destructive">
            <HugeiconsIcon icon={Delete02Icon} />
          </ApprovalCardIcon>
          <div className="min-w-0 flex-1">
            <ApprovalCardTitle>Void 3 duplicate orders</ApprovalCardTitle>
            <ApprovalCardDescription>
              Voiding is recorded in the audit log and cannot be undone from
              here.
            </ApprovalCardDescription>
          </div>
        </ApprovalCardHeader>
        <ApprovalCardDetails>
          <ApprovalCardDetail label="Tool">void_orders</ApprovalCardDetail>
          <ApprovalCardDetail label="Orders">
            ORD-8841, ORD-8842, ORD-8847
          </ApprovalCardDetail>
          <ApprovalCardDetail label="Reason">
            Duplicate of ORD-8830
          </ApprovalCardDetail>
        </ApprovalCardDetails>
        <ApprovalCardActions>
          <Button variant="ghost" size="sm">
            Keep them
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => toast("3 orders voided")}
          >
            Void orders
          </Button>
        </ApprovalCardActions>
      </ApprovalCard>
    </Example>
  )
}

function ApprovalResolved() {
  return (
    <Example title="Resolved">
      <div className="flex w-full flex-col gap-4">
        <ApprovalCard className="opacity-80">
          <ApprovalCardHeader>
            <ApprovalCardIcon className="bg-success-surface text-success">
              <HugeiconsIcon icon={Mail01Icon} />
            </ApprovalCardIcon>
            <div className="min-w-0 flex-1">
              <ApprovalCardTitle>Send a follow-up message</ApprovalCardTitle>
              <ApprovalCardDescription>
                Approved by you at 09:14.
              </ApprovalCardDescription>
            </div>
            <Badge variant="success">Approved</Badge>
          </ApprovalCardHeader>
        </ApprovalCard>
        <ApprovalCard className="opacity-80">
          <ApprovalCardHeader>
            <ApprovalCardIcon className="bg-muted text-muted-foreground">
              <HugeiconsIcon icon={Alert02Icon} />
            </ApprovalCardIcon>
            <div className="min-w-0 flex-1">
              <ApprovalCardTitle>Close the care gap</ApprovalCardTitle>
              <ApprovalCardDescription>
                Declined. The gap needs a clinician review first.
              </ApprovalCardDescription>
            </div>
            <Badge variant="outline">Declined</Badge>
          </ApprovalCardHeader>
        </ApprovalCard>
      </div>
    </Example>
  )
}

function ApprovalWithScope() {
  const [always, setAlways] = React.useState(false)

  return (
    <Example title="Scoped approval">
      <ApprovalCard tone="caution">
        <ApprovalCardHeader>
          <ApprovalCardIcon className="bg-warning-surface text-warning">
            <HugeiconsIcon icon={Alert02Icon} />
          </ApprovalCardIcon>
          <div className="min-w-0 flex-1">
            <ApprovalCardTitle>Write to the problem list</ApprovalCardTitle>
            <ApprovalCardDescription>
              Writes change the record other clinicians read, so they ask every
              time unless you widen the scope.
            </ApprovalCardDescription>
          </div>
        </ApprovalCardHeader>
        <ApprovalCardDetails>
          <ApprovalCardDetail label="Tool">add_problem</ApprovalCardDetail>
          <ApprovalCardDetail label="Code">
            E11.9: Type 2 diabetes
          </ApprovalCardDetail>
        </ApprovalCardDetails>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={always}
            onCheckedChange={(checked) => setAlways(checked === true)}
          />
          Allow this tool for the rest of the session
        </label>
        <ApprovalCardActions>
          <Button variant="ghost" size="sm">
            Decline
          </Button>
          <Button
            size="sm"
            onClick={() =>
              toast(always ? "Approved for this session" : "Approved once")
            }
          >
            Approve
          </Button>
        </ApprovalCardActions>
      </ApprovalCard>
    </Example>
  )
}
