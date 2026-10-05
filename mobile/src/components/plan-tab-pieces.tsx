import * as React from "react"
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"

import { Bone, Drop, Heartbeat, Scales } from "@/components/ph"
import type { FocusArea } from "@/lib/record"
import { card, color, font, ink, space } from "@/lib/theme"

/* The icon of what a plan works on, shared by the plan screens (the free
   Plan tab and its showroom, the plan page, the member's own plan) and the
   score page, so a focus area is drawn the same way before she joins and
   after (its name is lib/offers.ts FOCUS_NAME, never a disease name, F-88,
   B-07). The ticked lines every list of the plan is made of are the record
   kit's CheckLines.

   Also the member pages' teal tinted head card (Figma "Hol", 5 Oct: the
   card on top of "A plan built around you" and of a result's page), which
   sums up a page in place of the old white card with a 3D object. */

const FOCUS_ICON: Record<FocusArea, React.ComponentType<{ size?: number; color?: string }>> = {
  "blood sugar": Drop,
  weight: Scales,
  heart: Heartbeat,
  bone: Bone,
}

/** A focus area's Phosphor icon, for its tile. */
export function FocusIcon({ area, size = 16, color: tint = color.primary }: { area: FocusArea; size?: number; color?: string }) {
  const Glyph = FOCUS_ICON[area]
  return <Glyph size={size} color={tint} />
}

/** The teal tinted card that sums up a page: Primary/00 inside a 1 pt
    Primary/02 edge, radius 8, 12 inside. */
export function HeadCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.head, style]}>{children}</View>
}

/** Words on a head card: its title (16 medium Grey/09), a line under it
    (14 regular Grey/08) and meta (12 regular Grey/07). */
export const headText = StyleSheet.create({
  title: { fontFamily: font.medium, fontSize: 16, lineHeight: 22, color: ink.content },
  line: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: ink.detail },
  meta: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: ink.secondary },
})

const styles = StyleSheet.create({
  head: {
    gap: space.stack,
    padding: 11.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: color.primaryEdge,
    backgroundColor: color.primaryTint,
    boxShadow: card.shadow,
  },
})
