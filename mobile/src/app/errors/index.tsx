import { router, type Href } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { IconChevronRight } from "@/components/icons"
import { Screen, Stack } from "@/components/ui"
import { color, font, radius } from "@/lib/theme"

const STATES: { href: Href; title: string; when: string }[] = [
  {
    // No such route, on purpose: typed routes would refuse it uncast.
    href: "/errors/this-page-does-not-exist" as Href,
    title: "Page not found",
    when: "Any link or address with no screen behind it.",
  },
  {
    href: "/errors/session-expired",
    title: "Session expired",
    when: "After 15 minutes with no taps while signed in.",
  },
  {
    href: "/errors/offline",
    title: "No internet connection",
    when: "Covers any screen the moment the device goes offline, and lifts when it’s back.",
  },
  {
    href: "/errors/crash",
    title: "Something went wrong",
    when: "A screen that fails to load.",
  },
]

/** Not a product screen: an index so each state can be opened directly,
    like the portal's /screens/errors. */
export default function ErrorStatesIndex() {
  return (
    <Screen title="Error states">
      <Stack gap={12}>
        {STATES.map(({ href, title, when }) => (
          <Pressable
            key={title}
            onPress={() => router.push(href)}
            accessibilityRole="link"
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rowBody}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.when}>{when}</Text>
            </View>
            <IconChevronRight color={color.muted} />
          </Pressable>
        ))}
      </Stack>
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius * 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowPressed: { backgroundColor: color.surface },
  rowBody: { flex: 1, gap: 2 },
  title: { fontFamily: font.semibold, fontSize: 15, lineHeight: 22, color: color.text },
  when: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.muted },
})
