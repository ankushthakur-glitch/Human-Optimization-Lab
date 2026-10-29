import { router } from "expo-router"
import type * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { PageHeader } from "@/components/hol"
import { Info } from "@/components/ph"
import { PlanStepPage } from "@/components/plan-steps"
import { font, ink, space, type } from "@/lib/theme"

/* The pages of the free plan and upgrade flow that come before the set-up's
   numbered steps (client deck, screens 20 to 23): the same frame as every
   plan step, with "Your personalized care plan" in the header in place of "Your plan" and
   the step count. Plus the small pieces the flow's pages share. */

/** One page before the numbered steps. `back` is where the caret and "Back"
    go when there is no screen behind (a link that opened the page). */
export function UpgradePage({
  back,
  onBack,
  headerTitle = "Your personalized care plan",
  fitHeader,
  ...rest
}: Omit<React.ComponentProps<typeof PlanStepPage>, "header" | "onBack"> & {
  back: string
  onBack?: () => void
  /** A long header title, kept on one line at a smaller size. */
  fitHeader?: boolean
}) {
  const go =
    onBack ??
    (() => {
      if (router.canGoBack()) router.back()
      else router.replace(back as never)
    })
  return (
    <PlanStepPage
      nextWide
      {...rest}
      onBack={go}
      headerTitle={headerTitle}
      header={fitHeader ? <PageHeader title={headerTitle} onBack={go} fitTitle /> : undefined}
    />
  )
}

/** A quiet line with an (i), under a list: the deck's small print. */
export function Fineprint({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.fine}>
      <Info size={14} color={ink.tertiary} />
      <Text style={styles.fineText}>{children}</Text>
    </View>
  )
}

/** A heading over a list with a quiet word at its right ("three signals"). */
export function ListHead({ title, aside, tone }: { title: string; aside?: string; tone?: "primary" }) {
  return (
    <View style={styles.listHead}>
      <Text style={styles.listTitle} accessibilityRole="header">
        {title}
      </Text>
      {!!aside && <Text style={[styles.listAside, tone === "primary" && { color: ink.primary, fontFamily: font.medium }]}>{aside}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  fine: { flexDirection: "row", alignItems: "flex-start", gap: space.inline, paddingTop: space.stack },
  fineText: { ...type.meta, flex: 1, lineHeight: 17 },
  listHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space.item, marginTop: space.inline },
  listTitle: { ...type.title, fontFamily: font.semibold, color: ink.strong },
  listAside: { ...type.label },
})
