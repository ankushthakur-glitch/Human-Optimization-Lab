import type { Metadata } from "next"
import { Suspense } from "react"

import { LocationsScreen } from "@/components/practice/locations"
import { LogoLoader } from "@/design-system/ui/logo-loader"

export const metadata: Metadata = { title: "Locations" }

/* The screen reads ?new=1 (the palette's shortcut), and a component that
   reads search params needs a Suspense boundary to prerender. */
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <LogoLoader kind="ripple" label="Loading locations" />
        </div>
      }
    >
      <LocationsScreen />
    </Suspense>
  )
}
