import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import type { TextInput } from "react-native"

import { Button, FooterLink, FormError, PasswordField, Screen, Stack, TextField, Title } from "@/components/ui"
import { InstallApp } from "@/components/install-app"
import { useAuth } from "@/lib/auth"
import { emailError } from "@/lib/validate"

/** First sign-in, with the email and one-time password from the invitation.
    The email's app link (hol://activate?email=...) fills the email in. */
export default function ActivateScreen() {
  const { activate } = useAuth()
  const params = useLocalSearchParams<{ email?: string }>()
  const [email, setEmail] = React.useState(params.email ?? "")
  const [code, setCode] = React.useState("")
  const [errors, setErrors] = React.useState<{ email?: string; code?: string; form?: string }>({})
  const [pending, setPending] = React.useState(false)
  const codeRef = React.useRef<TextInput>(null)

  async function onSubmit() {
    const found = {
      email: emailError(email),
      code: code.trim() ? undefined : "Enter the one-time password from your invitation email.",
    }
    setErrors(found)
    if (found.email || found.code) return
    setPending(true)
    const result = await activate(email, code)
    setPending(false)
    // On success the route guard moves the patient on to set a password.
    if (!result.ok) setErrors({ form: result.message })
  }

  return (
    <Screen>
      <Title>Activate your account</Title>
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
          onSubmitEditing={() => codeRef.current?.focus()}
          error={errors.email}
        />
        <PasswordField
          ref={codeRef}
          label="One-time password"
          required
          value={code}
          onChangeText={setCode}
          placeholder="From your invitation email"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
          error={errors.code}
        />
        <Button onPress={onSubmit} pending={pending}>
          Continue
        </Button>
      </Stack>
      <FooterLink prompt="Already set a password?" action="Sign in" onPress={() => router.replace("/sign-in")} />
      <InstallApp />
    </Screen>
  )
}
