"use client"

import { ProviderChartingHome } from "@/components/provider/home-v2/charting-home"
import { ProviderHomeV2 } from "@/components/provider/home-v2/provider-home"
import { useHomeVersion } from "@/components/provider/home-v2/version-switch"

/** The provider home in the version the URL names (?v=2), Version 1 by default. */
export function ProviderDashboard() {
  return useHomeVersion() === "2" ? <ProviderChartingHome /> : <ProviderHomeV2 />
}
