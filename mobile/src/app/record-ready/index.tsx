import { router, type Href } from "expo-router"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { IconChevronRight } from "@/components/icons"
import { RECORD_READY_VARIANTS } from "@/components/record-ready-variants"
import { Screen, Stack } from "@/components/ui"
import { color, font, radius } from "@/lib/theme"

/** Not a product screen: an index of the ten takes on "Your record is
    ready", like /errors, so each can be opened directly. */
export default function RecordReadyIndex() {
  return (
    <Screen title="Record ready variations">
      <Stack gap={12}>
        {RECORD_READY_VARIANTS.map(({ id, title }, i) => (
          <Pressable
            key={id}
            onPress={() => router.push(`/record-ready/${id}` as Href)}
            accessibilityRole="link"
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Text style={styles.number}>{i + 1}</Text>
            <Text style={styles.title}>{title}</Text>
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
  number: { width: 20, fontFamily: font.semibold, fontSize: 15, color: color.primary },
  title: { flex: 1, fontFamily: font.semibold, fontSize: 15, lineHeight: 22, color: color.text },
})
