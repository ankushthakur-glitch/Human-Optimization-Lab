import { router } from "expo-router"
import * as React from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { WASH } from "@/components/enrollment-kit"
import { DarkStatusBar } from "@/components/error-state"
import { PageFooter, PageGround } from "@/components/hol"
import { CaretRight, Check, ChatText, Info } from "@/components/ph"
import { Block, Group, KeyValue, NeedsRow } from "@/components/record-kit"
import { Button, useTopInset } from "@/components/ui"
import { color, font, ink, space, type } from "@/lib/theme"
import { FINDINGS, PAID_TESTS, PATIENT } from "@/lib/v14"

/* Deck screen 28, "Everything is in, and found": one screen says the
   testing is finished and shows what it turned up, in place of the old
   plan ready screens. Paying for the tests already accepted the plan, so
   nothing here asks for a second yes; it says so once at the foot.

   Beyond the deck, from the 22 Oct call: how each test was paid. Tests
   are paid in cash up front; a test Dr. Patel moved to insurance is
   refunded and shown as such, so the patient sees all four and how each
   was paid. A page of its own like "You're enrolled": no header bar, the
   teal wash, the tick, then the facts. */

const usd = (n: number) => `$${n.toLocaleString("en-US")}`

export default function TestsIn() {
  const top = useTopInset()
  const cash = PAID_TESTS.filter((t) => t.paid === "cash").reduce((s, t) => s + t.price, 0)
  const refunded = PAID_TESTS.find((t) => t.paid === "insurance")
  return (
    <View style={styles.screen}>
      <DarkStatusBar />
      <PageGround />
      <View style={styles.wash} pointerEvents="none">
        <Svg width="100%" height="100%" preserveAspectRatio="none" style={styles.washSvg}>
          <Defs>
            <LinearGradient id="testsInWash" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={WASH.from} stopOpacity={1} />
              <Stop offset="1" stopColor={WASH.from} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#testsInWash)" />
        </Svg>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingTop: top + space.section }]} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <View style={styles.halo}>
            <View style={styles.badge}>
              <Check size={30} color={color.onPrimary} weight="bold" />
            </View>
          </View>
          <Text style={styles.title} accessibilityRole="header">
            All your tests are in
          </Text>
          <Text style={styles.lead}>Everything is complete, and your plan has been built from it.</Text>
        </View>

        <Block title="What they found" meta={`${FINDINGS.length + 1} findings`}>
          <Group>
            {FINDINGS.map((f) => (
              <NeedsRow
                key={f.name}
                icon={<Info size={16} color={f.flag ? color.low : color.primary} />}
                hue={f.flag ? "amber" : "teal"}
                title={`${f.name} ${f.start}`}
                meta={`${f.source}${f.note ? `. ${f.note}` : ""}`}
                tag={f.flag ? { tone: "low", label: "Leads your plan" } : undefined}
              />
            ))}
            <NeedsRow icon={<ChatText size={16} color={color.violet} />} hue="violet" title="Irritability, most days" meta="What you told us. No test would have found it." />
          </Group>
        </Block>

        <Block title="How your tests were paid">
          <Group>
            {PAID_TESTS.map((t, i) => (
              <KeyValue
                key={t.name}
                label={t.name}
                value={t.paid === "cash" ? usd(t.price) : "Refunded"}
                tag={{ tone: t.paid === "cash" ? "muted" : "ok", label: t.paid === "cash" ? "Cash" : "Insurance" }}
                last={i === PAID_TESTS.length - 1}
              />
            ))}
          </Group>
          {refunded?.note && <Text style={type.label}>{refunded.note}</Text>}
          <View style={styles.total}>
            <Text style={type.title}>Paid in cash</Text>
            <Text style={type.stat}>{usd(cash)}</Text>
          </View>
        </Block>

        <Text style={styles.foot}>{`A copy has gone to ${PATIENT.physician}. You accepted the plan when you paid for your tests, so it is already running.`}</Text>
      </ScrollView>
      <PageFooter style={styles.footer}>
        <Button onPress={() => router.push("/v14/starting-point" as never)} trailing={({ color: c }) => <CaretRight size={16} weight="bold" color={c} />}>
          Set your starting point
        </Button>
      </PageFooter>
    </View>
  )
}

const BADGE = 64

const styles = StyleSheet.create({
  screen: { flex: 1 },
  wash: { position: "absolute", top: 0, left: 0, right: 0, height: "45%" },
  washSvg: { width: "100%", height: "100%" },
  body: { paddingHorizontal: space.gutter, paddingBottom: space.section, gap: space.section },
  footer: { backgroundColor: "transparent", borderTopWidth: 0, paddingTop: 0 },
  head: { alignItems: "center", gap: space.item },
  halo: { width: BADGE + 18, height: BADGE + 18, borderRadius: (BADGE + 18) / 2, alignItems: "center", justifyContent: "center", backgroundColor: color.primarySoft },
  badge: { width: BADGE, height: BADGE, borderRadius: BADGE / 2, alignItems: "center", justifyContent: "center", backgroundColor: color.primary },
  title: { fontFamily: font.semibold, fontSize: 28, lineHeight: 34, letterSpacing: -0.4, color: ink.strong, textAlign: "center" },
  lead: { ...type.body, textAlign: "center", paddingHorizontal: space.item },
  total: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: space.rowX },
  foot: { ...type.meta, textAlign: "center", paddingHorizontal: space.item },
})
