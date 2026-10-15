import type { Metadata } from "next"
import { Suspense } from "react"

import { ProviderHomeV2 } from "@/components/provider/home-v2/provider-home"
import { LogoLoader } from "@/design-system/ui/logo-loader"

export const metadata: Metadata = { title: "Dashboard" }

/* The dashboard reads its tab from the search params, and a component that
   reads search params needs a Suspense boundary to prerender. */
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <LogoLoader kind="ripple" label="Loading dashboard" />
        </div>
      }
    >
      <ProviderHomeV2 />
    </Suspense>
  )
}
