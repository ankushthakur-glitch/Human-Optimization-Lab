"use client"

import { IconUserAdd } from "@/design-system/icons"

import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import { Checkbox } from "@/design-system/ui/checkbox"
import { Progress } from "@/design-system/ui/progress"
import { Switch } from "@/design-system/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"
import { DmeAccentPicker } from "@/components/dme/dme-accent-picker"
import { useDmeAccent } from "@/components/dme/use-dme-accent"

function Preview({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <span className="text-xs font-semibold tracking-wide text-foreground/70 uppercase">{title}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

export default function CustomizationPage() {
  const accent = useDmeAccent()

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Customization</h1>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Primary colour</h2>
        <DmeAccentPicker value={accent} large />
      </section>

      <section className="mt-10 flex flex-col gap-3">
        <h2 className="font-medium">Preview</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Preview title="Buttons">
            <Button>
              <IconUserAdd />
              Add patient
            </Button>
            <Button variant="outline">Filters</Button>
            <Button variant="link">View chart</Button>
          </Preview>
          <Preview title="Tabs">
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All (12)</TabsTrigger>
                <TabsTrigger value="active">Active (7)</TabsTrigger>
                <TabsTrigger value="pending">Pending (3)</TabsTrigger>
              </TabsList>
            </Tabs>
          </Preview>
          <Preview title="Selection">
            <Checkbox defaultChecked aria-label="Selected" />
            <Switch defaultChecked aria-label="Enabled" />
            <Badge>New order</Badge>
            <span className="text-sm font-medium text-primary-tint">MRN-10241</span>
          </Preview>
          <Preview title="Progress">
            <Progress value={64} className="w-full" />
          </Preview>
          <Preview title="Navigation">
            <span className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
              Patients
            </span>
            <span className="rounded-lg bg-primary-surface px-3 py-2 text-sm font-medium text-primary-tint">
              Selected row
            </span>
          </Preview>
          <Preview title="Top bar">
            <span className="flex w-full items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
              <span className="rounded-full px-3 py-1 ring-2 ring-primary-foreground ring-inset">Dashboard</span>
              <span className="px-3 py-1">Scheduling</span>
              <span className="px-3 py-1">Patients</span>
            </span>
          </Preview>
        </div>
      </section>
    </div>
  )
}
