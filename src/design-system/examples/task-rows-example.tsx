import { Example, ExampleWrapper } from "@/design-system/examples/example"
import {
  TaskList,
  TaskRow,
  TaskRowContent,
  TaskRowDescription,
  TaskRowMeta,
  TaskRowStatus,
  TaskRowTitle,
} from "@/design-system/ui/task-row"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"

export default function TaskRowsExample() {
  return (
    <ExampleWrapper>
      <TaskRowsRun />
      <TaskRowsStatuses />
      <TaskRowsWithDetail />
      <TaskRowsFailure />
    </ExampleWrapper>
  )
}

function TaskRowsRun() {
  return (
    <Example title="Run in progress">
      <TaskList>
        <TaskRow status="done">
          <TaskRowStatus status="done" />
          <TaskRowContent>
            <TaskRowTitle>Load the patient panel</TaskRowTitle>
          </TaskRowContent>
          <TaskRowMeta>0.4s</TaskRowMeta>
        </TaskRow>
        <TaskRow status="done">
          <TaskRowStatus status="done" />
          <TaskRowContent>
            <TaskRowTitle>Pull encounters from the last 90 days</TaskRowTitle>
          </TaskRowContent>
          <TaskRowMeta>1.2s</TaskRowMeta>
        </TaskRow>
        <TaskRow status="running">
          <TaskRowStatus status="running" />
          <TaskRowContent>
            <TaskRowTitle>Rank by days overdue</TaskRowTitle>
          </TaskRowContent>
          <TaskRowMeta>6s</TaskRowMeta>
        </TaskRow>
        <TaskRow status="pending" last>
          <TaskRowStatus status="pending" />
          <TaskRowContent>
            <TaskRowTitle>Draft the outreach list</TaskRowTitle>
          </TaskRowContent>
        </TaskRow>
      </TaskList>
    </Example>
  )
}

function TaskRowsStatuses() {
  return (
    <Example title="Statuses">
      <TaskList>
        <TaskRow status="pending">
          <TaskRowStatus status="pending" />
          <TaskRowContent>
            <TaskRowTitle>Pending</TaskRowTitle>
          </TaskRowContent>
        </TaskRow>
        <TaskRow status="running">
          <TaskRowStatus status="running" />
          <TaskRowContent>
            <TaskRowTitle>Running</TaskRowTitle>
          </TaskRowContent>
        </TaskRow>
        <TaskRow status="done">
          <TaskRowStatus status="done" />
          <TaskRowContent>
            <TaskRowTitle>Done</TaskRowTitle>
          </TaskRowContent>
        </TaskRow>
        <TaskRow status="failed">
          <TaskRowStatus status="failed" />
          <TaskRowContent>
            <TaskRowTitle>Failed</TaskRowTitle>
          </TaskRowContent>
        </TaskRow>
        <TaskRow status="skipped" last>
          <TaskRowStatus status="skipped" />
          <TaskRowContent>
            <TaskRowTitle>Skipped</TaskRowTitle>
          </TaskRowContent>
        </TaskRow>
      </TaskList>
    </Example>
  )
}

function TaskRowsWithDetail() {
  return (
    <Example title="With detail">
      <TaskList>
        <TaskRow status="done">
          <TaskRowStatus status="done" />
          <TaskRowContent>
            <TaskRowTitle>
              Reconcile the medication list
              <Badge variant="success">28 matched</Badge>
            </TaskRowTitle>
            <TaskRowDescription>
              Two entries differ only by dose form, so I kept both and flagged
              the pair rather than merging them.
            </TaskRowDescription>
          </TaskRowContent>
        </TaskRow>
        <TaskRow status="running" last>
          <TaskRowStatus status="running" />
          <TaskRowContent>
            <TaskRowTitle>Check for interactions</TaskRowTitle>
            <TaskRowDescription>
              Comparing against the active problem list.
            </TaskRowDescription>
          </TaskRowContent>
        </TaskRow>
      </TaskList>
    </Example>
  )
}

function TaskRowsFailure() {
  return (
    <Example title="Recoverable failure">
      <TaskList>
        <TaskRow status="done">
          <TaskRowStatus status="done" />
          <TaskRowContent>
            <TaskRowTitle>Fetch demographics</TaskRowTitle>
          </TaskRowContent>
        </TaskRow>
        <TaskRow status="failed" last>
          <TaskRowStatus status="failed" />
          <TaskRowContent>
            <TaskRowTitle>Fetch lab results</TaskRowTitle>
            <TaskRowDescription>
              The lab interface returned a 504. Nothing downstream ran, so a
              retry is safe.
            </TaskRowDescription>
            <div className="mt-1 flex items-center gap-2">
              <Button variant="outline" size="xs">
                Retry step
              </Button>
              <Button variant="ghost" size="xs">
                Skip
              </Button>
            </div>
          </TaskRowContent>
        </TaskRow>
      </TaskList>
    </Example>
  )
}
