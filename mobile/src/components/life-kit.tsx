import * as React from "react"
import { StyleSheet, View } from "react-native"

import { Brain, Coins, Compass, HandHeart, Heart, Moon, Scales, ShieldCheck, UsersThree } from "@/components/ph"
import { HUE, type Hue } from "@/components/record-kit"
import type { DomainKey } from "@/lib/wellbeing"

/* What the life questions share (app/onboarding/life*.tsx): each part of
   life's icon, hue and tile. */

type IconProps = { size?: number; color?: string }

/** Each part of life, its icon and its hue, as the improve list draws it. */
export const DOMAIN_LOOK: Record<DomainKey, { icon: React.ComponentType<IconProps>; hue: Hue }> = {
  physical: { icon: Heart, hue: "red" },
  emotional: { icon: Moon, hue: "blue" },
  relationships: { icon: UsersThree, hue: "teal" },
  purpose: { icon: Compass, hue: "amber" },
  intellectual: { icon: Brain, hue: "violet" },
  contribution: { icon: Scales, hue: "amber" },
  financial: { icon: Coins, hue: "neutral" },
  agency: { icon: ShieldCheck, hue: "green" },
}

/** A part of life as a small tile: its icon in its own colour on its tint. */
export function DomainTile({ domain, size = 28 }: { domain: DomainKey; size?: number }) {
  const { icon: Icon, hue } = DOMAIN_LOOK[domain]
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size / 2, backgroundColor: HUE[hue].tint }]}>
      <Icon size={Math.round(size * 0.57)} color={HUE[hue].ink} />
    </View>
  )
}

const styles = StyleSheet.create({
  tile: { alignItems: "center", justifyContent: "center" },
})
