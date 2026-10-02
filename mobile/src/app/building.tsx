import { router } from "expo-router"

import { BuildRecord } from "@/app/onboarding/syncing"

/** The record building after a later connect, back to the dashboard when
    it is ready, clearing the consent and the build off the history. */
export default function BuildingScreen() {
  return <BuildRecord onDone={() => router.dismissTo("/")} />
}
