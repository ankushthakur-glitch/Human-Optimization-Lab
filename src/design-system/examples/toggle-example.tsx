import {
  Example,
  ExampleWrapper,
} from "@/design-system/examples/example"
import { Button } from "@/design-system/ui/button"
import { Toggle } from "@/design-system/ui/toggle"
import { HugeiconsIcon } from "@hugeicons/react"
import { TextBoldIcon, TextItalicIcon, TextUnderlineIcon, BookmarkIcon } from "@hugeicons/core-free-icons"

export default function ToggleExample() {
  return (
    <ExampleWrapper>
      <ToggleBasic />
      <ToggleOutline />
      <ToggleSizes />
      <ToggleWithButtonText />
      <ToggleWithButtonIcon />
      <ToggleWithButtonIconText />
      <ToggleDisabled />
      <ToggleWithIcon />
    </ExampleWrapper>
  )
}

function ToggleBasic() {
  return (
    <Example title="Basic">
      <div className="flex flex-wrap items-center gap-2">
        <Toggle aria-label="Toggle bold" defaultPressed>
          <HugeiconsIcon icon={TextBoldIcon} />
        </Toggle>
        <Toggle aria-label="Toggle italic">
          <HugeiconsIcon icon={TextItalicIcon} />
        </Toggle>
        <Toggle aria-label="Toggle underline">
          <HugeiconsIcon icon={TextUnderlineIcon} />
        </Toggle>
      </div>
    </Example>
  )
}

function ToggleOutline() {
  return (
    <Example title="Outline">
      <div className="flex flex-wrap items-center gap-2">
        <Toggle variant="outline" aria-label="Toggle italic">
          <HugeiconsIcon icon={TextItalicIcon} />
          Italic
        </Toggle>
        <Toggle variant="outline" aria-label="Toggle bold">
          <HugeiconsIcon icon={TextBoldIcon} />
          Bold
        </Toggle>
      </div>
    </Example>
  )
}

function ToggleSizes() {
  return (
    <Example title="Sizes">
      <div className="flex flex-wrap items-center gap-2">
        <Toggle variant="outline" aria-label="Toggle small" size="sm">
          Small
        </Toggle>
        <Toggle variant="outline" aria-label="Toggle default" size="default">
          Default
        </Toggle>
        <Toggle variant="outline" aria-label="Toggle large" size="lg">
          Large
        </Toggle>
      </div>
    </Example>
  )
}

function ToggleWithButtonText() {
  return (
    <Example title="With Button Text">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            Button
          </Button>
          <Toggle variant="outline" aria-label="Toggle sm" size="sm">
            Toggle
          </Toggle>
        </div>
        <div className="flex items-center gap-2">
          <Button size="default" variant="outline">
            Button
          </Button>
          <Toggle variant="outline" aria-label="Toggle default" size="default">
            Toggle
          </Toggle>
        </div>
        <div className="flex items-center gap-2">
          <Button size="lg" variant="outline">
            Button
          </Button>
          <Toggle variant="outline" aria-label="Toggle lg" size="lg">
            Toggle
          </Toggle>
        </div>
      </div>
    </Example>
  )
}

function ToggleWithButtonIcon() {
  return (
    <Example title="With Button Icon">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm">
            <HugeiconsIcon icon={TextBoldIcon} />
          </Button>
          <Toggle variant="outline" aria-label="Toggle sm icon" size="sm">
            <HugeiconsIcon icon={TextBoldIcon} />
          </Toggle>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <HugeiconsIcon icon={TextItalicIcon} />
          </Button>
          <Toggle
            variant="outline"
            aria-label="Toggle default icon"
            size="default"
          >
            <HugeiconsIcon icon={TextItalicIcon} />
          </Toggle>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-lg">
            <HugeiconsIcon icon={TextUnderlineIcon} />
          </Button>
          <Toggle variant="outline" aria-label="Toggle lg icon" size="lg">
            <HugeiconsIcon icon={TextUnderlineIcon} />
          </Toggle>
        </div>
      </div>
    </Example>
  )
}

function ToggleWithButtonIconText() {
  return (
    <Example title="With Button Icon + Text">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            <HugeiconsIcon icon={TextBoldIcon} data-icon="inline-start" />
            Button
          </Button>
          <Toggle variant="outline" aria-label="Toggle sm icon text" size="sm">
            <HugeiconsIcon icon={TextBoldIcon} />
            Toggle
          </Toggle>
        </div>
        <div className="flex items-center gap-2">
          <Button size="default" variant="outline">
            <HugeiconsIcon icon={TextItalicIcon} data-icon="inline-start" />
            Button
          </Button>
          <Toggle
            variant="outline"
            aria-label="Toggle default icon text"
            size="default"
          >
            <HugeiconsIcon icon={TextItalicIcon} />
            Toggle
          </Toggle>
        </div>
        <div className="flex items-center gap-2">
          <Button size="lg" variant="outline">
            <HugeiconsIcon icon={TextUnderlineIcon} data-icon="inline-start" />
            Button
          </Button>
          <Toggle variant="outline" aria-label="Toggle lg icon text" size="lg">
            <HugeiconsIcon icon={TextUnderlineIcon} />
            Toggle
          </Toggle>
        </div>
      </div>
    </Example>
  )
}

function ToggleDisabled() {
  return (
    <Example title="Disabled">
      <div className="flex flex-wrap items-center gap-2">
        <Toggle aria-label="Toggle disabled" disabled>
          Disabled
        </Toggle>
        <Toggle variant="outline" aria-label="Toggle disabled outline" disabled>
          Disabled
        </Toggle>
      </div>
    </Example>
  )
}

function ToggleWithIcon() {
  return (
    <Example title="With Icon">
      <div className="flex flex-wrap items-center gap-2">
        <Toggle aria-label="Toggle bookmark" defaultPressed>
          <HugeiconsIcon icon={BookmarkIcon} className="group-data-[state=on]/toggle:fill-accent-foreground" />
        </Toggle>
        <Toggle variant="outline" aria-label="Toggle bookmark outline">
          <HugeiconsIcon icon={BookmarkIcon} className="group-data-[state=on]/toggle:fill-accent-foreground" />
          Bookmark
        </Toggle>
      </div>
    </Example>
  )
}
