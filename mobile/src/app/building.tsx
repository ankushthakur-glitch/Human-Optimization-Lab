import { router } from "expo-router"

import { BuildRecord } from "@/app/onboarding/syncing"

/** The record building after a later connect, back to the dashboard when
    it is ready. */
export default function BuildingScreen() {
  return <BuildRecord onDone={() => router.replace("/")} />
}
