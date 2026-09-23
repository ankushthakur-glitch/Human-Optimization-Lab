import type { Metadata } from "next"
import { Suspense } from "react"

import { PracticesList } from "@/components/admin/practices-list"
import { LogoLoader } from "@/design-system/ui/logo-loader"

export const metadata: Metadata = { title: "Practices" }

/* The list reads ?new=1 (the palette's "Add practice"), and a component that
   reads search params needs a Suspense boundary to prerender. */
export default function PracticesScreen() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <LogoLoader kind="ripple" label="Loading practices" />
        </div>
      }
    >
      <PracticesList />
    </Suspense>
  )
}
