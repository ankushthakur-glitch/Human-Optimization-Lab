
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"

import { ORB_GROUND } from "@/components/hol"
import { SiriSheet } from "@/components/voiceorbs/siri-sheet"
import { color, ink, space, type } from "@/lib/theme"

/* The assistant's third look (7 Oct 2026, from the client's reference
   screen): the live orb in its halo, "Your health, in context.", one line
   on what it can answer, then "Try asking one of these" as rounded pills that wrap, the
   composer ready under them. The pills are the chat's own topics, so a tap
   starts the same flow the greeting's rows always did. A question asked
   here starts a general health chat; the history drawer still files it by
   what it was about. */

export const DISCLAIMER = "Inlay provides general information, not medical advice."

const ORB = 80
const RING = ORB + 28

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
        <Text style={styles.line}>Ask questions about your results, medicines, appointments or anything in your record.</Text>
      </View>

      {options.length > 0 && (
      <View style={styles.tries}>
        <Text style={styles.label}>Try asking one of these</Text>
        <View style={styles.pills}>
          {options.map((o) => (
            <Pressable
              key={o}
              onPress={() => onPick(o)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
            >
              <Text style={styles.pillText}>{o}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      )}
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
  hero: { alignItems: "center", gap: space.item },
  // A soft teal halo round the orb, as the tab bar's ring, larger.
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 1,
    borderColor: color.primarySoft,
    backgroundColor: color.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...type.hero, textAlign: "center" },
  line: { ...type.body, textAlign: "center", paddingHorizontal: space.item },

  tries: { gap: space.item },
  label: { ...type.title },
  pills: { alignItems: "flex-start", gap: space.inline },
  pill: {
    maxWidth: "100%",
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: space.inline,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: color.primaryEdge,
    backgroundColor: color.primaryTint,
  },
  pillPressed: { backgroundColor: color.primarySoft },
  pillText: { ...type.chip, color: ink.primary },
})
