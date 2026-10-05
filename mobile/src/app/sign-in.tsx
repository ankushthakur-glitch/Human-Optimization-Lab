import { useLocalSearchParams } from "expo-router"
import * as React from "react"
import { type TextInput } from "react-native"

import { Button, Divider, FormError, PasswordField, Screen, Stack, TextField, TextLink } from "@/components/ui"
import { IconFaceId, IconLock, IconMail } from "@/components/icons"
import { InstallApp } from "@/components/install-app"
import { useAuth } from "@/lib/auth"
import { VALIDATE, emailError } from "@/lib/validate"

/** A returning patient: email and the password they set. Straight after
    creating a password (?created=1) it has the email filled in (?email=),
    so the new password is all there is to type.
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
