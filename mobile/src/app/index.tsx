import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { Button, Screen, Stack, Title } from "@/components/ui"
import { InstallApp } from "@/components/install-app"
import { useAuth } from "@/lib/auth"
import { PATIENT } from "@/lib/patient"
import { color, font, radius } from "@/lib/theme"

/** Where a signed-in patient lands. A placeholder until the app's real home. */
export default function HomeScreen() {
  const { signOut } = useAuth()
  const details = [
    { label: "Name", value: `${PATIENT.firstName} ${PATIENT.lastName}` },
    { label: "Email", value: PATIENT.email },
    { label: "Practice", value: PATIENT.practice },
  ]

  return (
    <Screen>
      <Title>Welcome, {PATIENT.firstName}</Title>
      <Stack gap={24}>
        <View style={styles.card}>
          {details.map(({ label, value }) => (
            <Text key={label} style={styles.row}>
              <Text style={styles.label}>{label} : </Text>
              {value}
            </Text>
          ))}
        </View>
        <Button variant="outline" onPress={signOut}>
          Sign out
        </Button>
      </Stack>
      <InstallApp />
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius,
    padding: 16,
  },
  row: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: color.text },
  label: { fontFamily: font.medium, color: color.muted },
})
