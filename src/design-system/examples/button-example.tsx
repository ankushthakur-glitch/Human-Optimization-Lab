"use client"

import {
  Example,
  ExampleWrapper,
} from "@/design-system/examples/example"
import { Button, buttonVariants } from "@/design-system/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight02Icon, CircleArrowLeft02Icon } from "@hugeicons/core-free-icons"

export default function ButtonExample() {
  return (
    <ExampleWrapper className="lg:grid-cols-1 2xl:grid-cols-1">
      <ButtonVariantsAndSizes />
      <ButtonIconRight />
      <ButtonIconLeft />
      <ButtonIconOnly />
      <ButtonInvalidStates />
      <ButtonExamples />
    </ExampleWrapper>
  )
}

function ButtonVariantsAndSizes() {
  return (
    <Example title="Variants & Sizes">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="xs">Default</Button>
        <Button size="xs" variant="secondary">
          Secondary
        </Button>
        <Button size="xs" variant="outline">
          Outline
        </Button>
        <Button size="xs" variant="ghost">
          Ghost
        </Button>
        <Button size="xs" variant="destructive">
          Destructive
        </Button>
        <Button size="xs" variant="link">
          Link
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm">Default</Button>
        <Button size="sm" variant="secondary">
          Secondary
        </Button>
        <Button size="sm" variant="outline">
          Outline
        </Button>
        <Button size="sm" variant="ghost">
          Ghost
        </Button>
        <Button size="sm" variant="destructive">
          Destructive
        </Button>
        <Button size="sm" variant="link">
          Link
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg">Default</Button>
        <Button size="lg" variant="secondary">
          Secondary
        </Button>
        <Button size="lg" variant="outline">
          Outline
        </Button>
        <Button size="lg" variant="ghost">
          Ghost
        </Button>
        <Button size="lg" variant="destructive">
          Destructive
        </Button>
        <Button size="lg" variant="link">
          Link
        </Button>
      </div>
    </Example>
  )
}

function ButtonIconRight() {
  return (
    <Example title="Icon Right">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="xs">
          Default{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
        <Button size="xs" variant="secondary">
          Secondary{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
        <Button size="xs" variant="outline">
          Outline{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
        <Button size="xs" variant="ghost">
          Ghost{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
        <Button size="xs" variant="destructive">
          Destructive{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
        <Button size="xs" variant="link">
          Link{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm">
          Default
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
        <Button size="sm" variant="secondary">
          Secondary{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
        <Button size="sm" variant="outline">
          Outline{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
        <Button size="sm" variant="ghost">
          Ghost{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
        <Button size="sm" variant="destructive">
          Destructive{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
        <Button size="sm" variant="link">
          Link{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button>
          Default{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
        <Button variant="secondary">
          Secondary{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
        <Button variant="outline">
          Outline{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
        <Button variant="ghost">
          Ghost{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
        <Button variant="destructive">
          Destructive{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
        <Button variant="link">
          Link{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg">
          Default{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
        <Button size="lg" variant="secondary">
          Secondary{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
        <Button size="lg" variant="outline">
          Outline{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
        <Button size="lg" variant="ghost">
          Ghost{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
        <Button size="lg" variant="destructive">
          Destructive{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
        <Button size="lg" variant="link">
          Link{" "}
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
      </div>
    </Example>
  )
}

function ButtonIconLeft() {
  return (
    <Example title="Icon Left">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="xs">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Default
        </Button>
        <Button size="xs" variant="secondary">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Secondary
        </Button>
        <Button size="xs" variant="outline">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Outline
        </Button>
        <Button size="xs" variant="ghost">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Ghost
        </Button>
        <Button size="xs" variant="destructive">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Destructive
        </Button>
        <Button size="xs" variant="link">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Link
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Default
        </Button>
        <Button size="sm" variant="secondary">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Secondary
        </Button>
        <Button size="sm" variant="outline">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Outline
        </Button>
        <Button size="sm" variant="ghost">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Ghost
        </Button>
        <Button size="sm" variant="destructive">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Destructive
        </Button>
        <Button size="sm" variant="link">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Link
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button>
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Default
        </Button>
        <Button variant="secondary">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Secondary
        </Button>
        <Button variant="outline">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Outline
        </Button>
        <Button variant="ghost">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Ghost
        </Button>
        <Button variant="destructive">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Destructive
        </Button>
        <Button variant="link">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Link
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Default
        </Button>
        <Button size="lg" variant="secondary">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Secondary
        </Button>
        <Button size="lg" variant="outline">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Outline
        </Button>
        <Button size="lg" variant="ghost">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Ghost
        </Button>
        <Button size="lg" variant="destructive">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Destructive
        </Button>
        <Button size="lg" variant="link">
          <HugeiconsIcon icon={CircleArrowLeft02Icon} data-icon="inline-start" />{" "}
          Link
        </Button>
      </div>
    </Example>
  )
}

function ButtonIconOnly() {
  return (
    <Example title="Icon Only">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="icon-xs">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
        <Button size="icon-xs" variant="secondary">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
        <Button size="icon-xs" variant="outline">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
        <Button size="icon-xs" variant="ghost">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
        <Button size="icon-xs" variant="destructive">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
        <Button size="icon-xs" variant="link">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="icon-sm">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
        <Button size="icon-sm" variant="secondary">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
        <Button size="icon-sm" variant="outline">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
        <Button size="icon-sm" variant="ghost">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
        <Button size="icon-sm" variant="destructive">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
        <Button size="icon-sm" variant="link">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="icon">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
        <Button size="icon" variant="secondary">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
        <Button size="icon" variant="outline">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
        <Button size="icon" variant="ghost">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
        <Button size="icon" variant="destructive">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
        <Button size="icon" variant="link">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="icon-lg">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
        <Button size="icon-lg" variant="secondary">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
        <Button size="icon-lg" variant="outline">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
        <Button size="icon-lg" variant="ghost">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
        <Button size="icon-lg" variant="destructive">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
        <Button size="icon-lg" variant="link">
          <HugeiconsIcon icon={ArrowRight02Icon} />
        </Button>
      </div>
    </Example>
  )
}

function ButtonExamples() {
  return (
    <Example title="Examples">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline">Cancel</Button>
          <Button>
            Submit{" "}
            <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="destructive">Delete</Button>
          <Button size="icon">
            <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
          </Button>
        </div>
        <a href="#" className={buttonVariants()}>
          Link
        </a>
      </div>
    </Example>
  )
}

function ButtonInvalidStates() {
  return (
    <Example title="Invalid States">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="xs" aria-invalid="true">
          Default
        </Button>
        <Button size="xs" variant="secondary" aria-invalid="true">
          Secondary
        </Button>
        <Button size="xs" variant="outline" aria-invalid="true">
          Outline
        </Button>
        <Button size="xs" variant="ghost" aria-invalid="true">
          Ghost
        </Button>
        <Button size="xs" variant="destructive" aria-invalid="true">
          Destructive
        </Button>
        <Button size="xs" variant="link" aria-invalid="true">
          Link
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" aria-invalid="true">
          Default
        </Button>
        <Button size="sm" variant="secondary" aria-invalid="true">
          Secondary
        </Button>
        <Button size="sm" variant="outline" aria-invalid="true">
          Outline
        </Button>
        <Button size="sm" variant="ghost" aria-invalid="true">
          Ghost
        </Button>
        <Button size="sm" variant="destructive" aria-invalid="true">
          Destructive
        </Button>
        <Button size="sm" variant="link" aria-invalid="true">
          Link
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button aria-invalid="true">Default</Button>
        <Button variant="secondary" aria-invalid="true">
          Secondary
        </Button>
        <Button variant="outline" aria-invalid="true">
          Outline
        </Button>
        <Button variant="ghost" aria-invalid="true">
          Ghost
        </Button>
        <Button variant="destructive" aria-invalid="true">
          Destructive
        </Button>
        <Button variant="link" aria-invalid="true">
          Link
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" aria-invalid="true">
          Default
        </Button>
        <Button size="lg" variant="secondary" aria-invalid="true">
          Secondary
        </Button>
        <Button size="lg" variant="outline" aria-invalid="true">
          Outline
        </Button>
        <Button size="lg" variant="ghost" aria-invalid="true">
          Ghost
        </Button>
        <Button size="lg" variant="destructive" aria-invalid="true">
          Destructive
        </Button>
        <Button size="lg" variant="link" aria-invalid="true">
          Link
        </Button>
      </div>
    </Example>
  )
}
