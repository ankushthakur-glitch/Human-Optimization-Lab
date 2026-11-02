import type { Metadata } from "next"
import { Suspense } from "react"

import { BillingScreen } from "@/components/admin/billing/billing"
import { LogoLoader } from "@/design-system/ui/logo-loader"

export const metadata: Metadata = { title: "Billing" }

/* The tab lives in ?tab=, and a component that reads search params needs a
   Suspense boundary to prerender. */
export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <LogoLoader kind="ripple" label="Loading billing" />
        </div>
      }
    >
      <BillingScreen />
    </Suspense>
  )
}
