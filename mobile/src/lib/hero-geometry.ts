/* Where things sit in the upgrade banner's picture (upgrade-hero.png, 1672
   by 941), measured by eye off the picture and checked against it. The
   banner's motion is drawn on top of the still picture in these coordinates,
   so they have to line up with it. If the picture is ever replaced, measure
   these again. */

export const HERO_W = 1672
export const HERO_H = 941

/** The four data cards: where each is and how round its corners are. */
export const CARDS = [
  { id: "heart", x: 280, y: 398, w: 243, h: 149, r: 22 },
  { id: "bars", x: 385, y: 608, w: 135, h: 139, r: 18 },
  { id: "profile", x: 1134, y: 440, w: 206, h: 136, r: 22 },
  { id: "trend", x: 1201, y: 646, w: 196, h: 141, r: 22 },
] as const

/** The round or rounded icons: the centre, and the ring drawn around each. */
export const ICONS = [
  { id: "heart", cx: 334, cy: 448, r: 32, hue: "#2FC4B2" },
  { id: "pill", cx: 153, cy: 569, r: 46, hue: "#8E86E8" },
  { id: "shield", cx: 1445, cy: 388, r: 54, hue: "#2FC4B2" },
  { id: "lotus", cx: 1501, cy: 603, r: 46, hue: "#8E86E8" },
] as const

/** The thin lines that join the cards. A light travels along each. */
export const LINKS = [
  { id: "centre", d: "M523 448 C640 490 700 560 762 582 C830 610 890 618 940 612 C1020 606 1085 585 1134 556", len: 760 },
  { id: "left-top", d: "M190 533 C215 508 250 492 280 490", len: 120 },
  { id: "left-low", d: "M168 616 C205 660 255 676 300 650 C335 632 360 630 385 632", len: 260 },
  { id: "right-top", d: "M1265 437 C1300 400 1350 380 1393 385", len: 170 },
  { id: "right-loop", d: "M1497 420 C1560 450 1600 520 1580 570 C1570 585 1560 592 1545 596", len: 260 },
  { id: "right-low", d: "M1459 628 C1435 650 1415 668 1397 683", len: 90 },
] as const

/** The two small graph lines, as the polyline of each. A dot runs along. */
export const GRAPHS = [
  { id: "heart", d: "M388 470 L408 458 L420 468 L440 444 L452 456 L470 436 L488 432", len: 130 },
  { id: "trend", d: "M1228 724 L1248 710 L1262 718 L1290 698 L1306 710 L1330 690 L1362 673", len: 160 },
] as const

/** The three bars of the chart card, from the left. */
export const BARS = [
  { x: 412, y: 668, w: 16, h: 18 },
  { x: 432, y: 658, w: 16, h: 28 },
  { x: 456, y: 646, w: 16, h: 40 },
  { x: 476, y: 630, w: 14, h: 56 },
] as const
