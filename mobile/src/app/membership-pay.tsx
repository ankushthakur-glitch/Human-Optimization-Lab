import { Redirect, router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { CARDS, CardSheet, withCard } from "@/components/card-sheet"
import { keepTogether } from "@/components/care-gap"
import { BillingToggle } from "@/components/enrollment-kit"
import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { PaidPopup } from "@/components/paid-popup"
import { billingOf } from "@/components/plan-account-pieces"
import { Block, Card, KeyValue, SmallAction, toast } from "@/components/record-kit"
import { dayKey, rowDate } from "@/lib/dates"
import { useOnboarding } from "@/lib/onboarding"
import { TIERS, YEARLY_TEST_DISCOUNT, priceOf, type Cadence } from "@/lib/plans"
import { paymentReceipt, type Receipt } from "@/lib/receipt"
import { space, type } from "@/lib/theme"

/* Pay your membership (30 Oct 2026): the member pays her next billing
   period now, from Home's "payment due" banner or "Pay now" on her
   membership page. What she pays for (the plan, the period it covers, the
   amount), monthly or yearly from this payment on (a change keeps the
   receipts before it at the old cadence), the card it comes from with
   Change, and one button. Left
   alone, the same card is charged on the billing day, and the page says
   so. Once paid, the popup gives the receipt, and the next payment moves
   to the period after (Membership.paidAhead). Only an active membership
   with a payment coming has anything to pay; any other goes to her
   membership page. */

export default function MembershipPayScreen() {
  const onboarding = useOnboarding()
  const m = onboarding.membership
  const bill = billingOf(m)
  const [picking, setPicking] = React.useState(false)
  /** Monthly or yearly from this payment on; unset, as she pays now. */
  const [choice, setChoice] = React.useState<Cadence>()
  // Once paid, the page keeps the period it paid for: the store has
  // already moved her next payment on.
  const [paid, setPaid] = React.useState<{ receipt: Receipt; next: Date }>()

  if (!paid && (!m || bill.state !== "active" || !bill.next)) return <Redirect href="/membership" />

  const current = m?.billing ?? "monthly"
  const cadence = choice ?? current
  const price = priceOf(cadence)
  const amount = Number(price.replace(/[^0-9.]/g, ""))
  const next = paid?.next ?? bill.next ?? new Date()
  // The period the payment covers: its billing day to the day before the
  // one after.
  const months = cadence === "yearly" ? 12 : 1
  const through = new Date(next.getFullYear(), next.getMonth() + months, next.getDate() - 1)
  const card = m?.card ?? CARDS[0]

  async function pay() {
    if (!m) return
    const receipt = paymentReceipt(`${TIERS.optimization.name}, ${rowDate(next)} to ${rowDate(through)}`, amount, card)
    // A new cadence starts with this payment; the charges before it keep
    // the old one (Membership.switched).
    const switched = cadence !== current ? { billing: cadence, switched: { on: dayKey(next), was: current } } : {}
    await onboarding.save({ membership: { ...m, card, paidAhead: dayKey(next), ...switched } })
    setPaid({ receipt, next })
  }

  async function chooseCard(c: string) {
    setPicking(false)
    if (!m || c === m.card) return
    await onboarding.save({ membership: withCard(m, c) })
    toast("Card updated")
  }

  return (
    <View style={styles.fill}>
      <FlowScreen page title="Pay your membership" footer={<PrimaryButton onPress={pay}>{`Pay ${price}`}</PrimaryButton>}>
        <Block title="Billing">
          <BillingToggle billing={cadence} onChange={setChoice} />
          {cadence !== current && (
            <Text style={styles.note}>
              {keepTogether(
                cadence === "yearly"
                  ? `Yearly starts with this payment, then renews each year on ${rowDate(next)}. Yearly members also get ${YEARLY_TEST_DISCOUNT}% off their baseline tests.`
                  : `Monthly starts with this payment, then renews each month on the ${next.getDate()}${ordinal(next.getDate())}.`,
              )}
            </Text>
          )}
        </Block>

        <Block title="This payment">
          <Card style={styles.rows}>
            <KeyValue label="Plan" value={TIERS.optimization.name} />
            <KeyValue label="Covers" value={`${rowDate(next)} to ${rowDate(through)}`} />
            <KeyValue label="Due" value={rowDate(next)} />
            <KeyValue label="Amount" value={price} last />
          </Card>
        </Block>

        <Block title="Paid with">
          <Card style={styles.rows}>
            <KeyValue label="Card" value={keepTogether(card)} action={<SmallAction onPress={() => setPicking(true)}>Change</SmallAction>} last />
          </Card>
        </Block>

        <Text style={styles.note}>{keepTogether(`If you don't pay now, this card is charged ${price} on ${rowDate(next)}.`)}</Text>
      </FlowScreen>

      {picking && <CardSheet current={m?.card} onUse={chooseCard} onClose={() => setPicking(false)} />}
      {paid && <PaidPopup receipt={paid.receipt} lead={`Your membership is paid through ${rowDate(through)}.`} onContinue={() => router.back()} />}
    </View>
  )
}

/** "st", "nd", "rd" or "th" after a day of the month. */
function ordinal(n: number) {
  if (n % 100 >= 11 && n % 100 <= 13) return "th"
  return ["th", "st", "nd", "rd"][n % 10] ?? "th"
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // The rows' own room above and below makes up the card's padding.
  rows: { paddingVertical: space.card - space.rowY },
  note: { ...type.meta },
})
