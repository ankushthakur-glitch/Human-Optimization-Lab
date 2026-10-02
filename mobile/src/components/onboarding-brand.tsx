import ChartLineData01Icon from "@hugeicons/core-free-icons/ChartLineData01Icon"
import MedicalFileIcon from "@hugeicons/core-free-icons/MedicalFileIcon"
import Notification01Icon from "@hugeicons/core-free-icons/Notification01Icon"
import Target02Icon from "@hugeicons/core-free-icons/Target02Icon"
import * as React from "react"
import { Image, StyleSheet, Text, View } from "react-native"

import { HugeIcon, type IconSvgObject } from "@/components/hugeicon"
import { cardRadius, color, font } from "@/lib/theme"

/* Activation's brand panel, asked for on the 30 Sep call: the Inlay Health
   lockup and a few short lines on what Inlay does for the patient, set
   under the code fields. Only activation shows it, so the shared form kit
   (ui.tsx) stays as every other screen draws it. */

const LOCKUP = require("../../assets/logo-lockup.png")

const OFFERS: { icon: IconSvgObject; label: string }[] = [
  { icon: MedicalFileIcon, label: "All your health records in one place" },
  { icon: ChartLineData01Icon, label: "Your results and trends, explained" },
  { icon: Notification01Icon, label: "Reminders for tests and visits" },
  { icon: Target02Icon, label: "A plan built around your goals" },
]

export function OnboardingBrand() {
  return (
    <View style={styles.panel}>
      <Image
        source={LOCKUP}
        style={styles.lockup}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="Inlay Health"
      />
      <View style={styles.rows}>
        {OFFERS.map((offer) => (
          <View key={offer.label} style={styles.row}>
            <View style={styles.icon}>
              <HugeIcon icon={offer.icon} size={18} color={color.primary} />
            </View>
            <Text style={styles.label}>{offer.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // A soft borderless panel on the white sheet, clear of the button above.
  panel: { marginTop: 32, padding: 20, gap: 18, borderRadius: cardRadius, backgroundColor: color.canvas },
  // The lockup's own 4:1 shape.
  lockup: { width: 112, height: 28 },
  rows: { gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.background,
  },
  label: { flex: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: color.text },
})
