import type { Metadata } from "next"
import { Suspense } from "react"

import { PracticeReportsScreen } from "@/components/practice/practice-reports"
import { LogoLoader } from "@/design-system/ui/logo-loader"

export const metadata: Metadata = { title: "Reports" }

/* The screen reads ?report=, and a component that reads search params
   needs a Suspense boundary to prerender. */
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <LogoLoader kind="ripple" label="Loading reports" />
        </div>
      }
    >
      <PracticeReportsScreen />
    </Suspense>
  )
}
