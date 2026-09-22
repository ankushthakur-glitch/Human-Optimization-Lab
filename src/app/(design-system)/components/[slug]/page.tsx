import Link from "next/link"
import { notFound } from "next/navigation"
import dynamic from "next/dynamic"
import { IconChevronLeft, IconChevronRight, IconExternalLink } from "@/design-system/icons"

import { ALL_EXAMPLES, getExample, getExampleNeighbours } from "@/lib/examples"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/design-system/ui/breadcrumb"
import { Separator } from "@/design-system/ui/separator"
import { ComponentIcon } from "@/design-system/component-icon"

const REGISTRY: Record<string, React.ComponentType> = {
  accordion: dynamic(() => import("@/design-system/examples/accordion-example")),
  "alert-dialog": dynamic(() => import("@/design-system/examples/alert-dialog-example")),
  alert: dynamic(() => import("@/design-system/examples/alert-example")),
  "aspect-ratio": dynamic(() => import("@/design-system/examples/aspect-ratio-example")),
  attachment: dynamic(() => import("@/design-system/examples/attachment-example")),
  avatar: dynamic(() => import("@/design-system/examples/avatar-example")),
  badge: dynamic(() => import("@/design-system/examples/badge-example")),
  breadcrumb: dynamic(() => import("@/design-system/examples/breadcrumb-example")),
  bubble: dynamic(() => import("@/design-system/examples/bubble-example")),
  "button-group": dynamic(() => import("@/design-system/examples/button-group-example")),
  button: dynamic(() => import("@/design-system/examples/button-example")),
  calendar: dynamic(() => import("@/design-system/examples/calendar-example")),
  card: dynamic(() => import("@/design-system/examples/card-example")),
  carousel: dynamic(() => import("@/design-system/examples/carousel-example")),
  chart: dynamic(() => import("@/design-system/examples/chart-example")),
  checkbox: dynamic(() => import("@/design-system/examples/checkbox-example")),
  collapsible: dynamic(() => import("@/design-system/examples/collapsible-example")),
  combobox: dynamic(() => import("@/design-system/examples/combobox-example")),
  command: dynamic(() => import("@/design-system/examples/command-example")),
  "context-menu": dynamic(() => import("@/design-system/examples/context-menu-example")),
  dialog: dynamic(() => import("@/design-system/examples/dialog-example")),
  drawer: dynamic(() => import("@/design-system/examples/drawer-example")),
  "dropdown-menu": dynamic(() => import("@/design-system/examples/dropdown-menu-example")),
  empty: dynamic(() => import("@/design-system/examples/empty-example")),
  field: dynamic(() => import("@/design-system/examples/field-example")),
  "hover-card": dynamic(() => import("@/design-system/examples/hover-card-example")),
  "input-group": dynamic(() => import("@/design-system/examples/input-group-example")),
  "input-otp": dynamic(() => import("@/design-system/examples/input-otp-example")),
  input: dynamic(() => import("@/design-system/examples/input-example")),
  item: dynamic(() => import("@/design-system/examples/item-example")),
  kbd: dynamic(() => import("@/design-system/examples/kbd-example")),
  label: dynamic(() => import("@/design-system/examples/label-example")),
  marker: dynamic(() => import("@/design-system/examples/marker-example")),
  menubar: dynamic(() => import("@/design-system/examples/menubar-example")),
  "native-select": dynamic(() => import("@/design-system/examples/native-select-example")),
  "navigation-menu": dynamic(() => import("@/design-system/examples/navigation-menu-example")),
  pagination: dynamic(() => import("@/design-system/examples/pagination-example")),
  popover: dynamic(() => import("@/design-system/examples/popover-example")),
  progress: dynamic(() => import("@/design-system/examples/progress-example")),
  questionnaire: dynamic(() => import("@/design-system/examples/questionnaire-example")),
  "radio-group": dynamic(() => import("@/design-system/examples/radio-group-example")),
  resizable: dynamic(() => import("@/design-system/examples/resizable-example")),
  "scroll-area": dynamic(() => import("@/design-system/examples/scroll-area-example")),
  select: dynamic(() => import("@/design-system/examples/select-example")),
  separator: dynamic(() => import("@/design-system/examples/separator-example")),
  sheet: dynamic(() => import("@/design-system/examples/sheet-example")),
  "sidebar-floating": dynamic(() => import("@/design-system/examples/sidebar-floating-example")),
  "sidebar-icon": dynamic(() => import("@/design-system/examples/sidebar-icon-example")),
  "sidebar-inset": dynamic(() => import("@/design-system/examples/sidebar-inset-example")),
  sidebar: dynamic(() => import("@/design-system/examples/sidebar-example")),
  skeleton: dynamic(() => import("@/design-system/examples/skeleton-example")),
  slider: dynamic(() => import("@/design-system/examples/slider-example")),
  sonner: dynamic(() => import("@/design-system/examples/sonner-example")),
  spinner: dynamic(() => import("@/design-system/examples/spinner-example")),
  switch: dynamic(() => import("@/design-system/examples/switch-example")),
  table: dynamic(() => import("@/design-system/examples/table-example")),
  tabs: dynamic(() => import("@/design-system/examples/tabs-example")),
  textarea: dynamic(() => import("@/design-system/examples/textarea-example")),
  toast: dynamic(() => import("@/design-system/examples/toast-example")),
  "toggle-group": dynamic(() => import("@/design-system/examples/toggle-group-example")),
  toggle: dynamic(() => import("@/design-system/examples/toggle-example")),
  tooltip: dynamic(() => import("@/design-system/examples/tooltip-example")),
}

export function generateStaticParams() {
  return ALL_EXAMPLES.map((e) => ({ slug: e.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const example = getExample(slug)
  return { title: example ? `${example.title} — Clinic EHR Design System` : "Not found" }
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const example = getExample(slug)
  const Component = REGISTRY[slug]

  if (!example || !Component) {
    notFound()
  }

  const { previous, next } = getExampleNeighbours(slug)

  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Design System</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{example.group}</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{example.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="mb-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-surface text-primary-tint">
            <ComponentIcon slug={example.slug} className="size-5" />
          </span>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{example.title}</h1>
        </div>
        <p className="mt-3 max-w-2xl text-muted-foreground">{example.description}</p>
        {example.docs && (
          <a
            href={`https://ui.shadcn.com/docs/components/${example.docs}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            API reference on ui.shadcn.com
            <IconExternalLink className="size-3.5" />
          </a>
        )}
      </header>

      <div className="mb-8 rounded-xl border-l-2 border-l-primary bg-muted/40 px-4 py-3">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          When to use it
        </p>
        <p className="mt-1 text-sm">{example.guidance}</p>
      </div>

      <Separator className="mb-8" />

      <Component />

      <Separator className="mt-12 mb-6" />

      <nav className="flex items-stretch justify-between gap-4">
        {previous ? (
          <Link
            href={`/components/${previous.slug}`}
            className="group flex min-w-0 flex-1 items-center gap-2 rounded-xl border bg-card px-4 py-3 transition-colors hover:border-primary"
          >
            <IconChevronLeft className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block text-[11px] text-muted-foreground">Previous</span>
              <span className="block truncate text-sm font-medium">{previous.title}</span>
            </span>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        {next ? (
          <Link
            href={`/components/${next.slug}`}
            className="group flex min-w-0 flex-1 items-center justify-end gap-2 rounded-xl border bg-card px-4 py-3 text-right transition-colors hover:border-primary"
          >
            <span className="min-w-0">
              <span className="block text-[11px] text-muted-foreground">Next</span>
              <span className="block truncate text-sm font-medium">{next.title}</span>
            </span>
            <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        ) : (
          <span className="flex-1" />
        )}
      </nav>
    </div>
  )
}
