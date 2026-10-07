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
  useWindowDimensions,
  type TextInputProps,
  type TextStyle,
} from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import Svg, { Circle } from "react-native-svg"

import { IconEye, IconEyeOff } from "@/components/icons"
import { buttonRadius, color, font, gutter, radius, touchRadius } from "@/lib/theme"

/* The few building blocks the patient app's screens share, built to the web
   portal's design system so the app and the portal look like one product:
   outlined inputs and the default button, sized up for thumbs and set on a
   teal band and a white sheet. No subtitles or hint lines, per the portal's
   copy rules. */

const MARK = require("../../assets/logo-mark-white.png")

/** On a wide browser the web build sits in a drawn phone (public/index.html)
    whose 44px status bar overlays the app, so the band clears it as it
    clears a real one. The breakpoint matches that page's media query. */
export function useTopInset() {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  if (Platform.OS === "web" && width >= 640) return Math.max(insets.top, 44)
  return insets.top
}

/** A scrolling form screen that keeps its fields above the keyboard: the
    white mark and the screen's title on a teal band, the form on a white
    sheet rising over it. A `description` line may sit under the title, as
    the portal's sign-in pages do. */
export function Screen({
  title,
  description,
  children,
}: {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
}) {
  const top = useTopInset()
  return (
    <ButtonLook.Provider value="figma">
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.hero, { paddingTop: top + 64 }]}>
              <HeroArt />
              <View style={styles.heroBody}>
                <Image
                  source={MARK}
                  style={styles.mark}
                  resizeMode="contain"
                  accessibilityRole="image"
                  accessibilityLabel="Inlay Health"
                />
                <Text style={styles.title} accessibilityRole="header">
                  {title}
                </Text>
                {description && <Text style={styles.description}>{description}</Text>}
              </View>
            </View>
            <View style={styles.sheet}>
              <View style={styles.sheetBody}>{children}</View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ButtonLook.Provider>
  )
}

/** The band's art: a wide white ring off the top right corner and a soft
    disc at the bottom left, pinned to the right edge whatever the width. */
function HeroArt() {
  return (
    <Svg style={styles.heroArt} viewBox="0 0 390 320" preserveAspectRatio="xMaxYMin slice">
      <Circle cx="360" cy="30" r="170" fill="none" stroke={color.onPrimary} strokeOpacity={0.08} strokeWidth={40} />
      <Circle cx="20" cy="300" r="90" fill={color.onPrimary} fillOpacity={0.05} />
    </Svg>
  )
}

/** A right-aligned text link under a field, e.g. "Forgot password?". */
export function TextLink({ children, onPress }: { children: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="link" style={styles.textLink}>
      <Text style={styles.link}>{children}</Text>
    </Pressable>
  )
}

/** A hairline with "or" between two ways to sign in. */
export function Divider() {
  return (
    <View style={styles.divider}>
      <View style={styles.rule} />
      <Text style={styles.dividerText}>or</Text>
      <View style={styles.rule} />
    </View>
  )
}

/** The one-time code input: one plain field, digits only, so paste and the
    keyboard's code suggestion fill it. Calls `onComplete` on the sixth
    digit. */
export function CodeField({
  label,
  value,
  onChange,
  onComplete,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  error?: string
}) {
  return (
    <TextField
      label={label}
      value={value}
      onChangeText={(text) => {
        const digits = text.replace(/\D/g, "").slice(0, 6)
        onChange(digits)
        if (digits.length === 6) onComplete?.(digits)
      }}
      error={error}
      placeholder="6-digit code"
      keyboardType="number-pad"
      maxLength={6}
      autoComplete="one-time-code"
      textContentType="oneTimeCode"
    />
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
  /** Drawn inside the input's box, on the left; teal while focused. */
  icon?: React.ComponentType<{ color: string }>
  /** Rendered inside the input's box, on the right. */
  trailing?: React.ReactNode
}

export const TextField = React.forwardRef<TextInput, FieldProps>(function TextField(
  { label, required, error, icon: Icon, trailing, style, onFocus, onBlur, multiline, ...input },
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
          multiline && styles.inputBoxMultiline,
          focused && styles.inputBoxFocused,
          !!error && styles.inputBoxInvalid,
        ]}
      >
        {Icon && (
          <View style={styles.leading}>
            <Icon color={error ? color.error : focused ? color.primary : color.muted} />
          </View>
        )}
        <TextInput
          ref={ref}
          style={[styles.input, !!Icon && styles.inputWithIcon, multiline && styles.inputMultiline, style]}
          multiline={multiline}
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

/** Which button a screen draws. Every screen draws the Figma "Hol" button
    (the user moved sign in and activation to it on 5 Oct); "classic" keeps
    the earlier pill for anything that opts back in. */
export const ButtonLook = React.createContext<"figma" | "classic">("figma")

export function Button({
  children,
  onPress,
  pending = false,
  disabled = false,
  variant = "primary",
  icon: Icon,
  trailing: Trailing,
}: {
  children: string
  onPress: () => void
  pending?: boolean
  /** Greyed and inert until the step can go on, e.g. an unsigned consent. */
  disabled?: boolean
  /** outline: the teal tinted secondary button (classic: white with a grey
      edge). destructive: soft red (tint fill, red words), for Log out and other ways out
      (classic: the red tint). */
  variant?: "primary" | "outline" | "destructive"
  /** Drawn before the label, e.g. Face ID on the outline button. */
  icon?: React.ComponentType<{ color: string }>
  /** Drawn after the label, e.g. an arrow on a button that moves on. */
  trailing?: React.ComponentType<{ color: string }>
}) {
  const classic = React.useContext(ButtonLook) === "classic"
  const primary = variant === "primary"
  const destructive = variant === "destructive"
  if (classic)
    return (
      <Pressable
        onPress={onPress}
        disabled={pending || disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: pending || disabled, busy: pending }}
        style={({ pressed }) => [
          styles.button,
          primary ? styles.buttonPrimary : styles.buttonOutline,
          destructive && styles.buttonDestructive,
          pressed &&
            (primary ? styles.buttonPrimaryPressed : destructive ? styles.buttonDestructivePressed : styles.buttonOutlinePressed),
          pending && styles.buttonPending,
          disabled && styles.buttonDisabled,
        ]}
      >
        {pending && <ActivityIndicator color={primary ? color.onPrimary : destructive ? color.error : color.primary} size="small" />}
        {!pending && Icon && <Icon color={color.text} />}
        <Text style={[styles.buttonText, !primary && styles.buttonTextOutline, destructive && styles.buttonTextDestructive]}>
          {children}
        </Text>
      </Pressable>
    )
  return (
    <Pressable
      onPress={onPress}
      disabled={pending || disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: pending || disabled, busy: pending }}
      style={({ pressed }) => [
        styles.hol,
        primary ? styles.holPrimary : styles.holOutline,
        destructive && styles.holDestructive,
        pressed && (primary ? styles.holPrimaryPressed : destructive ? styles.holDestructivePressed : styles.holOutlinePressed),
        pending && styles.buttonPending,
        disabled && styles.buttonDisabled,
      ]}
    >
      {pending && <ActivityIndicator color={primary ? color.onPrimary : destructive ? color.error : color.primary} size="small" />}
      {!pending && Icon && <Icon color={primary ? color.onPrimary : destructive ? color.error : "#015D59"} />}
      <Text style={[styles.holText, !primary && styles.holTextOutline, destructive && styles.holTextDestructive]}>{children}</Text>
      {!pending && Trailing && <Trailing color={primary ? color.onPrimary : destructive ? color.error : "#015D59"} />}
    </Pressable>
  )
}

/** "Already set a password? Sign in", at the foot of the sheet. */
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
  scroll: { flexGrow: 1 },
  hero: { paddingBottom: 72, overflow: "hidden", backgroundColor: color.primary },
  heroArt: { position: "absolute", top: 0, right: 0, width: 390, height: 320 },
  heroBody: {
    width: "100%",
    maxWidth: 420 + gutter * 2,
    alignSelf: "center",
    paddingHorizontal: gutter,
    gap: 22,
  },
  mark: { width: 36, height: 43 },
  // Rises 28 over the band so the band reads as the sheet's backdrop.
  sheet: {
    flex: 1,
    marginTop: -28,
    backgroundColor: color.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 32,
    paddingBottom: 24,
  },
  // On a wide screen the form keeps the portal's 420 width.
  sheetBody: {
    flex: 1,
    width: "100%",
    maxWidth: 420 + gutter * 2,
    alignSelf: "center",
    paddingHorizontal: gutter,
  },
  title: {
    fontFamily: font.semibold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
    color: color.onPrimary,
  },

  description: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: color.onPrimary, opacity: 0.85, marginTop: -12 },

  field: { gap: 6 },
  label: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.text },
  required: { color: color.error },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderWidth: 1,
    borderColor: color.inputBorder,
    borderRadius: touchRadius,
    backgroundColor: color.background,
  },
  // A few lines of free text: grows from three lines, text from the top.
  inputBoxMultiline: { height: undefined, minHeight: 112, alignItems: "stretch" },
  inputMultiline: { height: undefined, minHeight: 110, paddingTop: 13, paddingBottom: 13, lineHeight: 22, textAlignVertical: "top" },
  inputBoxFocused: {
    borderColor: color.primary,
    backgroundColor: color.background,
    boxShadow: `0 0 0 3px ${color.primaryHalo}`,
  },
  inputBoxInvalid: { borderColor: color.error, boxShadow: `0 0 0 3px ${color.errorHalo}` },
  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 14,
    fontFamily: font.regular,
    fontSize: 16,
    color: color.text,
    // The box draws the focus state; the browser's own ring would double it
    // and, even transparent, paints over the box's border.
    ...Platform.select({ web: { outlineStyle: "none" } as unknown as TextStyle }),
  },
  leading: { paddingLeft: 14 },
  inputWithIcon: { paddingLeft: 10 },
  error: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.error },
  toggle: {
    width: 36,
    height: 36,
    marginRight: 8,
    borderRadius: radius,
    alignItems: "center",
    justifyContent: "center",
  },
  togglePressed: { backgroundColor: color.border },

  formError: {
    borderRadius: touchRadius,
    backgroundColor: color.errorTint,
    borderWidth: 1,
    borderColor: color.errorHalo,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  formErrorText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.error },

  // Superpower's pill: full round ends, a touch shorter than a form field.
  button: {
    height: 50,
    borderRadius: buttonRadius,
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
  buttonDestructive: { borderColor: color.errorTint, backgroundColor: color.errorTint },
  buttonDestructivePressed: { borderColor: color.errorHalo, backgroundColor: color.errorHalo },
  buttonPending: { opacity: 0.7 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { fontFamily: font.semibold, fontSize: 15, letterSpacing: -0.1, color: color.onPrimary },
  buttonTextOutline: { fontFamily: font.medium, color: color.text },
  buttonTextDestructive: { color: color.error },

  // Figma "Hol" (5 Oct 2026): radius 8, 10 above and below 16 medium
  // words, the xs shadow.
  hol: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    boxShadow: "0 1px 2px rgba(16, 24, 40, 0.05)",
  },
  holPrimary: { backgroundColor: color.primary, borderColor: color.primary },
  holPrimaryPressed: { backgroundColor: color.primaryPressed, borderColor: color.primaryPressed },
  // The secondary button: the teal tint with its edge, as the ask button.
  holOutline: { borderColor: "#C2E1E0", backgroundColor: "#F2F7F7" },
  holOutlinePressed: { backgroundColor: "#E6F3F2" },
  // Soft red, as the portal's destructive button: tint fill, red words.
  holDestructive: { borderColor: color.errorTint, backgroundColor: color.errorTint },
  holDestructivePressed: { borderColor: color.errorHalo, backgroundColor: color.errorHalo },
  holText: { fontFamily: font.medium, fontSize: 16, lineHeight: 20, color: color.onPrimary },
  holTextOutline: { color: "#015D59" },
  holTextDestructive: { color: color.error },

  textLink: { alignSelf: "flex-end", marginTop: -4 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  rule: { flex: 1, height: 1, backgroundColor: color.border },
  dividerText: { fontFamily: font.regular, fontSize: 13, color: color.muted },

  // Pinned to the foot of the sheet, however short the form.
  footer: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", marginTop: "auto", paddingTop: 32 },
  footerText: { fontFamily: font.regular, fontSize: 15, color: color.muted },
  link: { fontFamily: font.semibold, fontSize: 15, color: color.primary },
})
