import * as React from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"

import { Options } from "@/components/chat"
import { ORB_GROUND } from "@/components/hol"
import { SiriSheet } from "@/components/voiceorbs/siri-sheet"
import { color, space, type } from "@/lib/theme"

/* The assistant's second version (6 Oct 2026, from the client's "Ask
   Inlay" mock): instead of the category picker it opens on the live orb,
   one line on what it can answer and the chat's own topics to tap (the
   rows its greeting has always offered), with the
   composer ready under them. No AI credit banner here: credit stays on the
   orb's ring and the composer strip. A question asked here starts a
   general health chat; the history drawer still files it by what it was
   about. */

export const DISCLAIMER = "Inlay provides general information, not medical advice."

const ORB = 88
const RING = ORB + 24

export function AskWelcome({ options, onPick }: { options: string[]; onPick: (option: string) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.ring}>
          <SiriSheet size={ORB} background={ORB_GROUND} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Your health, in context.
        </Text>
        <Text style={styles.line}>Ask about your results, medicines, visits or anything in your record.</Text>
      </View>

      <View style={styles.tries}>
        <Text style={styles.label}>Start with one of these</Text>
        <Options options={options} live onPick={onPick} />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  body: {
    width: "100%",
    maxWidth: 420 + space.gutter * 2,
    alignSelf: "center",
    paddingHorizontal: space.gutter,
    paddingTop: space.section,
    paddingBottom: space.section,
    gap: space.section,
  },
  hero: { alignItems: "center", gap: space.inline },
  // A soft teal halo round the orb, as the tab bar's ring, larger.
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 1,
    borderColor: "#E6F3F2",
    backgroundColor: color.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.item,
  },
  title: { ...type.hero, textAlign: "center" },
  line: { ...type.body, textAlign: "center", paddingHorizontal: space.item },

  tries: { gap: space.item },
  label: { ...type.title },
})
