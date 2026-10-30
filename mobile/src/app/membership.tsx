import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { CARDS, CardSheet, withCard } from "@/components/card-sheet"
import { keepTogether } from "@/components/care-gap"
import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { CheckCircle, ClipboardText, Receipt, Sparkle } from "@/components/ph"
import { billingOf, cadenceOn, type Billing } from "@/components/plan-account-pieces"
import { HeadCard, headText } from "@/components/plan-tab-pieces"
import { Block, Card, CheckLines, Group, KeyValue, NeedsRow, SeeAllRow, SmallAction, Tag, TextAction, toast } from "@/components/record-kit"
import { Sheet, SheetText } from "@/components/sheet"
import { Button } from "@/components/ui"
import { dayKey, rowDate, showDate } from "@/lib/dates"
import { useOnboarding, type Membership } from "@/lib/onboarding"
import { TIERS, priceLabel, priceOf } from "@/lib/plans"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* The member's own membership and billing page (FINAL-SPEC C.17, S-67 to
   S-70): one honest page. What she has and since when, the next payment
   and the card it comes from, every receipt, what the membership includes
   and what it does not, her plan, and pause and cancel online, cancel last
   and quiet but never hidden. Cancelling takes one confirmation, with
   "Pause instead" beside it at the same weight, never a maze. The month she
   paid for runs to its end, paused or not: the page says the day it ends,
   and "Resume my membership" takes it back until then. Nothing she has is
   lost.

   The price shows here because this is her own plan's billing (D.4); it
   never shows in an offer. Opened from the Plan tab, Profile, and a paused
   member's "Resume my plan" (`?sheet=resume` opens the resume sheet).
   A payment due soon is paid from "Pay now" (/membership-pay), and AI
   credit is added from "Add AI credit" (/ai-credit); both show in the
   receipts. */

type SheetName = "pause" | "cancel" | "resume" | "included" | "card" | { receipt: Date; credit?: number }

/** The card a charge was made with: the one in use on its day. A charge on
    the day she changed cards was already made, so it keeps the old one. */
function cardOn(m: Membership | undefined, charged: Date) {
  const was = m?.pastCards?.find((p) => dayKey(charged) <= dayKey(new Date(p.until)))
  return was?.card ?? m?.card ?? CARDS[0]
}

/* Shown 30 days before the yearly renewal (S-70); never in the demo, which
   runs in her first year. Sample words for Olivia's first year. */
const YEAR_DAYS = 30
const YEAR_WORDS = "4 plan reviews, 2 lab rounds, 11 lb down"

export default function MembershipScreen() {
  const onboarding = useOnboarding()
  const { sheet: asked } = useLocalSearchParams<{ sheet?: string }>()
  const m: Membership | undefined = onboarding.membership
  const now = new Date()
  const bill = billingOf(m, now)
  const cadence = m?.billing ?? "monthly"
  const price = priceOf(cadence)
  // A paid month still running once she cancels, paused or not: it ends on
  // her next billing day. None before her first charge.
  const paidUntil = (bill.state === "active" || bill.state === "paused") && bill.next ? bill.next : undefined
  // The day billing goes on from if she resumes.
  const restarts = bill.state === "ending" ? bill.ends : bill.next
  const pausedNow = bill.state === "paused" || (bill.state === "ending" && bill.paused === true)
  const [sheet, setSheet] = React.useState<SheetName | null>(asked === "resume" && (bill.state === "paused" || bill.state === "ending") ? "resume" : null)
  const close = () => setSheet(null)
  // Every payment, newest first: the membership's charges and the AI
  // credit she added.
  const receipts = [
    ...bill.charges.map((at) => ({ at, credit: undefined as number | undefined })),
    ...(m?.creditBuys ?? []).map((b) => ({ at: new Date(b.at), credit: b.dollars })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime())

  /* Pausing stops the daily plan and billing; the record carries on. */
  async function pause() {
    if (!m) return
    await onboarding.save({ membership: { ...m, paused: true } })
    close()
    toast("Your membership is paused.")
  }

  /* Resuming, until a cancelled membership's paid month runs out: a paused
     plan starts again today, a cancellation is taken back, and billing goes
     on from her next billing day. */
  async function resume() {
    if (!m) return
    const { cancelledAt: _c, endsAt: _e, ...rest } = m
    await onboarding.save({ membership: { ...rest, paused: false } })
    close()
    toast("Your membership is active again.")
  }

  /* Cancelling: no charge again. The month she paid for runs to its end,
     her next billing day, paused or not, and she can resume until then;
     then she goes back to the free record. A membership never charged (her
     first plan not yet approved) has no paid month, so it goes back at
     once. Every version of her plan is kept either way (A-45). */
  async function cancel() {
    if (!m) return
    const at = new Date()
    const kept = [...(onboarding.planHistory ?? []), ...(onboarding.plan?.versions ?? [])]
      .filter((v, i, all) => all.findIndex((w) => w.version === v.version) === i)
      .sort((a, b) => b.version - a.version)
    const history = kept.length ? { planHistory: kept } : {}
    if (paidUntil) {
      const ends = new Date(paidUntil.getFullYear(), paidUntil.getMonth(), paidUntil.getDate())
      await onboarding.save({ membership: { ...m, cancelledAt: at.toISOString(), endsAt: ends.toISOString() }, ...history })
      close()
      toast(`Your membership ends ${rowDate(ends)}.`)
      return
    }
    await onboarding.save({ membership: { ...m, tier: "free", paused: false, cancelledAt: at.toISOString(), endsAt: at.toISOString() }, plan: undefined, ...history })
    close()
    toast("Your membership has ended.")
  }

  /* A new card is for the charges to come (withCard keeps the old one for
     the receipts already made). */
  async function chooseCard(card: string) {
    if (!m) return
    if (card === m.card) return close()
    await onboarding.save({ membership: withCard(m, card) })
    close()
    toast("Card updated")
  }

  return (
    <View style={styles.fill}>
      <FlowScreen page title="Membership" footer={bill.state === "paused" ? <PrimaryButton onPress={() => setSheet("resume")}>Resume my membership</PrimaryButton> : undefined}>
        {bill.state === "none" ? (
          <FreeRecord />
        ) : (
          <>
            {bill.state === "active" && bill.renews && <YearCard renews={bill.renews} price={priceLabel(cadence)} now={now} onCancel={() => setSheet("cancel")} />}

            <Summary bill={bill} price={price} card={m?.card} onCard={() => setSheet("card")} onAddCard={() => chooseCard(CARDS[0])} onPay={() => router.push("/membership-pay")} />

            {bill.state === "ending" && (
              <View style={styles.block}>
                <Text style={styles.body}>
                  {keepTogether(
                    `Your membership stays ${bill.paused ? "paused" : "active"} until ${bill.ends ? rowDate(bill.ends) : "this billing period ends"}. After that you go back to the free record, and you keep your record and every version of your plan.`,
                  )}
                </Text>
                <PrimaryButton onPress={() => setSheet("resume")}>Resume my membership</PrimaryButton>
              </View>
            )}

            {receipts.length > 0 && (
              <Block title="Receipts">
                <Group>
                  {receipts.map((r) => (
                    <NeedsRow
                      key={`${r.at.toISOString()}${r.credit ?? ""}`}
                      icon={r.credit ? <Sparkle size={16} color={color.primary} /> : <Receipt size={16} color={color.primary} />}
                      title={r.credit ? `$${r.credit} of AI credit, ${rowDate(r.at)}` : `${priceOf(cadenceOn(m, r.at))}, ${rowDate(r.at)}`}
                      onPress={() => setSheet({ receipt: r.at, credit: r.credit })}
                    />
                  ))}
                </Group>
              </Block>
            )}

            <Group>
              <NeedsRow icon={<CheckCircle size={16} color={color.primary} />} title="What's included" onPress={() => setSheet("included")} />
              {(bill.state === "active" || bill.state === "waiting" || bill.state === "ending") && !bill.paused && (
                <NeedsRow icon={<Sparkle size={16} color={color.primary} />} title="Add AI credit" onPress={() => router.push("/ai-credit")} />
              )}
              <YourPlanRow ended={bill.state === "ended"} />
            </Group>

            {(bill.state === "active" || bill.state === "paused" || bill.state === "waiting") && (
              <View style={styles.leave}>
                {bill.state === "active" && (
                  <Button variant="outline" onPress={() => setSheet("pause")}>
                    Pause membership
                  </Button>
                )}
                <Button variant="destructive" onPress={() => setSheet("cancel")}>
                  Cancel membership
                </Button>
              </View>
            )}
          </>
        )}
      </FlowScreen>

      {sheet === "pause" && (
        <Sheet title="Pause your membership?" onClose={close}>
          <SheetText>Your daily plan and billing stop. Your record, trends and reminders carry on, and you can pick up where you left off.</SheetText>
          <View style={styles.sheetActions}>
            <Button onPress={pause}>Pause membership</Button>
            <View style={styles.quiet}>
              <TextAction tone="muted" onPress={close}>
                Keep my membership
              </TextAction>
            </View>
          </View>
        </Sheet>
      )}

      {sheet === "cancel" && (
        <Sheet title="Cancel your membership?" onClose={close}>
          <SheetText>
            {keepTogether(
              paidUntil
                ? `You won't be charged again. You'll go back to the free record on ${rowDate(paidUntil)}, when this billing period ends. You keep your record and every version of your plan.`
                : "You haven't been charged, and you won't be. You'll go back to the free record today and keep your record.",
            )}
          </SheetText>
          <View style={styles.sheetActions}>
            <View style={styles.buttons}>
              <Button variant="destructive" onPress={cancel}>
                Cancel membership
              </Button>
              {bill.state === "active" && (
                <Button variant="outline" onPress={() => setSheet("pause")}>
                  Pause instead
                </Button>
              )}
            </View>
            <View style={styles.quiet}>
              <TextAction tone="muted" onPress={close}>
                Keep my membership
              </TextAction>
            </View>
          </View>
        </Sheet>
      )}

      {sheet === "resume" && (
        <Sheet title="Resume your membership?" onClose={close}>
          <SheetText>
            {keepTogether(
              pausedNow
                ? `Your daily plan starts again today. Billing restarts on ${restarts ? rowDate(restarts) : "your next billing day"}.`
                : `Your membership carries on as before. Your next payment is ${price} on ${restarts ? rowDate(restarts) : "your next billing day"}.`,
            )}
          </SheetText>
          <View style={styles.sheetActions}>
            <Button onPress={resume}>{`Resume for ${priceLabel(cadence)}`}</Button>
            <View style={styles.quiet}>
              <TextAction tone="muted" onPress={close}>
                Not now
              </TextAction>
            </View>
          </View>
        </Sheet>
      )}

      {sheet === "included" && (
        <Sheet title="What's included" onClose={close}>
          <CheckLines lines={TIERS.optimization.included} />
          <View style={styles.excluded}>
            <Text style={styles.sheetLabel}>Not included</Text>
            <CheckLines lines={TIERS.optimization.excluded.map((text) => ({ text, excluded: true }))} />
          </View>
          <Button onPress={close}>Done</Button>
        </Sheet>
      )}

      {sheet === "card" && <CardSheet current={m?.card} onUse={chooseCard} onClose={close} />}

      {typeof sheet === "object" && sheet && (
        <Sheet title="Receipt" onClose={close}>
          <Card style={styles.receipt}>
            <View style={styles.receiptTop}>
              <Text style={styles.amount}>{sheet.credit ? `$${sheet.credit}` : priceOf(cadenceOn(m, sheet.receipt))}</Text>
              <Text style={styles.label}>{`Paid ${showDate(sheet.receipt)}`}</Text>
            </View>
            <View>
              <KeyValue label="Card" value={cardOn(m, sheet.receipt)} />
              <KeyValue label="For" value={sheet.credit ? "AI credit" : `Optimization membership, ${cadenceOn(m, sheet.receipt)}`} last />
            </View>
          </Card>
          <Button onPress={close}>Done</Button>
        </Sheet>
      )}
    </View>
  )
}

/* ------------------------------------------------------------- summary -- */

const STATE_TAG: Record<Billing["state"], { tone: "ok" | "muted"; label: (b: Billing) => string }> = {
  none: { tone: "muted", label: () => "" },
  waiting: { tone: "ok", label: () => "Active" },
  active: { tone: "ok", label: () => "Active" },
  paused: { tone: "muted", label: () => "Paused" },
  ending: { tone: "muted", label: () => "Cancelled" },
  ended: { tone: "muted", label: () => "Ended" },
}

/** What she has: the membership, the next payment (or why there is
    none), and the card. */
function Summary({ bill, price, card, onCard, onAddCard, onPay }: { bill: Billing; price: string; card?: string; onCard: () => void; onAddCard: () => void; onPay: () => void }) {
  const tag = STATE_TAG[bill.state]
  const rows: { label: string; value: string; action?: React.ReactNode }[] =
    bill.state === "active"
      ? [
          {
            label: "Next payment",
            value: bill.next ? `${price} on ${rowDate(bill.next)}` : "None",
            // Due within DUE_DAYS: paid now from /membership-pay.
            action: bill.due ? <SmallAction onPress={onPay}>Pay now</SmallAction> : undefined,
          },
        ]
      : bill.state === "paused"
        ? [{ label: "Billing", value: "Paused" }]
        : bill.state === "waiting"
          ? [{ label: "First payment", value: "When your plan is\u00A0approved" }]
          : bill.state === "ending"
            ? [
                { label: "Membership ends", value: bill.ends ? rowDate(bill.ends) : "End of this month" },
                { label: "Next payment", value: "None" },
              ]
            : [{ label: "Plan", value: TIERS.free.name }]
  const showCard = bill.state !== "ended"

  return (
    <>
      <HeadCard>
        <View style={styles.titleLine}>
          <Text style={[headText.title, styles.flex]} accessibilityRole="header">
            {TIERS.optimization.name}
          </Text>
          <Tag tone={tag.tone}>{tag.label(bill)}</Tag>
        </View>
      </HeadCard>
      <Block title="Billing">
        <Card style={styles.summary}>
          {rows.map((r, i) => (
            <KeyValue key={r.label} label={r.label} value={r.value} action={r.action} last={!showCard && i === rows.length - 1} />
          ))}
          {showCard &&
            (card ? (
              <KeyValue label="Card" value={keepTogether(card)} action={<SmallAction onPress={onCard}>Change</SmallAction>} last />
            ) : (
              <KeyValue label="Card" action={<SmallAction onPress={onAddCard}>Add a card</SmallAction>} last />
            ))}
        </Card>
      </Block>
    </>
  )
}

/** Her plan, a tap from her billing. Opens the Plan tab. */
function YourPlanRow({ ended }: { ended: boolean }) {
  return (
    <NeedsRow
      icon={<ClipboardText size={16} color={color.primary} />}
      title={ended ? "Your past plans" : "Your plan"}
      onPress={() => {
        // The Plan tab, as the tab bar opens it: over Home, so its swipe
        // back returns Home.
        router.dismissTo("/")
        router.push("/plan")
      }}
    />
  )
}

/** On the free record: the membership is not hers, so the page says so
    and shows the way to the plan (no price; the plan page has it). */
function FreeRecord() {
  return (
    <Card style={styles.free}>
      <View style={styles.freeTop}>
        <Text style={styles.title}>{TIERS.free.name}</Text>
        <Text style={styles.body}>Your record, trends, reminders and care gaps stay free, always.</Text>
      </View>
      <View style={styles.cardLink}>
        <SeeAllRow label="See the Optimization plan" onPress={() => router.push("/plan")} />
      </View>
    </Card>
  )
}

/** A month before the membership's yearly renewal (S-70): her year, the
    renewal and the price, and the way out beside it. */
function YearCard({ renews, price, now, onCancel }: { renews: Date; price: string; now: Date; onCancel: () => void }) {
  const days = (renews.getTime() - now.getTime()) / 86_400_000
  if (days < 0 || days > YEAR_DAYS) return null
  return (
    <Card style={styles.year}>
      <Text style={styles.title}>Your year with Inlay</Text>
      <Text style={styles.body}>{YEAR_WORDS}</Text>
      <Text style={styles.label}>{`Renews ${rowDate(renews)} for ${price}`}</Text>
      <View style={styles.yearAction}>
        <Button variant="destructive" onPress={onCancel}>
          Cancel membership
        </Button>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  title: { fontFamily: font.medium, fontSize: 16, lineHeight: 24, color: ink.content },
  body: { ...type.body },
  label: { ...type.label },
  meta: { ...type.meta },
  block: { gap: space.item },

  // The rows' own room above and below makes up the card's padding, and
  // the head sits a row's room above its rule, so the rule reads like the
  // ones between the rows.
  summary: { paddingVertical: space.card - space.rowY },
  titleLine: { flexDirection: "row", alignItems: "center", gap: space.inline },

  leave: { gap: space.item },
  // The quiet answer sits right under the button; its own height spaces it.
  sheetActions: { gap: space.stack },
  buttons: { gap: space.item },
  quiet: { alignItems: "center" },
  sheetLabel: { ...type.title },
  excluded: { gap: space.inline },

  receipt: { paddingBottom: space.card - space.rowY },
  // The amount and its day, like a tile's number and its label.
  receiptTop: { gap: space.line, paddingBottom: space.rowY, borderBottomWidth: 1, borderBottomColor: hairline.rule },
  amount: { ...type.stat },

  free: { paddingVertical: 0 },
  freeTop: { gap: space.stack, paddingVertical: space.card },
  cardLink: { borderTopWidth: 1, borderTopColor: hairline.rule },

  year: { gap: space.stack },
  yearAction: { alignSelf: "stretch" },
})
