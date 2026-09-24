import { router } from "expo-router"
import * as React from "react"
import type { TextInput } from "react-native"

import { Button, FooterLink, FormError, PasswordField, Screen, Stack, TextField, Title } from "@/components/ui"
import { InstallApp } from "@/components/install-app"
import { useAuth } from "@/lib/auth"
import { emailError } from "@/lib/validate"

/** A returning patient: email and the password they set. */
export default function SignInScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [errors, setErrors] = React.useState<{ email?: string; password?: string; form?: string }>({})
  const [pending, setPending] = React.useState(false)
  const passwordRef = React.useRef<TextInput>(null)

  async function onSubmit() {
    const found = { email: emailError(email), password: password ? undefined : "Enter your password." }
    setErrors(found)
    if (found.email || found.password) return
    setPending(true)
    const result = await signIn(email, password)
    setPending(false)
    if (!result.ok) setErrors({ form: result.message })
  }

  return (
    <Screen>
      <Title>Sign in</Title>
      <Stack>
        <FormError message={errors.form} />
        <TextField
          label="Email"
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
          required
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
          error={errors.password}
        />
        <Button onPress={onSubmit} pending={pending}>
          Sign In
        </Button>
      </Stack>
      <FooterLink
        prompt="Have a one-time password?"
        action="Activate your account"
        onPress={() => router.replace("/activate")}
      />
      <InstallApp />
    </Screen>
  )
}
