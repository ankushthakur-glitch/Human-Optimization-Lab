import * as React from "react"
import { Image, StyleSheet, Text, View } from "react-native"
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg"

import { Check, Flask, ShieldCheck, Sparkle } from "@/components/ph"
import { HUE } from "@/components/record-kit"
import { AREAS } from "@/lib/flourishing"
import { chart, color, font, ink } from "@/lib/theme"

/* The app's two short videos, drawn as motion graphics in the app's own
   pieces until the real films are made. Each MP4 under assets/videos is
   rendered from here, frame by frame (scripts/render-film.mjs drives
   /film-render, scripts/encode-video.swift writes the clip); the app plays
   the clips (components/film-player). Each scene sits under its headline.

   welcome, "What optimization gets you" (2 Nov call), the Home popup:
   the title card; a plan built from her record (steps tick, her physician
   sees every change); tests ordered and booked at Quest; Ask Inlay; A1c
   falling into range against day one with biological age counting down;
   the health decline curve (the usual path meets the floor years before
   the path with a plan, the years won fill in); "Ready when you are".

   flourishing, "Are you flourishing?" (16 Oct call), before the
   questions: the title card; her numbers, then how she lives; the eight
   parts of life (AREAS); one question at a time on the 1 to 10 scale; her
   result shaping the plan, shared only with her care team; "There are no
   right answers". */

const MARK = require("../../assets/logo-mark-white.png")

type Scene = { title?: string; len: number; Draw: (p: { s: number; w: number; h: number }) => React.ReactElement }

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
/** Ease out over [a, b] seconds of a scene. */
const span = (s: number, a: number, b: number) => 1 - Math.pow(1 - clamp01((s - a) / (b - a)), 3)
/** A pop that overshoots a little and settles. */
const pop = (s: number, a: number, len = 0.5) => {
  const x = clamp01((s - a) / len) - 1
  return x === 0 ? 1 : 1 + 2.70158 * x * x * x + 1.70158 * x * x
}
const lerp = (a: number, b: number, p: number) => a + (b - a) * p

/* ------------------------------------------------------------ scenes -- */

const A1C = [6.1, 6.0, 5.9, 5.8, 5.6, 5.4]
const A1C_HIGH = 5.6

function Progress({ s, w, h }: { s: number; w: number; h: number }) {
  const x0 = 30
  const x1 = w - 30
  const y0 = 64
  const y1 = Math.round(h * 0.64)
  const lo = 4.9
  const hi = 6.3
  const xAt = (i: number) => lerp(x0, x1, i / (A1C.length - 1))
  const yAt = (v: number) => lerp(y1, y0, (v - lo) / (hi - lo))
  const p = span(s, 0.6, 3.2)
  const reach = p * (A1C.length - 1)
  const whole = Math.floor(reach)
  const pts = A1C.slice(0, whole + 1).map((v, i) => [xAt(i), yAt(v)])
  if (whole < A1C.length - 1) pts.push([lerp(xAt(whole), xAt(whole + 1), reach - whole), yAt(lerp(A1C[whole], A1C[whole + 1], reach - whole))])
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")
  const value = lerp(A1C[0], A1C[A1C.length - 1], p)
  const reached = pop(s, 3.2, 0.5)
  const bio = span(s, 4.2, 4.8)
  const years = Math.round(lerp(53, 49, span(s, 4.4, 5.6)))
  return (
    <>
      <View style={[film.card, { left: 16, top: 4, right: 16, height: y1 + 10 }]} />
      <Text style={[film.small, { position: "absolute", left: 30, top: 16 }]}>A1c since day one</Text>
      <Text style={[film.big, { position: "absolute", left: 30, top: 30, color: value > A1C_HIGH ? color.high : color.ok }]}>{value.toFixed(1)}%</Text>
      <View style={[film.badge, film.badgeGood, { position: "absolute", right: 30, top: 24, opacity: clamp01(reached), transform: [{ scale: reached }] }]}>
        <Text style={[film.badgeText, { color: color.ok }]}>In range</Text>
      </View>
      <Svg style={StyleSheet.absoluteFill} width={w} height={h}>
        <Rect x={x0} y={yAt(A1C_HIGH)} width={x1 - x0} height={y1 - yAt(A1C_HIGH)} fill={chart.band} />
        <Path d={d} stroke={chart.data} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {A1C.map((v, i) =>
          i <= reach + 0.001 ? (
            <Circle key={i} cx={xAt(i)} cy={yAt(v)} r={i === A1C.length - 1 ? 3 + 2 * clamp01(reached) : 3.5} fill={v > A1C_HIGH ? chart.borderline : chart.inRange} stroke={color.background} strokeWidth={1.5} />
          ) : null,
        )}
        <SvgText x={xAt(0)} y={yAt(A1C[0]) - 10} fill={ink.secondary} fontFamily={font.regular} fontSize={11} textAnchor="start">
          Day one
        </SvgText>
      </Svg>
      <View style={[film.pill, { left: 16, bottom: 10, opacity: bio, transform: [{ translateY: lerp(24, 0, bio) }] }]}>
        <Text style={film.pillLabel}>Biological age</Text>
        <Text style={film.pillValue}>{years}</Text>
        <Text style={film.pillMeta}>Down from 53</Text>
      </View>
    </>
  )
}

const TESTS = ["Lipid panel", "A1c", "Vitamin D"]
const SLOTS = ["Mon 8:00", "Tue 9:30", "Thu 7:45"]

function Tests({ s }: { s: number; w: number; h: number }) {
  const slots = span(s, 1.8, 2.4)
  const chosen = s > 2.9
  const booked = pop(s, 3.8, 0.5)
  return (
    <View style={[StyleSheet.absoluteFill, { padding: 16, paddingTop: 4, gap: 12, justifyContent: "center" }]}>
      <View style={[film.card, film.planCard]}>
        <Text style={film.planTitle}>Your baseline tests</Text>
        {TESTS.map((test, i) => {
          const enter = span(s, 0.3 + i * 0.3, 0.8 + i * 0.3)
          return (
            <View key={test} style={[film.step, { opacity: enter, transform: [{ translateX: lerp(-20, 0, enter) }] }]}>
              <View style={film.testIcon}>
                <Flask size={12} color={color.primary} />
              </View>
              <Text style={film.stepText}>{test}</Text>
            </View>
          )
        })}
      </View>
      <View style={[film.slots, { opacity: slots, transform: [{ translateY: lerp(12, 0, slots) }] }]}>
        {SLOTS.map((slot, i) => {
          const on = chosen && i === 1
          return (
            <View key={slot} style={[film.slot, on && film.slotOn]}>
              <Text style={[film.slotText, on && film.slotTextOn]}>{slot}</Text>
            </View>
          )
        })}
      </View>
      <View style={[film.physician, film.bookedChip, { opacity: clamp01(booked), transform: [{ scale: booked }] }]}>
        <Check size={14} color={color.ok} weight="bold" />
        <Text style={[film.physicianText, { color: color.ok }]}>Booked at Quest, Tuesday 9:30</Text>
      </View>
    </View>
  )
}

const QUESTION = "What would lower my A1c fastest?"
const ANSWER = "Your record points to two things: late dinners and short sleep. Your plan covers both, and your physician sees how it goes."

function Ask({ s, w }: { s: number; w: number; h: number }) {
  const mine = span(s, 0.3, 0.9)
  const typing = s > 1.3 && s < 2.5
  const reply = span(s, 2.4, 2.8)
  const shown = ANSWER.slice(0, Math.floor(ANSWER.length * clamp01((s - 2.6) / 2.6)))
  return (
    <View style={[StyleSheet.absoluteFill, { padding: 16, paddingTop: 4, gap: 10 }]}>
      <View style={[film.mine, { maxWidth: w * 0.72, opacity: mine, transform: [{ translateX: lerp(60, 0, mine) }] }]}>
        <Text style={film.mineText}>{QUESTION}</Text>
      </View>
      {(typing || reply > 0) && (
        <View style={film.theirsRow}>
          <View style={film.orb}>
            <Sparkle size={14} color={color.onPrimary} weight="fill" />
          </View>
          {typing ? (
            <View style={[film.theirs, film.dots]}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[film.dot, { opacity: 0.35 + 0.65 * Math.max(0, Math.sin((s - 1.3) * 8 - i * 0.9)) }]} />
              ))}
            </View>
          ) : (
            <View style={[film.theirs, { maxWidth: w - 32 - 36, opacity: reply }]}>
              <Text style={film.theirsName}>Ask Inlay</Text>
              <Text style={film.theirsText}>{shown}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const STEPS = ["Baseline tests booked", "Lights out by 10:30", "Walk 30 minutes a day", "Dinner before 7"]

function Plan({ s }: { s: number; w: number; h: number }) {
  const badge = span(s, 4.8, 5.4)
  return (
    <View style={[StyleSheet.absoluteFill, { padding: 16, paddingTop: 4, gap: 10, justifyContent: "center" }]}>
      <View style={[film.card, film.planCard]}>
        <Text style={film.planTitle}>Your plan</Text>
        {STEPS.map((step, i) => {
          const enter = span(s, 0.3 + i * 0.35, 0.8 + i * 0.35)
          const tick = pop(s, 2.2 + i * 0.55, 0.4)
          return (
            <View key={step} style={[film.step, { opacity: enter, transform: [{ translateY: lerp(14, 0, enter) }] }]}>
              <View style={[film.tick, tick > 0 && film.tickDone]}>
                {tick > 0 && (
                  <View style={{ transform: [{ scale: tick }] }}>
                    <Check size={12} color={color.onPrimary} weight="bold" />
                  </View>
                )}
              </View>
              <Text style={film.stepText}>{step}</Text>
            </View>
          )
        })}
      </View>
      <View style={[film.physician, { opacity: badge, transform: [{ translateY: lerp(16, 0, badge) }] }]}>
        <ShieldCheck size={16} color={ink.primary} />
        <Text style={film.physicianText}>Your physician sees every change</Text>
      </View>
    </View>
  )
}

/* The decline curve: health 0 to 100 across ages 40 to 90, the floor at a
   third. The usual path is slow then steep, under the floor in the late
   seventies; with a plan it stays flatter for longer, near ninety. */
const AGE_FROM = 40
const AGE_TO = 90
const YOU = 45
const FLOOR = 35
const usual = (age: number) => 100 - 65 * Math.pow(Math.max(0, age - AGE_FROM) / 36, 2.4)
const planned = (age: number) => 100 - 65 * Math.pow(Math.max(0, age - AGE_FROM) / 48, 3)
function meetsFloor(path: (age: number) => number) {
  let lo = AGE_FROM
  let hi = AGE_TO
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (path(mid) > FLOOR) lo = mid
    else hi = mid
  }
  return lo
}
const USUAL_MEETS = meetsFloor(usual)
const PLANNED_MEETS = meetsFloor(planned)

function Floor({ s, w, h }: { s: number; w: number; h: number }) {
  const x0 = 16
  const x1 = w - 16
  const y0 = 22
  const y1 = h - 28
  const x = (age: number) => lerp(x0, x1, (age - AGE_FROM) / (AGE_TO - AGE_FROM))
  const y = (v: number) => lerp(y1, y0, Math.max(0, v) / 100)
  const drawn = (path: (age: number) => number, to: number, p: number) => {
    const end = lerp(YOU, to, p)
    const pts: string[] = []
    for (let a = YOU; a <= end + 0.001; a += 0.5) pts.push(`${pts.length ? "L" : "M"}${x(a).toFixed(1)} ${y(path(a)).toFixed(1)}`)
    return pts.join(" ")
  }
  const ground = span(s, 0.2, 0.8)
  const a = span(s, 0.8, 2.8)
  const b = span(s, 2.8, 4.6)
  const won = span(s, 4.6, 5.6)
  const fy = y(FLOOR)
  const face = { fontFamily: font.regular, fontSize: 11 }
  return (
    <Svg style={StyleSheet.absoluteFill} width={w} height={h}>
      <Rect x={x0} y={fy} width={x1 - x0} height={y1 - fy} fill={color.highTint} opacity={0.8 * ground} />
      <Line x1={x0} x2={x1} y1={fy} y2={fy} stroke="#DE6F68" strokeWidth={1} strokeDasharray="4 4" opacity={ground} />
      <SvgText x={x0 + 4} y={fy - 6} fill={ink.content} fontFamily={font.medium} fontSize={12} opacity={ground}>
        The floor
      </SvgText>
      <SvgText x={x0 + 4} y={fy + 15} fill={ink.secondary} {...face} opacity={ground}>
        Needing help with daily life
      </SvgText>
      {[40, 50, 60, 70, 80, 90].map((age) => (
        <SvgText key={age} x={x(age)} y={h - 10} fill={ink.secondary} {...face} textAnchor={age === 40 ? "start" : age === 90 ? "end" : "middle"} opacity={ground}>
          {String(age)}
        </SvgText>
      ))}
      {a > 0 && <Path d={drawn(usual, USUAL_MEETS + 5, a)} stroke={chart.goal} strokeWidth={2} fill="none" strokeLinecap="round" />}
      {a >= 1 && (
        <SvgText x={x(68) - 8} y={y(usual(68))} fill={ink.secondary} {...face} textAnchor="end">
          Usual path
        </SvgText>
      )}
      {b > 0 && <Path d={drawn(planned, AGE_TO, b)} stroke={chart.data} strokeWidth={2.5} fill="none" strokeLinecap="round" />}
      {b >= 1 && (
        <SvgText x={x(AGE_TO) - 2} y={y(planned(78)) - 10} fill={ink.primary} fontFamily={font.semibold} fontSize={11} textAnchor="end">
          With a plan
        </SvgText>
      )}
      {won > 0 && (
        <>
          <Line x1={x(USUAL_MEETS)} x2={lerp(x(USUAL_MEETS), x(PLANNED_MEETS), won)} y1={fy} y2={fy} stroke={chart.data} strokeWidth={4} strokeLinecap="round" />
          <SvgText x={x(81)} y={fy - 10} fill={ink.primary} fontFamily={font.semibold} fontSize={12} textAnchor="middle" opacity={won}>
            Years won
          </SvgText>
        </>
      )}
      <Circle cx={x(YOU)} cy={y(planned(YOU))} r={5} fill={chart.data} stroke={color.background} strokeWidth={2} opacity={ground} />
      <SvgText x={x(YOU)} y={y(planned(YOU)) + 20} fill={ink.strong} fontFamily={font.semibold} fontSize={12} textAnchor="middle" opacity={ground}>
        You
      </SvgText>
    </Svg>
  )
}

/** The mark with a headline and a line under it: the opening and the close. */
function Card({ s, title, line }: { s: number; title: string; line: string }) {
  const mark = pop(s, 0, 0.7)
  const head = span(s, 0.5, 1.1)
  const under = span(s, 0.9, 1.5)
  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", gap: 10 }]}>
      <View style={[film.mark, { opacity: clamp01(mark), transform: [{ scale: mark }] }]}>
        <Image source={MARK} style={{ width: 36, height: 36 }} resizeMode="contain" />
      </View>
      <Text style={[film.endTitle, { opacity: head, transform: [{ translateY: lerp(10, 0, head) }] }]}>{title}</Text>
      <Text style={[film.endLine, { opacity: under, transform: [{ translateY: lerp(10, 0, under) }] }]}>{line}</Text>
    </View>
  )
}

const Intro = ({ s }: { s: number; w: number; h: number }) => <Card s={s} title="What optimization gets you" line="A plan built from your record, with your physician." />
const End = ({ s }: { s: number; w: number; h: number }) => <Card s={s} title="Ready when you are" line="Start free. Upgrade to optimization whenever you like." />

/* ------------------------------------------- the flourishing film -- */

const NUMBERS = [
  { name: "A1c", value: "5.4%" },
  { name: "LDL", value: "162" },
  { name: "Blood pressure", value: "134/86" },
]
const LIVING = ["How you sleep", "How you feel", "Who you have around you", "What gives you meaning"]

function MoreThanNumbers({ s }: { s: number; w: number; h: number }) {
  const and = span(s, 1.6, 2.2)
  return (
    <View style={[StyleSheet.absoluteFill, { padding: 16, paddingTop: 4, gap: 12, justifyContent: "center" }]}>
      <View style={film.numbers}>
        {NUMBERS.map((n, i) => {
          const enter = pop(s, 0.2 + i * 0.25, 0.5)
          return (
            <View key={n.name} style={[film.number, { opacity: clamp01(enter), transform: [{ scale: enter }] }]}>
              <Text style={film.small}>{n.name}</Text>
              <Text style={film.numberValue}>{n.value}</Text>
            </View>
          )
        })}
      </View>
      <View style={[film.card, film.planCard, { opacity: and, transform: [{ translateY: lerp(16, 0, and) }] }]}>
        <Text style={film.planTitle}>And how you live</Text>
        {LIVING.map((line, i) => {
          const enter = span(s, 2.4 + i * 0.35, 2.9 + i * 0.35)
          return (
            <View key={line} style={[film.step, { opacity: enter, transform: [{ translateX: lerp(-16, 0, enter) }] }]}>
              <View style={film.livingDot} />
              <Text style={film.stepText}>{line}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function EightParts({ s, w }: { s: number; w: number; h: number }) {
  const tile = (w - 32 - 8) / 2
  return (
    <View style={[StyleSheet.absoluteFill, { padding: 16, paddingTop: 4, flexDirection: "row", flexWrap: "wrap", gap: 8, alignContent: "center" }]}>
      {AREAS.map((area, i) => {
        const enter = pop(s, 0.3 + i * 0.22, 0.45)
        const hue = HUE[area.hue]
        return (
          <View key={area.name} style={[film.area, { width: tile, opacity: clamp01(enter), transform: [{ scale: lerp(0.6, 1, enter) }] }]}>
            <View style={[film.areaDot, { backgroundColor: hue.ink }]} />
            <Text style={[film.areaText, { color: ink.content }]}>{area.name}</Text>
          </View>
        )
      })}
    </View>
  )
}

function OneQuestion({ s }: { s: number; w: number; h: number }) {
  const card = span(s, 0.2, 0.8)
  const picked = s > 2.6
  const tap = pop(s, 2.6, 0.35)
  const next = span(s, 3.4, 3.9)
  return (
    <View style={[StyleSheet.absoluteFill, { padding: 16, paddingTop: 4, gap: 12, justifyContent: "center" }]}>
      <View style={[film.card, film.planCard, { opacity: card, transform: [{ translateY: lerp(16, 0, card) }] }]}>
        <View style={film.track}>
          <View style={[film.trackFill, { width: `${lerp(20, 26, span(s, 2.8, 3.4))}%` }]} />
        </View>
        <Text style={film.planTitle}>How satisfied are you with your energy and vitality?</Text>
        <View style={film.scale}>
          {Array.from({ length: 10 }, (_, i) => {
            const on = picked && i === 6
            return (
              <View key={i} style={[film.scaleKey, on && film.scaleKeyOn, on && { transform: [{ scale: tap }] }]}>
                <Text style={[film.scaleText, on && film.slotTextOn]}>{i + 1}</Text>
              </View>
            )
          })}
        </View>
      </View>
      <View style={[film.next, { opacity: next, transform: [{ translateY: lerp(10, 0, next) }] }]}>
        <Text style={film.nextText}>Next question</Text>
      </View>
    </View>
  )
}

const RESULT = [
  { name: "Relationships", score: 8, tone: chart.inRange },
  { name: "Life balance", score: 5, tone: chart.borderline },
  { name: "Finances", score: 4, tone: chart.borderline },
]

function ShapesPlan({ s }: { s: number; w: number; h: number }) {
  const ring = span(s, 0.3, 2)
  const R = 34
  const C = 2 * Math.PI * R
  const shared = pop(s, 3.4, 0.5)
  return (
    <View style={[StyleSheet.absoluteFill, { padding: 16, paddingTop: 4, gap: 12, justifyContent: "center" }]}>
      <View style={[film.card, film.planCard, { flexDirection: "row", alignItems: "center", gap: 16 }]}>
        <View style={{ width: 84, height: 84, alignItems: "center", justifyContent: "center" }}>
          <Svg width={84} height={84} style={StyleSheet.absoluteFill}>
            <Circle cx={42} cy={42} r={R} stroke={chart.dataTrack} strokeWidth={8} fill="none" />
            <Circle cx={42} cy={42} r={R} stroke={chart.data} strokeWidth={8} fill="none" strokeLinecap="round" strokeDasharray={`${C * 0.7 * ring} ${C}`} transform="rotate(-90 42 42)" />
          </Svg>
          <Text style={film.ringValue}>{(7 * ring).toFixed(1)}</Text>
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          {RESULT.map((r, i) => {
            const grow = span(s, 1.2 + i * 0.3, 2.2 + i * 0.3)
            return (
              <View key={r.name} style={{ gap: 3 }}>
                <Text style={film.small}>{r.name}</Text>
                <View style={film.bar}>
                  <View style={[film.barFill, { width: `${r.score * 10 * grow}%`, backgroundColor: r.tone }]} />
                </View>
              </View>
            )
          })}
        </View>
      </View>
      <View style={[film.physician, { opacity: clamp01(shared), transform: [{ scale: shared }] }]}>
        <ShieldCheck size={16} color={ink.primary} />
        <Text style={film.physicianText}>Shared only with your care team</Text>
      </View>
    </View>
  )
}

const FlourishIntro = ({ s }: { s: number; w: number; h: number }) => <Card s={s} title="Are you flourishing?" line="A short look at your whole life, not just your results." />
const FlourishEnd = ({ s }: { s: number; w: number; h: number }) => <Card s={s} title="There are no right answers" line="Only you and your care team see them." />

/* -------------------------------------------------------------- clock -- */

const FILMS = {
  /** "What optimization gets you": the Home popup (components/welcome-video). */
  welcome: [
    { len: 4, Draw: Intro },
    { title: "A plan built from your record", len: 6, Draw: Plan },
    { title: "Tests ordered and booked for you", len: 6, Draw: Tests },
    { title: "Ask Inlay about your own results", len: 7, Draw: Ask },
    { title: "Progress measured against day one", len: 7, Draw: Progress },
    { title: "More years above the floor", len: 7, Draw: Floor },
    { len: 5, Draw: End },
  ],
  /** "Are you flourishing?" (/flourishing), before the questions. */
  flourishing: [
    { len: 4, Draw: FlourishIntro },
    { title: "Your health is more than your numbers", len: 5, Draw: MoreThanNumbers },
    { title: "Eight parts of your life", len: 6, Draw: EightParts },
    { title: "One question at a time", len: 6, Draw: OneQuestion },
    { title: "Your answers shape your plan", len: 5, Draw: ShapesPlan },
    { len: 4, Draw: FlourishEnd },
  ],
} satisfies Record<string, Scene[]>

export type Film = keyof typeof FILMS
export const isFilm = (name: unknown): name is Film => typeof name === "string" && name in FILMS

const starts = (scenes: Scene[]) => scenes.reduce<number[]>((acc, _, i) => [...acc, i ? acc[i - 1] + scenes[i - 1].len : 0], [])
/** A film's length in seconds. */
export const filmSeconds = (name: Film) => FILMS[name].reduce((sum, sc) => sum + sc.len, 0)
const FADE = 0.35

/** A film at `t` seconds, `w` by `h`: the scene playing then, faded in
    and out at its edges, its headline over it, on the soft teal ground. */
export function FilmFrame({ film: name, t, w, h }: { film: Film; t: number; w: number; h: number }) {
  const scenes: Scene[] = FILMS[name]
  const at = starts(scenes)
  const index = Math.max(0, at.findLastIndex((start) => t >= start))
  const scene = scenes[index]
  const local = t - at[index]
  const last = index === scenes.length - 1
  const opacity = Math.min(index === 0 ? 1 : clamp01(local / FADE), last ? 1 : clamp01((scene.len - local) / FADE))
  const Draw = scene.Draw
  const top = scene.title ? TITLE : 0
  const head = span(local, 0.1, 0.7)
  return (
    <View style={[ground.stage, { width: w, height: h }]}>
      <View style={ground.glowA} />
      <View style={ground.glowB} />
      {scene.title && (
        <Text style={[ground.title, { opacity: Math.min(head, opacity), transform: [{ translateY: lerp(10, 0, head) }] }]}>{scene.title}</Text>
      )}
      <View style={[ground.scene, { top, height: h - top, opacity }]}>
        <Draw s={local} w={w} h={h - top} />
      </View>
    </View>
  )
}

/** The band over the picture that carries each scene's headline. */
const TITLE = 60

const film = StyleSheet.create({
  chip: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 6, paddingRight: 12, height: 36, borderRadius: 18, backgroundColor: color.background, boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)" },
  chipIcon: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: color.primarySoft },
  chipText: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: ink.content },
  card: { position: "absolute", borderRadius: 14, backgroundColor: color.background, overflow: "hidden", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)" },
  cardHead: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: color.primary },
  cardHeadText: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, color: color.onPrimary },
  cardBody: { padding: 10, gap: 6 },
  big: { fontFamily: font.semibold, fontSize: 22, lineHeight: 28, color: ink.strong, fontVariant: ["tabular-nums"] },
  small: { fontFamily: font.regular, fontSize: 11, lineHeight: 14, color: ink.secondary },
  skeleton: { height: 6, borderRadius: 3, backgroundColor: color.primarySoft },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: color.highTint },
  badgeGood: { backgroundColor: color.okTint },
  badgeText: { fontFamily: font.semibold, fontSize: 11, lineHeight: 14, color: color.high },
  pill: { position: "absolute", flexDirection: "row", alignItems: "baseline", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: color.background, boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)" },
  pillLabel: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: ink.content },
  pillValue: { fontFamily: font.semibold, fontSize: 20, lineHeight: 24, color: ink.strong, fontVariant: ["tabular-nums"] },
  pillMeta: { fontFamily: font.regular, fontSize: 11, lineHeight: 14, color: ink.tertiary },
  mine: { alignSelf: "flex-end", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderBottomRightRadius: 4, backgroundColor: color.primary },
  mineText: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.onPrimary },
  theirsRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  orb: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: color.primary },
  theirs: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderTopLeftRadius: 4, backgroundColor: color.background, gap: 2 },
  theirsName: { fontFamily: font.semibold, fontSize: 11, lineHeight: 14, color: ink.primary },
  theirsText: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink.content },
  dots: { flexDirection: "row", gap: 4, paddingVertical: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ink.secondary },
  planCard: { position: "relative", padding: 12, gap: 10 },
  planTitle: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: ink.strong },
  step: { flexDirection: "row", alignItems: "center", gap: 10 },
  tick: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: color.primaryLine, alignItems: "center", justifyContent: "center" },
  tickDone: { borderColor: color.primary, backgroundColor: color.primary },
  numbers: { flexDirection: "row", gap: 8 },
  number: { flex: 1, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: color.background, gap: 2 },
  numberValue: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20, color: ink.strong },
  livingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.primary },
  area: { flexDirection: "row", alignItems: "center", gap: 8, height: 50, paddingHorizontal: 12, borderRadius: 12, backgroundColor: color.background },
  areaDot: { width: 8, height: 8, borderRadius: 4 },
  areaText: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },
  track: { height: 4, borderRadius: 2, backgroundColor: chart.track, overflow: "hidden" },
  trackFill: { height: 4, borderRadius: 2, backgroundColor: color.primary },
  scale: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  scaleKey: { width: "18%", height: 34, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: color.primaryEdge, backgroundColor: color.background },
  scaleKeyOn: { borderColor: color.primary, backgroundColor: color.primary },
  scaleText: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: ink.content },
  next: { alignSelf: "flex-end", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: color.primary },
  nextText: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, color: color.onPrimary },
  ringValue: { fontFamily: font.semibold, fontSize: 20, lineHeight: 24, color: ink.strong, fontVariant: ["tabular-nums"] },
  bar: { height: 6, borderRadius: 3, backgroundColor: chart.track, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  testIcon: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: color.primarySoft },
  slots: { flexDirection: "row", gap: 8 },
  slot: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: color.primaryEdge, backgroundColor: color.background },
  slotOn: { borderColor: color.primary, backgroundColor: color.primary },
  slotText: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: ink.content },
  slotTextOn: { color: color.onPrimary },
  bookedChip: { backgroundColor: color.okTint },
  stepText: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink.content },
  physician: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: color.background },
  physicianText: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: ink.primary },
  mark: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: color.primary },
  endTitle: { fontFamily: font.semibold, fontSize: 20, lineHeight: 26, color: ink.strong },
  endLine: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink.secondary, textAlign: "center", paddingHorizontal: 24 },
})

const ground = StyleSheet.create({
  stage: { overflow: "hidden", backgroundColor: color.primaryTint },
  scene: { position: "absolute", left: 0, right: 0 },
  title: { position: "absolute", top: 18, left: 16, right: 16, fontFamily: font.semibold, fontSize: 19, lineHeight: 26, color: ink.strong },
  glowA: { position: "absolute", width: 220, height: 220, borderRadius: 110, top: -90, right: -70, backgroundColor: color.primarySoft },
  glowB: { position: "absolute", width: 160, height: 160, borderRadius: 80, bottom: -70, left: -50, backgroundColor: color.primarySoft },
})
