"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  IconArrowLeft,
  IconCheckCircle,
  IconInfo,
  IconShieldCheck,
} from "@/design-system/icons"

import { EhrShell } from "@/components/ehr-shell"
import { AddPatientForm } from "@/components/add-patient-form"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/design-system/ui/breadcrumb"
import { Button } from "@/design-system/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/ui/card"
import { Separator } from "@/design-system/ui/separator"

const CHECKLIST = [
  { label: "Identity verified against photo ID", done: true },
  { label: "Insurance card scanned", done: false },
  { label: "Consent and privacy notice signed", done: true },
  { label: "Preferred pharmacy captured", done: false },
]

export default function NewPatientPage() {
  const router = useRouter()

  return (
    <EhrShell active="patients">
      {/* page header */}
      <div className="shrink-0 border-b bg-background px-4 py-4 sm:px-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/screens/patients" />}>Patients</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>New patient</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Register a new patient
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The full record: identity, contact, care team, coverage and consent.
            </p>
          </div>
          <Button variant="ghost" size="sm" render={<Link href="/screens/patients" />}>
            <IconArrowLeft />
            Back to worklist
          </Button>
        </div>
      </div>

      {/* body */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30">
        <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <Card>
            <CardContent className="pt-6">
              <AddPatientForm
                id="add-patient-page"
                variant="full"
                onSubmit={() => {
                  toast.success("Patient record created", {
                    description: "Saved from the full page. Returning to the worklist.",
                  })
                  router.push("/screens/patients")
                }}
              />
            </CardContent>
          </Card>

          {/* The aside is the reason this presentation exists: a whole page has
              room for guidance a modal would have to drop. */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-0 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Registration checklist</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5 text-sm">
                {CHECKLIST.map((item) => (
                  <div key={item.label} className="flex items-start gap-2">
                    <IconCheckCircle
                      className={
                        item.done
                          ? "mt-0.5 size-4 shrink-0 text-success"
                          : "mt-0.5 size-4 shrink-0 text-muted-foreground/40"
                      }
                    />
                    <span className={item.done ? "text-muted-foreground" : ""}>{item.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <IconShieldCheck className="size-4 text-primary-tint" />
                  Duplicate check
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Name, date of birth and phone are matched against existing records before the
                chart is created. Near matches are surfaced for review rather than blocked.
              </CardContent>
            </Card>

            <div className="flex items-start gap-2 rounded-xl border bg-card p-4 text-xs text-muted-foreground">
              <IconInfo className="mt-0.5 size-4 shrink-0" />
              <span>
                Same form as the two overlays on the worklist — the page adds coverage, address
                and consent.
              </span>
            </div>
          </aside>
        </div>
      </div>

      {/* sticky action bar */}
      <div className="shrink-0 border-t bg-background">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <span className="text-xs text-muted-foreground">
            Draft is not saved automatically.
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" render={<Link href="/screens/patients" />}>
              Cancel
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline">Save as draft</Button>
            <Button type="submit" form="add-patient-page">
              Create patient
            </Button>
          </div>
        </div>
      </div>
    </EhrShell>
  )
}
