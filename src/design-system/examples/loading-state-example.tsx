import { Example, ExampleWrapper } from "@/design-system/examples/example"
import {
  LoadingState,
  LoadingStateContent,
  LoadingStateDescription,
  LoadingStateIndicator,
  LoadingStateLabel,
  LoadingStateLines,
} from "@/design-system/ui/loading-state"

export default function LoadingStateExample() {
  return (
    <ExampleWrapper>
      <LoadingStateIndicators />
      <LoadingStateVariants />
      <LoadingStatePlaceholder />
      <LoadingStateInline />
    </ExampleWrapper>
  )
}

function LoadingStateIndicators() {
  return (
    <Example title="Indicators">
      <div className="flex w-full flex-col gap-6">
        <LoadingState>
          <LoadingStateIndicator kind="spinner" />
          <LoadingStateContent>
            <LoadingStateLabel>Reading the chart</LoadingStateLabel>
          </LoadingStateContent>
        </LoadingState>
        <LoadingState>
          <LoadingStateIndicator kind="dots" />
          <LoadingStateContent>
            <LoadingStateLabel>Drafting a reply</LoadingStateLabel>
          </LoadingStateContent>
        </LoadingState>
        <LoadingState>
          <LoadingStateIndicator kind="pulse" />
          <LoadingStateContent>
            <LoadingStateLabel>Listening for updates</LoadingStateLabel>
          </LoadingStateContent>
        </LoadingState>
      </div>
    </Example>
  )
}

function LoadingStateVariants() {
  return (
    <Example title="Variants">
      <div className="flex w-full flex-col gap-4">
        <LoadingState variant="card">
          <LoadingStateIndicator />
          <LoadingStateContent>
            <LoadingStateLabel>Summarising 14 encounters</LoadingStateLabel>
            <LoadingStateDescription>
              This usually takes about ten seconds.
            </LoadingStateDescription>
          </LoadingStateContent>
        </LoadingState>
        <LoadingState variant="muted">
          <LoadingStateIndicator kind="dots" />
          <LoadingStateContent>
            <LoadingStateLabel>Waiting on the lab feed</LoadingStateLabel>
            <LoadingStateDescription>
              Results arrive as soon as the interface responds.
            </LoadingStateDescription>
          </LoadingStateContent>
        </LoadingState>
      </div>
    </Example>
  )
}

function LoadingStatePlaceholder() {
  return (
    <Example title="Content placeholder">
      <LoadingState variant="card" className="flex-col gap-4">
        <div className="flex w-full items-center gap-3">
          <LoadingStateIndicator kind="pulse" />
          <LoadingStateLabel>Building the summary</LoadingStateLabel>
        </div>
        <LoadingStateLines lines={4} />
      </LoadingState>
    </Example>
  )
}

function LoadingStateInline() {
  return (
    <Example title="Inline">
      <div className="flex w-full flex-col gap-4 text-sm">
        <p className="text-muted-foreground">
          Inline states sit in the flow of a response, so they stay quiet and
          keep the reading rhythm of the text around them.
        </p>
        <LoadingState className="items-center">
          <LoadingStateIndicator kind="dots" />
          <LoadingStateLabel className="font-normal text-muted-foreground">
            Checking three more sources
          </LoadingStateLabel>
        </LoadingState>
      </div>
    </Example>
  )
}
