/* The patient app's palette and type, taken from the web portal: the brand
   teal of the invitation email and logo, zinc neutrals, and Inter. The app is
   light only for now, like the invitation email. */

export const color = {
  primary: "#01837E",
  primaryPressed: "#016B67",
  onPrimary: "#FFFFFF",
  text: "#18181B",
  muted: "#52525B",
  placeholder: "#A1A1AA",
  border: "#D4D4D8",
  borderFocus: "#01837E",
  surface: "#F4F4F5",
  background: "#FFFFFF",
  error: "#DC2626",
} as const

export const font = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
} as const

export const radius = 10
export const gutter = 24
