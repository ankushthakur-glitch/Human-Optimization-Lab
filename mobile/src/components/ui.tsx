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

import { IconEye, IconEyeOff } from "@/components/icons"
import { color, font, gutter, radius } from "@/lib/theme"

/* The few building blocks the patient app's screens share, built to the web
   portal's design system so the app and the portal look like one product:
   the sign-in frame of src/components/auth/auth-shell.tsx (lockup, title,
   form, copyright line), shadcn's filled inputs with the ring on focus, and
   the default button. No subtitles or hint lines, per the portal's copy
   rules. */

const LOGO = require("../../assets/logo-lockup.png")

/** A scrolling form screen that keeps its fields above the keyboard. */
export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Centred in the space above the copyright line, as the portal's
              sign-in frame centres its form. */}
          <View style={styles.body}>
            <Image
              source={LOGO}
              style={styles.logo}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel="Human Optimization Lab"
            />
            {children}
          </View>
          <Text style={styles.copyright}>
            © {new Date().getFullYear()} Human Optimization. All rights reserved.
          </Text>
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
      <View style={[styles.inputBox, focused && styles.inputBoxFocused, !!error && styles.inputBoxInvalid]}>
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

/** A text field with the portal's eye toggle to show or hide what's typed. */
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
            style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
            accessibilityRole="button"
            accessibilityLabel={visible ? "Hide password" : "Show password"}
          >
            {visible ? <IconEyeOff color={color.muted} /> : <IconEye color={color.muted} />}
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
  // On a wide screen the form keeps the portal's 420 width.
  scroll: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 420 + gutter * 2,
    alignSelf: "center",
    paddingHorizontal: gutter,
    paddingTop: 40,
    paddingBottom: 24,
  },
  body: { flex: 1, justifyContent: "center" },
  // The portal's h-10 lockup with 40 below it (mb-10).
  logo: { width: 160, height: 40, marginBottom: 40 },
  // text-2xl font-semibold tracking-tight, 32 below it (mb-8).
  title: {
    fontFamily: font.semibold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.6,
    color: color.text,
    marginBottom: 32,
  },

  field: { gap: 6 },
  label: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.text },
  required: { color: color.error },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: radius,
    backgroundColor: color.inputFill,
  },
  inputBoxFocused: { borderColor: color.ring, boxShadow: `0 0 0 3px ${color.ringHalo}` },
  inputBoxInvalid: { borderColor: color.error, boxShadow: `0 0 0 3px ${color.errorHalo}` },
  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 12,
    fontFamily: font.regular,
    fontSize: 16,
    color: color.text,
    // The box draws the focus state; the browser's own outline would double it.
    outlineWidth: 0,
  },
  error: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.error },
  toggle: {
    width: 32,
    height: 32,
    marginRight: 6,
    borderRadius: radius,
    alignItems: "center",
    justifyContent: "center",
  },
  togglePressed: { backgroundColor: color.border },

  formError: {
    borderRadius: radius,
    backgroundColor: color.errorTint,
    borderWidth: 1,
    borderColor: color.errorHalo,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  formErrorText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.error },

  button: {
    height: 44,
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
  buttonPending: { opacity: 0.7 },
  buttonText: { fontFamily: font.medium, fontSize: 14, color: color.onPrimary },
  buttonTextOutline: { color: color.text },

  footer: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", marginTop: 24 },
  footerText: { fontFamily: font.regular, fontSize: 14, color: color.muted },
  link: { fontFamily: font.medium, fontSize: 14, color: color.primary },

  copyright: {
    marginTop: 32,
    textAlign: "center",
    fontFamily: font.regular,
    fontSize: 12,
    color: color.muted,
  },
})
