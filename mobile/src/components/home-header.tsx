import { router } from "expo-router"
import * as React from "react"
import { Image, Pressable, StyleSheet, Text, View } from "react-native"

import { useTourTarget } from "@/components/app-tour"
import { BellSimple } from "@/components/ph"
import { ReviewBanner, type BannerState } from "@/components/record-kit"
import { openTab, type TabName } from "@/components/tab-bar"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { chart, color, hairline, ink, space, type } from "@/lib/theme"
import {
  bannerTarget,
  homeBanner,
  unreadCount,
  type HomeBanner,
} from "@/lib/todo"

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
  const name =
    onboarding.profile?.preferredName?.trim() ||
    onboarding.profile?.firstName?.trim() ||
    PATIENT.firstName
  const unread = unreadCount(onboarding)
  const photoRef = useTourTarget("account")

  return (
    <View style={styles.row}>
      <Pressable
        ref={photoRef}
        onPress={() => router.push("/profile")}
        accessibilityRole="button"
        accessibilityLabel="Your profile"
        hitSlop={4}
        style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
      >
        <Image
          source={PHOTO}
          style={styles.photo}
          accessibilityIgnoresInvertColors
        />
      </Pressable>
      <View style={styles.names}>
        <Text
          style={styles.name}
          accessibilityRole="header"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {`${greetingFor()}, ${name}`}
        </Text>
        <Text style={styles.greeting} maxFontSizeMultiplier={1.3}>
          Here's what's important today.
        </Text>
      </View>
      <Pressable
        onPress={() => router.push("/notifications")}
        accessibilityRole="button"
        accessibilityLabel={
          unread ? `Notifications, ${unread} new` : "Notifications"
        }
        hitSlop={2}
        style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
      >
        <BellSimple size={24} color={ink.detail} />
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
export function StatusBanner({
  variant = "free",
  tab = "home",
}: {
  variant?: "free" | "member"
  tab?: TabName
}) {
  const onboarding = useOnboarding()
  const banner = homeBanner(onboarding, { member: variant === "member" })
  if (!banner) return null

  const open = () => {
    const target = bannerTarget(banner)
    if (!target) return
    if ("tab" in target)
      return openTab(target.tab === "results" ? "/results" : "/plan", tab)
    // Opening new results reads them: the banner goes.
    if (banner.kind === "new-results" && onboarding.batches?.length)
      onboarding
        .save({
          batches: onboarding.batches.map((x) =>
            x.opened ? x : { ...x, opened: true }
          ),
        })
        .catch(() => {})
    router.push(target.href)
  }

  return <ReviewBanner state={kitState(banner)} onPress={open} />
}

const styles = StyleSheet.create({
  // Figma "Hol" home header: the photo 8 from the greeting, the bell on the
  // right.
  row: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.inline },
  pressed: { opacity: 0.8 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: hairline.rule,
    backgroundColor: color.primaryTint,
  },
  photo: { width: "100%", height: "100%" },
  // minWidth 0 lets the longer greeting wrap instead of pushing the bell off.
  names: { flex: 1, minWidth: 0, gap: space.line },
  greeting: { ...type.label },
  name: { ...type.section, color: ink.content },
  bell: {
    flexShrink: 0,
    marginLeft: "auto",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  // The one red besides an out of range mark: the unread count.
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    paddingHorizontal: 3,
    backgroundColor: chart.outside,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    ...type.captionStrong,
    lineHeight: 14,
    color: ink.onColor,
    fontVariant: ["tabular-nums"],
  },
})
