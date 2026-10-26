import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { useStartMembership } from "@/components/checkout-sheet"
import { ConsentSheets, DocLink, type ConsentSheet } from "@/components/consent-kit"
import {
  CostBreakdownSheet,
  GreenWash,
  WASH,
  firstMonth,
} from "@/components/enrollment-kit"
import { Checkbox } from "@/components/flow"
import {
  AppleLogo,
  CalendarBlank,
  CaretRight,
  CreditCard,
  FirstAidKit,
  GoogleLogo,
  Lock,
  PriceTag,
  ScanSmiley,
} from "@/components/ph"
import { PaidPopup } from "@/components/paid-popup"
import { PlanStepPage } from "@/components/plan-steps"
import { Card, KeyValue, TextAction } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { Button, TextField } from "@/components/ui"
import { dollarsExact } from "@/lib/baseline-tests"
import { useOnboarding } from "@/lib/onboarding"
import { priceLabel, YEARLY_TEST_DISCOUNT } from "@/lib/plans"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* Step 4 of the plan's set-up, "Payment method": opens from "Continue to
   payment" on step 3 (/enrollment), in the same frame and with the same
   small pieces as every step. The first month's total on one row, its
   breakdown a tap away, how she pays, and her agreement. "Complete
   enrollment" stays off until she has a way to pay and has ticked the
   agreement; then the membership starts and she lands on the enrolled
   page (/enrolled).

   Apple Pay and Google Pay take no card fields: a panel says which card
   in her wallet pays and how she confirms, and "Complete enrollment"
   opens the wallet's own confirm sheet (the card, who is paid, the
   amount) before anything is charged.

   An HSA or FSA card pays like any card, with the same fields.

   Once the payment goes through, a small popup says so: the amount, the
   card, and "Download receipt" for the itemized receipt; Continue opens
   the enrolled page (/enrolled). */

type Method = "card" | "hsa" | "apple" | "google"
type Wallet = Exclude<Method, "card" | "hsa">

const METHODS: { id: Method; name: string }[] = [
  { id: "card", name: "Credit card" },
  { id: "hsa", name: "HSA or FSA" },
  { id: "apple", name: "Apple Pay" },
  { id: "google", name: "Google Pay" },
]

/** Each wallet: its mark, the prototype's card in it, and how she
    confirms there. */
const WALLETS: Record<
  Wallet,
  { name: string; card: string; where: string; confirm: string; button: string }
> = {
  apple: {
    name: "Apple Pay",
    card: "Visa ending 4242",
    where: "Apple Wallet",
    confirm: "Face ID",
    button: "Confirm with Face ID",
  },
  google: {
    name: "Google Pay",
    card: "Mastercard ending 8210",
    where: "Google Wallet",
    confirm: "your Google account",
    button: "Pay with Google Pay",
  },
}

/** "1234567890123456" as "1234 5678 9012 3456". */
const cardText = (raw: string) =>
  raw
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ")

/** "1226" as "12 / 26". */
const expiryText = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d
}

export default function PaymentScreen() {
  const onboarding = useOnboarding()
  const { start, pending } = useStartMembership()
  const billing = onboarding.billingPick ?? "yearly"
  const cost = firstMonth(onboarding.baselinePicks, billing, onboarding.addOns, onboarding.testPay)
  const [method, setMethod] = React.useState<Method>("card")
  // The prototype's demo card, as the reference shows it.
  const [number, setNumber] = React.useState("4242 4242 4242 4242")
  const [expiry, setExpiry] = React.useState("08 / 29")
  const [cvc, setCvc] = React.useState("123")
  // When she ticked the agreement, kept as her consent (S-70).
  const [agreedAt, setAgreedAt] = React.useState<string>()
  const [sheet, setSheet] = React.useState<"breakdown" | "wallet">()

  // Paid: the popup is up, and Continue opens the enrolled page.
  const [paid, setPaid] = React.useState<() => void>()

  const digits = number.replace(/\D/g, "")
  // Demo: the card fields are not checked, only the agreement.
  const ready = !!agreedAt

  async function pay(details: Parameters<typeof start>[0]) {
    const open = await start({ ...details, hold: true })
    setSheet(undefined)
    if (open) setPaid(() => open)
  }

  function complete() {
    if (!ready || !agreedAt) return
    if (method === "apple" || method === "google") return setSheet("wallet")
    void pay({
      card: `${method === "hsa" ? "HSA or FSA card" : "Card"} ending ${digits.slice(-4) || "4242"}`,
      billing,
      agreedAt,
      enrolled: true,
    })
  }

  function payWithWallet(wallet: Wallet) {
    if (!agreedAt) return
    const w = WALLETS[wallet]
    void pay({ card: `${w.card}, ${w.name}`, billing, agreedAt, enrolled: true })
  }

  // The terms and the privacy policy open in the consent screen's sheets.
  const [doc, setDoc] = React.useState<ConsentSheet | null>(null)

  return (
    <PlanStepPage
      step={4}
      title="Payment method"
      onNext={complete}
      nextLabel="Complete enrollment"
      nextWide
      nextDisabled={!ready}
      nextPending={pending && (method === "card" || method === "hsa")}
      overlay={
        paid ? (
          <PaidPopup onContinue={paid} />
        ) : doc ? (
          <ConsentSheets page={{ sheet: doc, setSheet: setDoc }} />
        ) : sheet === "breakdown" ? (
          <CostBreakdownSheet
            tests={onboarding.baselinePicks}
            addOns={onboarding.addOns}
            testPay={onboarding.testPay}
            billing={billing}
            goals={onboarding.goals}
            onClose={() => setSheet(undefined)}
          />
        ) : (
          sheet === "wallet" &&
          (method === "apple" || method === "google") && (
            <WalletSheet
              wallet={method}
              amount={dollarsExact(cost.total)}
              then={priceLabel(billing)}
              pending={pending}
              onPay={() => payWithWallet(method)}
              onClose={() => setSheet(undefined)}
            />
          )
        )
      }
    >
      <Pressable
        onPress={() => setSheet("breakdown")}
        accessibilityRole="button"
        accessibilityLabel={`${billing === "yearly" ? "Total due today" : "First month total"} ${dollarsExact(cost.total)}, ${billing === "yearly" ? `yearly plan, ${YEARLY_TEST_DISCOUNT}% off tests` : "monthly plan"}, view breakdown`}
        style={({ pressed }) => [styles.total, pressed && styles.pressed]}
      >
        <GreenWash />
        <View style={styles.totalTile}>
          <PriceTag size={22} color={color.primary} />
        </View>
        <View style={styles.totalWords}>
          <Text style={styles.totalLabel}>
            {billing === "yearly" ? "Total due today" : "First month total"}
          </Text>
          <Text
            style={styles.totalValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {dollarsExact(cost.total)}
          </Text>
        </View>
        <View style={styles.totalLink}>
          <Text style={styles.totalLinkText}>View breakdown</Text>
          <CaretRight size={14} color={ink.primary} weight="bold" />
        </View>
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.heading} accessibilityRole="header">
          Pay with
        </Text>
        <View
          style={styles.methods}
          accessibilityRole="radiogroup"
          accessibilityLabel="Payment method"
        >
          {METHODS.map((m) => {
            const on = method === m.id
            return (
              <Pressable
                key={m.id}
                onPress={() => setMethod(m.id)}
                accessibilityRole="radio"
                accessibilityLabel={m.name}
                accessibilityState={{ checked: on }}
                style={({ pressed }) => [
                  styles.method,
                  on && styles.methodOn,
                  pressed && styles.pressed,
                ]}
              >
                <MethodMark method={m.id} size={16} />
                <Text
                  style={[styles.methodText, on && styles.methodTextOn]}
                  numberOfLines={1}
                >
                  {m.name}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={styles.section}>
        {method === "card" || method === "hsa" ? (
          <>
            <TextField
              label={method === "hsa" ? "HSA or FSA card number" : "Card number"}
              compact
              icon={({ color: c }) => <CreditCard size={18} color={c} />}
              value={number}
              onChangeText={(v) => setNumber(cardText(v))}
              placeholder="1234 5678 9012 3456"
              keyboardType="number-pad"
              autoComplete="cc-number"
              textContentType="creditCardNumber"
            />
            <View style={styles.pair}>
              <View style={styles.half}>
                <TextField
                  label="Expiry date"
                  compact
                  icon={({ color: c }) => <CalendarBlank size={18} color={c} />}
                  value={expiry}
                  onChangeText={(v) => setExpiry(expiryText(v))}
                  placeholder="MM / YY"
                  keyboardType="number-pad"
                  autoComplete="cc-exp"
                />
              </View>
              <View style={styles.half}>
                <TextField
                  label="CVC"
                  compact
                  icon={({ color: c }) => <Lock size={18} color={c} />}
                  value={cvc}
                  onChangeText={(v) => setCvc(v.replace(/\D/g, "").slice(0, 4))}
                  placeholder="123"
                  keyboardType="number-pad"
                  autoComplete="cc-csc"
                  secureTextEntry
                />
              </View>
            </View>
          </>
        ) : (
          <WalletPanel wallet={method} />
        )}

        <View style={styles.secure}>
          <Lock size={14} color={ink.tertiary} />
          <Text style={styles.secureText}>
            {method === "card" || method === "hsa"
              ? "Secure and encrypted"
              : "Secure and encrypted. Inlay never sees your card number."}
          </Text>
        </View>

        <View style={styles.agree}>
          <Checkbox
            checked={!!agreedAt}
            onChange={(on) =>
              setAgreedAt(on ? new Date().toISOString() : undefined)
            }
          >
            I agree to the{" "}
            <DocLink onPress={() => setDoc("terms")}>Terms of Service</DocLink>{" "}
            and{" "}
            <DocLink onPress={() => setDoc("privacy")}>Privacy Policy</DocLink>
            .
          </Checkbox>
        </View>
      </View>
    </PlanStepPage>
  )
}

/** Each way to pay as its mark: a card outline, Apple's black logo,
    Google's blue. */
function MethodMark({ method, size = 24 }: { method: Method; size?: number }) {
  if (method === "card") return <CreditCard size={size} color={ink.strong} />
  if (method === "hsa") return <FirstAidKit size={size} color={color.primary} />
  if (method === "apple")
    return <AppleLogo size={size} weight="fill" color="#000000" />
  return <GoogleLogo size={size} weight="bold" color="#4285F4" />
}

/** In place of the card fields, one row: the card her wallet pays with
    and how she confirms. */
function WalletPanel({ wallet }: { wallet: Wallet }) {
  const w = WALLETS[wallet]
  return (
    <View style={styles.wallet}>
      <MethodMark method={wallet} size={18} />
      <View style={styles.walletWords}>
        <Text style={styles.walletName}>{w.card}</Text>
        <Text
          style={styles.walletLine}
        >{`In ${w.where}, you confirm with ${w.confirm}`}</Text>
      </View>
    </View>
  )
}

/** The wallet's confirm sheet: the card, who is paid, today's amount and
    what follows, then the wallet's own button. Nothing is charged until
    she confirms here. */
function WalletSheet({
  wallet,
  amount,
  then,
  pending,
  onPay,
  onClose,
}: {
  wallet: Wallet
  amount: string
  then: string
  pending: boolean
  onPay: () => void
  onClose: () => void
}) {
  const w = WALLETS[wallet]
  return (
    <Sheet
      title={`Pay with ${w.name}`}
      titleRight={<MethodMark method={wallet} size={18} />}
      onClose={onClose}
    >
      <Card style={styles.sheetRows}>
        <KeyValue label="Card" value={`${w.card}, ${w.where}`} />
        <KeyValue label="Pay to" value="Inlay Health" />
        <KeyValue label="Due today" value={amount} />
        <KeyValue label="Then" value={`${then}, cancel anytime`} last />
      </Card>
      <View style={styles.sheetActions}>
        <Button
          onPress={onPay}
          pending={pending}
          icon={
            wallet === "apple"
              ? ({ color: c }) => <ScanSmiley size={18} color={c} />
              : undefined
          }
        >
          {w.button}
        </Button>
        <View style={styles.quiet}>
          <TextAction tone="muted" onPress={onClose}>
            Cancel
          </TextAction>
        </View>
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  // The first month on the plan card's green wash: the tag tile, a quiet
  // label over the amount, and "View breakdown" in teal; the whole card
  // opens the breakdown.
  total: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.item,
    marginTop: space.line,
    paddingVertical: space.item,
    paddingHorizontal: space.gutter,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WASH.edge,
    backgroundColor: color.background,
    overflow: "hidden",
  },
  // The tag on a white tile at 60%, so the wash shows faintly through.
  totalTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
  totalWords: { flex: 1, minWidth: 0, gap: 2 },
  totalLabel: { ...type.label },
  totalLink: { flexDirection: "row", alignItems: "center", gap: space.stack },
  totalLinkText: {
    fontFamily: font.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: ink.primary,
  },
  totalValue: {
    fontFamily: font.semibold,
    fontSize: 24,
    lineHeight: 30,
    color: ink.strong,
    fontVariant: ["tabular-nums"],
  },

  section: { gap: space.inline, marginTop: space.section },
  heading: { ...type.section },

  // Four ways to pay, two to a row.
  methods: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  // Each way to pay: its mark and name in a slim tile, edged in teal on
  // the light green when chosen, as the goals' rows are.
  method: {
    flexGrow: 1,
    flexBasis: "45%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.mark,
    minHeight: 44,
    paddingHorizontal: space.mark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
  },
  methodOn: { borderColor: color.primary, backgroundColor: "#E5F4F1" },
  methodText: {
    fontFamily: font.medium,
    fontSize: 13,
    lineHeight: 18,
    color: ink.secondary,
    flexShrink: 1,
  },
  methodTextOn: { color: ink.strong },

  pair: { flexDirection: "row", gap: space.item },
  half: { flex: 1 },

  secure: { flexDirection: "row", alignItems: "center", gap: space.mark },
  secureText: { ...type.meta, flexShrink: 1 },
  // The agreement stands apart from the card fields it follows.
  agree: { marginTop: space.item },

  wallet: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.item,
    minHeight: 52,
    paddingVertical: space.inline,
    paddingHorizontal: space.rowX,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
  },
  walletWords: { flex: 1, gap: space.line },
  walletName: { ...type.title, color: ink.strong },
  walletLine: { ...type.label },

  sheetRows: { paddingVertical: space.card - space.rowY },
  sheetActions: { gap: space.stack },
  quiet: { alignItems: "center" },

})
