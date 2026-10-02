import { router } from "expo-router"
import * as React from "react"
import { Image, Pressable, StyleSheet, Text, View } from "react-native"

import { IconBell } from "@/components/icons"
import { ReviewBanner, type BannerState } from "@/components/record-kit"
import { openTab, type TabName } from "@/components/tab-bar"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { chart, color, ink, space, type } from "@/lib/theme"
import { bannerTarget, homeBanner, unreadCount, type HomeBanner } from "@/lib/todo"

/* The top of both homes, pinned while the page scrolls (FINAL-SPEC C.1.2,
   C.2.2, F.4): her own photo, which opens Profile; the greeting by the
   hour and the name she goes by; the bell with how many notifications she
   has not opened. It reads everything from the store, so it takes no
   props. The member's plan line is not part of it: it is the first row of
   the member home's scrolling content.

   StatusBanner is the one status banner (sharing turned off, sharing
   ending, records still arriving, Dr. Patel checking, new results), placed
   first in a tab's scrolling content; the sharing off banner shows on
   every tab. */

const PHOTO = require("../../assets/images/patient-avatar.jpg")

/** "Good morning" before noon, "Good afternoon" before 6 PM, then "Good
    evening", by the phone's hour. */
export function greetingFor(now: Date = new Date()) {
  const h = now.getHours()
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}

/** Both homes' pinned header, for TabScreen's `header`. `variant` is not
    needed (the store says who she is); early callers still pass it. */
export function HomeHeader(_: { variant?: "free" | "member" } = {}) {
  const onboarding = useOnboarding()
  const name = onboarding.profile?.preferredName?.trim() || onboarding.profile?.firstName?.trim() || PATIENT.firstName
  const unread = unreadCount(onboarding)

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.push("/profile")}
        accessibilityRole="button"
        accessibilityLabel="Your profile"
        hitSlop={4}
        style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
      >
        <Image source={PHOTO} style={styles.photo} accessibilityIgnoresInvertColors />
      </Pressable>
      <View style={styles.names}>
        <Text style={styles.greeting} maxFontSizeMultiplier={1.3}>
          {greetingFor()}
        </Text>
        <Text style={styles.name} accessibilityRole="header" numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {name}
        </Text>
      </View>
      <Pressable
        onPress={() => router.push("/notifications")}
        accessibilityRole="button"
        accessibilityLabel={unread ? `Notifications, ${unread} new` : "Notifications"}
        hitSlop={2}
        style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
      >
        <IconBell size={20} color={color.label} />
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText} maxFontSizeMultiplier={1.2}>
              {unread > 99 ? "99" : String(unread)}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  )
}

/** A home banner as the record kit draws it. Sharing turned off arrives
    from lib/todo.ts with the day it happened, in either form. */
function kitState(b: HomeBanner): BannerState {
  if (b.kind !== "sharing-off") return b
  const since = "since" in b ? b.since : "on" in b ? (b.on ?? "") : ""
  return { kind: "sharing-off", since }
}

/** The status banner for a tab, or nothing when none applies. `tab` is
    the tab it sits on, so a banner that opens another tab switches from
    the right place; the same sharing off banner shows on every tab. A
    member's home shows only sharing and new results. */
export function StatusBanner({ variant = "free", tab = "home" }: { variant?: "free" | "member"; tab?: TabName }) {
  const onboarding = useOnboarding()
  const banner = homeBanner(onboarding, { member: variant === "member" })
  if (!banner) return null

  const open = () => {
    const target = bannerTarget(banner)
    if (!target) return
    if ("tab" in target) return openTab(target.tab === "results" ? "/results" : "/plan", tab)
    // Opening new results reads them: the banner goes.
    if (banner.kind === "new-results" && onboarding.batches?.length)
      onboarding.save({ batches: onboarding.batches.map((x) => (x.opened ? x : { ...x, opened: true })) }).catch(() => {})
    router.push(target.href)
  }

  return <ReviewBanner state={kitState(banner)} onPress={open} />
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.lead },
  pressed: { opacity: 0.8 },
  avatar: { width: 44, height: 44, borderRadius: 22, overflow: "hidden", backgroundColor: color.primaryTint },
  photo: { width: 44, height: 44, borderRadius: 22 },
  // Frontline's home header: the greeting in the second line's grey, 2
  // over the name as a block title.
  names: { flex: 1, gap: space.line },
  greeting: { ...type.label },
  name: { ...type.section },
  // White, a 1 pt edge, no shadow (FINAL-SPEC C.0.1).
  bell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    backgroundColor: color.background,
    alignItems: "center",
    justifyContent: "center",
  },
  // The one red besides an out of range mark: the unread count.
  badge: {
    position: "absolute",
    top: 4,
    right: 3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: chart.outside,
    alignItems: "center",
    justifyContent: "center",
  },
  // Frontline's count badge: 10 medium, white.
  badgeText: { ...type.captionStrong, lineHeight: 12, color: ink.onColor, fontVariant: ["tabular-nums"] },
})
