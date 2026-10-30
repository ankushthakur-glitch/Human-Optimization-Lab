import { Redirect } from "expo-router"
import * as React from "react"
import { StyleSheet, View } from "react-native"

import { TimePickerSheet } from "@/components/date-time-picker"
import { FlowScreen } from "@/components/flow"
import { billingOf } from "@/components/plan-account-pieces"
import { Barbell, Bell, Brain, ChatText, Envelope, ForkKnife, Moon, Pill, Ruler, Scales, Sparkle } from "@/components/ph"
import { Block, Tabs } from "@/components/record-kit"
import { Chevron, Row, Rows, Switch, SwitchRow } from "@/components/settings-rows"
import { useOnboarding, type Channel, type PlanSettings } from "@/lib/onboarding"
import { color } from "@/lib/theme"

/* A member's plan settings, one tap under Profile's membership (30 Oct
   2026): a reminder for each part of her plan (the weigh in every morning,
   WEIGH_IN; workouts, medicines, meals, winding down for sleep, the evening
   check in, the monthly waist), each on or off, its time a tap away; quiet
   hours, when nothing buzzes; Ask Inlay's one question a day (lib/coach.ts);
   how Inlay reaches her; and the units her readings show in. A free patient
   has no plan to set, so the page sends her home. */

type Reminder = { id: string; title: string; when: string; at?: string; Icon: typeof Bell }

const REMINDERS: Reminder[] = [
  { id: "weigh-in", title: "Weigh in", when: "Every morning", at: "7:00 AM", Icon: Scales },
  { id: "workout", title: "Workouts", when: "On workout days", at: "6:00 PM", Icon: Barbell },
  { id: "medicine", title: "Medicines", when: "Every day", at: "8:00 AM", Icon: Pill },
  { id: "meals", title: "Log meals", when: "After breakfast, lunch and dinner", Icon: ForkKnife },
  { id: "sleep", title: "Wind down for sleep", when: "Every night", at: "10:00 PM", Icon: Moon },
  { id: "check-in", title: "Evening check in", when: "Every day", at: "8:00 PM", Icon: Brain },
  { id: "waist", title: "Measure your waist", when: "First Sunday of the month", at: "8:00 AM", Icon: Ruler },
]

const QUIET = "10:00 PM to 7:00 AM"

/** Hourly, from 5 AM to 11 PM. */
const TIMES = Array.from({ length: 19 }, (_, i) => {
  const h = i + 5
  return `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`
})

/** How Inlay reaches her; one never set reads as its default (news and
    offers off, texts as she chose on the consent). */
const CHANNELS: { id: Channel; title: string; Icon: typeof Bell }[] = [
  { id: "push", title: "Push notifications", Icon: Bell },
  { id: "sms", title: "Texts about your care", Icon: ChatText },
  { id: "email", title: "Email", Icon: Envelope },
  { id: "news", title: "News and offers", Icon: Sparkle },
]

export default function PlanSettingsScreen() {
  const onboarding = useOnboarding()
  const bill = billingOf(onboarding.membership)
  const s: PlanSettings = onboarding.planSettings ?? {}
  const [picking, setPicking] = React.useState<Reminder>()

  if (bill.state === "none" || bill.state === "ended") return <Redirect href="/profile" />

  const set = (patch: PlanSettings) => onboarding.save({ planSettings: { ...s, ...patch } })
  const on = (id: string) => s.remind?.[id] ?? true
  const timeOf = (r: Reminder) => s.at?.[r.id] ?? r.at
  const channelOn = (c: Channel) => onboarding.notify?.[c] ?? (c === "news" ? false : c === "sms" ? !!onboarding.smsConsent : true)

  return (
    <View style={styles.fill}>
      <FlowScreen page title="Plan settings">
        <Block title="Reminders">
          <Rows>
            {REMINDERS.map((r) => {
              const at = timeOf(r)
              const meta = on(r.id) ? (at ? `${r.when}, ${at}` : r.when) : "Off"
              return (
                <Row
                  key={r.id}
                  icon={<r.Icon size={16} color={color.primary} />}
                  title={r.title}
                  meta={meta}
                  gap={10}
                  onPress={at && on(r.id) ? () => setPicking(r) : undefined}
                  accessibilityLabel={`${r.title}, ${meta}, change time`}
                  right={<Switch value={on(r.id)} onChange={(v) => set({ remind: { ...s.remind, [r.id]: v } })} label={r.title} />}
                />
              )
            })}
          </Rows>
        </Block>

        <Block title="Quiet hours">
          <Rows>
            <Row
              icon={<Moon size={16} color={color.primary} />}
              title="No reminders at night"
              meta={s.quiet === false ? "Off" : QUIET}
              gap={10}
              right={<Switch value={s.quiet ?? true} onChange={(v) => set({ quiet: v })} label="Quiet hours" />}
            />
          </Rows>
        </Block>

        <Block title="Ask Inlay">
          <Rows>
            <SwitchRow icon={<Sparkle size={16} color={color.primary} />} title="A question from Inlay each day" value={s.coach ?? true} onChange={(v) => set({ coach: v })} />
          </Rows>
        </Block>

        <Block title="Notifications">
          <Rows>
            {CHANNELS.map((c) => (
              <SwitchRow
                key={c.id}
                icon={<c.Icon size={16} color={color.primary} />}
                title={c.title}
                value={channelOn(c.id)}
                onChange={(v) => onboarding.save({ notify: { ...onboarding.notify, [c.id]: v } })}
              />
            ))}
          </Rows>
        </Block>

        <Block title="Units">
          <Rows>
            <Row
              icon={<Scales size={16} color={color.primary} />}
              title="Weight"
              right={
                <View style={styles.units}>
                  <Tabs snug options={[{ value: "lb", label: "lb" }, { value: "kg", label: "kg" }]} value={s.weight ?? "lb"} onChange={(v) => set({ weight: v })} />
                </View>
              }
            />
            <Row
              icon={<Ruler size={16} color={color.primary} />}
              title="Waist and height"
              right={
                <View style={styles.units}>
                  <Tabs snug options={[{ value: "in", label: "in" }, { value: "cm", label: "cm" }]} value={s.length ?? "in"} onChange={(v) => set({ length: v })} />
                </View>
              }
            />
          </Rows>
        </Block>
      </FlowScreen>

      {picking && (
        <TimePickerSheet
          title={picking.title}
          times={TIMES}
          value={timeOf(picking)}
          onPick={(t) => {
            set({ at: { ...s.at, [picking.id]: t } })
            setPicking(undefined)
          }}
          onClose={() => setPicking(undefined)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  units: { width: 112 },
})
