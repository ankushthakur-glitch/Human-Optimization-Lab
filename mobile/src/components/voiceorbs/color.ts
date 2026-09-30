/* Colour helpers from VoiceOrbs (MIT, see LICENSE here): mixing happens in
   linear light, as the original does, so gradients don't go muddy. */

export type Rgb = [number, number, number]

export const hex = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb

const toLinear = (c: number) => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
const toSrgb = (v: number) => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
  return Math.min(255, Math.max(0, c * 255))
}

export const mix = (a: Rgb, b: Rgb, t: number): Rgb =>
  a.map((x, i) => toSrgb(toLinear(x) + (toLinear(b[i]) - toLinear(x)) * t)) as Rgb

export const rgba = ([r, g, b]: Rgb, alpha: number) =>
  `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${Math.min(1, Math.max(0, alpha)).toFixed(3)})`

export const rotateHue = ([r, g, b]: Rgb, degrees: number): Rgb => {
  const a = (degrees * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  const k = 1 / 3
  const q = Math.sqrt(k)
  const m0 = c + (1 - c) * k
  const m1 = k * (1 - c) - q * s
  const m2 = k * (1 - c) + q * s
  const clamp = (v: number) => Math.min(255, Math.max(0, v))
  return [clamp(r * m0 + g * m1 + b * m2), clamp(r * m2 + g * m0 + b * m1), clamp(r * m1 + g * m2 + b * m0)]
}
