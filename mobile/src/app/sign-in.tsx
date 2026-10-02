import { useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View, type TextInput } from "react-native"

import { Button, Divider, FormError, PasswordField, Screen, Stack, TextField, TextLink } from "@/components/ui"
import { IconCheck, IconFaceId, IconLock, IconMail } from "@/components/icons"
import { InstallApp } from "@/components/install-app"
import { useAuth } from "@/lib/auth"
import { color, font, touchRadius } from "@/lib/theme"
import { VALIDATE, emailError } from "@/lib/validate"

/** A returning patient: email and the password they set. Straight after
    creating a password (?created=1) it says the password is set, has the
    email filled in (?email=), so the new password is all there is to type.
    Nothing opens the keyboard by itself, so Sign in stays in view. Face ID is left out then: it can only be turned
    on in settings, once signed in. */
export default function SignInScreen() {
  const { signIn } = useAuth()
  const params = useLocalSearchParams<{ created?: string; email?: string }>()
  const created = params.created === "1"
  const [email, setEmail] = React.useState(params.email ?? "")
  const [password, setPassword] = React.useState("")
  const [errors, setErrors] = React.useState<{ email?: string; password?: string; form?: string }>({})
  const [pending, setPending] = React.useState(false)
  const passwordRef = React.useRef<TextInput>(null)

  async function onSubmit() {
    const found = { email: emailError(email), password: !VALIDATE || password ? undefined : "Enter your password." }
    setErrors(found)
    if (found.email || found.password) return
    setPending(true)
    const result = await signIn(email, password)
    setPending(false)
    if (!result.ok) setErrors({ form: result.message })
  }

  return (
    <Screen title={created ? "Sign in" : "Welcome back"}>
      <Stack>
        <FormError message={errors.form} />
        {created && !errors.form && (
          <View style={styles.notice} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <View style={styles.noticeMark}>
              <IconCheck size={12} color={color.onPrimary} strokeWidth={2.5} />
            </View>
            {/* One sentence a line, so neither ends on a lone word. */}
            <Text style={styles.noticeText}>{"Your password is set.\nSign in with your new password."}</Text>
          </View>
        )}
        <TextField
          label="Email"
          icon={IconMail}
          required
          value={email}
          onChangeText={setEmail}
          placeholder="Enter email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          error={errors.email}
        />
        <PasswordField
          ref={passwordRef}
          label="Password"
          icon={IconLock}
          required
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
          error={errors.password}
        />
        {/* Password reset and Face ID have no flow behind them yet. */}
        <TextLink onPress={() => {}}>Forgot password?</TextLink>
        <Button onPress={onSubmit} pending={pending}>
          Sign in
        </Button>
        {!created && (
          <>
            <Divider />
            <Button variant="outline" icon={IconFaceId} onPress={() => {}}>
              Sign in with Face ID
            </Button>
          </>
        )}
      </Stack>
      <InstallApp />
    </Screen>
  )
}

const styles = StyleSheet.create({
  // Where a form error shows, in the brand's tint: a soft borderless line.
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: touchRadius,
    backgroundColor: color.primaryTint,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.primary,
  },
  noticeText: { flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.text },
})
