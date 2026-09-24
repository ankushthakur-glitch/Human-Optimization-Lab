import * as React from "react"
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { color, font, gutter, radius } from "@/lib/theme"

/* The few building blocks the patient app's screens share, styled after the
   web portal's auth screens: the lockup on top, a title, fields with the
   label close above the input, errors under the field, one full-width button.
   No subtitles or hint lines, per the portal's copy rules. */

const LOGO = require("../../assets/logo-lockup.png")

/** A scrolling form screen that keeps its fields above the keyboard. */
export function Screen({ children, logo = true }: { children: React.ReactNode; logo?: boolean }) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {logo && (
            <Image
              source={LOGO}
              style={styles.logo}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel="Human Optimization Lab"
            />
          )}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export function Title({ children }: { children: React.ReactNode }) {
  return (
    <Text style={styles.title} accessibilityRole="header">
      {children}
    </Text>
  )
}

/** A form-level message, e.g. credentials that don't match. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <View style={styles.formError} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.formErrorText}>{message}</Text>
    </View>
  )
}

type FieldProps = TextInputProps & {
  label: string
  required?: boolean
  error?: string
  /** Rendered inside the input's box, on the right. */
  trailing?: React.ReactNode
}

export const TextField = React.forwardRef<TextInput, FieldProps>(function TextField(
  { label, required, error, trailing, style, onFocus, onBlur, ...input },
  ref
) {
  const [focused, setFocused] = React.useState(false)
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <View
        style={[
          styles.inputBox,
          focused && styles.inputBoxFocused,
          !!error && styles.inputBoxInvalid,
        ]}
      >
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={color.placeholder}
          accessibilityLabel={label}
          accessibilityHint={error}
          {...input}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
        />
        {trailing}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
})

/** A text field with a Show / Hide toggle. */
export const PasswordField = React.forwardRef<TextInput, Omit<FieldProps, "trailing" | "secureTextEntry">>(
  function PasswordField(props, ref) {
    const [visible, setVisible] = React.useState(false)
    return (
      <TextField
        ref={ref}
        {...props}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        trailing={
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={8}
            style={styles.toggle}
            accessibilityRole="button"
            accessibilityLabel={visible ? "Hide password" : "Show password"}
          >
            <Text style={styles.toggleText}>{visible ? "Hide" : "Show"}</Text>
          </Pressable>
        }
      />
    )
  }
)

export function Button({
  children,
  onPress,
  pending = false,
  variant = "primary",
}: {
  children: string
  onPress: () => void
  pending?: boolean
  variant?: "primary" | "outline"
}) {
  const primary = variant === "primary"
  return (
    <Pressable
      onPress={onPress}
      disabled={pending}
      accessibilityRole="button"
      accessibilityState={{ disabled: pending, busy: pending }}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonOutline,
        pressed && (primary ? styles.buttonPrimaryPressed : styles.buttonOutlinePressed),
        pending && styles.buttonPending,
      ]}
    >
      {pending && <ActivityIndicator color={primary ? color.onPrimary : color.primary} size="small" />}
      <Text style={[styles.buttonText, !primary && styles.buttonTextOutline]}>{children}</Text>
    </Pressable>
  )
}

/** "Already set a password? Sign in", centred under the form. */
export function FooterLink({ prompt, action, onPress }: { prompt: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>{prompt} </Text>
      <Pressable onPress={onPress} hitSlop={8} accessibilityRole="link">
        <Text style={styles.link}>{action}</Text>
      </Pressable>
    </View>
  )
}

export const Stack = ({ children, gap = 20 }: { children: React.ReactNode; gap?: number }) => (
  <View style={{ gap }}>{children}</View>
)

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  fill: { flex: 1 },
  // On a wide screen (the web build) the form keeps a phone's width.
  scroll: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: gutter,
    paddingTop: 32,
    paddingBottom: 24,
  },
  logo: { width: 176, height: 44, marginBottom: 40 },
  title: { fontFamily: font.semibold, fontSize: 24, lineHeight: 32, color: color.text, marginBottom: 24 },

  field: { gap: 6 },
  label: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.text },
  required: { color: color.error },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius,
    backgroundColor: color.background,
  },
  inputBoxFocused: { borderColor: color.borderFocus, borderWidth: 1.5 },
  inputBoxInvalid: { borderColor: color.error },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: font.regular,
    fontSize: 16,
    color: color.text,
  },
  error: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.error },
  toggle: { paddingHorizontal: 14, paddingVertical: 12 },
  toggleText: { fontFamily: font.medium, fontSize: 14, color: color.primary },

  formError: {
    borderRadius: radius,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  formErrorText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: "#B91C1C" },

  button: {
    minHeight: 50,
    borderRadius: radius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  buttonPrimary: { backgroundColor: color.primary },
  buttonPrimaryPressed: { backgroundColor: color.primaryPressed },
  buttonOutline: { borderWidth: 1, borderColor: color.border, backgroundColor: color.background },
  buttonOutlinePressed: { backgroundColor: color.surface },
  buttonPending: { opacity: 0.8 },
  buttonText: { fontFamily: font.semibold, fontSize: 16, color: color.onPrimary },
  buttonTextOutline: { color: color.text },

  footer: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", marginTop: 24 },
  footerText: { fontFamily: font.regular, fontSize: 14, color: color.muted },
  link: { fontFamily: font.medium, fontSize: 14, color: color.primary },
})
