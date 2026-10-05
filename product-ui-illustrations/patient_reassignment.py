#!/usr/bin/env python3
"""Patient reassignment — one illustration, built on the shipped language.

A fourteenth layout: a full-width *handoff* float (person -> person) over a
column of selectable records. Only choices 1-4 from archetypes.md move; every
constant, token and guard comes from build.py so it stays inside the family.
"""
import os
from build import (SW, LINE, FILL, FSOFT, SOFT, STRK, ACC,
                   panel, card, bar, dot, svg, icon, avatar, fits, padded)

UID, LABEL = 'patient-reassignment', 'Patient reassignment'


def reassignment(uid=UID, label=LABEL):
    # --- panel: sized to a caseload list, open at the bottom (there are more)
    b = panel(uid, 20, 120, 8, mode='fade', back='none')

    # --- the caseload: four records, the first two picked up for the move.
    # Selection is a filled mark vs an outline one -- same dot, two states.
    ROWS = [(50, True, ACC), (42, True, FILL), (46, False, FILL), (40, False, FILL)]
    for i, (w, sel, c) in enumerate(ROWS):
        y = 64 + i * 18                             # the fourth lands in the fade
        b += dot(35, y, 3.2, sel, c)
        b += avatar(46, y - 5.5, 11)                # smaller than the two above:
        b += bar(62, y - 2.5, w, 5)                 # these are the records, not the owners
        b += bar(118, y - 2.3, 11, 4.6, FSOFT)      # the status column, secondary

    # --- the float: the handoff itself. Unavailable coordinator, arrow, the one
    # covering for them. It says what the rows below cannot.
    cx, cy, cw, ch = 11, 22, 138, 28
    ib, tb = (ch - 15) / 2, (ch - 5) / 2            # icon / bar vertical centring
    f = card(cx, cy, cw, ch, 8, uid)
    f += icon('user-circle', 26, cy + ib, 15, SOFT)  # away
    f += bar(47, cy + tb, 26, 5, FSOFT)
    f += icon('arrow-right', fits(73, 87, 10, 'handoff arrow'), cy + (ch - 10) / 2, 10, SOFT)
    f += icon('user-circle', 87, cy + ib, 15, STRK)  # covering
    f += bar(108, cy + tb, 26, 5, FILL)
    padded(cy, ch, cy + ib, cy + ib + 15, 'handoff card')

    return uid, label, svg(uid, label, b, f)


if __name__ == '__main__':
    uid, label, doc = reassignment()
    os.makedirs('illustrations', exist_ok=True)
    open(f'illustrations/{uid}.svg', 'w').write(doc)

    def themed(t):
        d = doc.replace('-' + uid + '"', '-' + uid + t + '"')
        return d.replace('-' + uid + ')', '-' + uid + t + ')')

    open(f'illustrations/{uid}.html', 'w').write(f'''<!doctype html><meta charset="utf-8">
<title>{label}</title>
<style>
{open('assets/illustration.css').read()}
  body {{ margin:0; font:13px/1.5 ui-sans-serif,-apple-system,"Segoe UI",sans-serif; }}
  .pane {{ padding:30px; display:flex; gap:34px; align-items:flex-start; }}
  .light {{ background:#EDEAE6; color:#7a736a; }}
  .dark {{ background:#1A1918; color:#877f74; }}
  .s160 svg {{ width:160px; }} .s96 svg {{ width:96px; }} .s320 svg {{ width:320px; }}
</style>
<div class="pane light" data-theme="light">
  <div class="s320">{themed('l')}</div><div class="s160">{themed('l2')}</div><div class="s96">{themed('l3')}</div>
</div>
<div class="pane dark" data-theme="dark">
  <div class="s320">{themed('d')}</div><div class="s160">{themed('d2')}</div><div class="s96">{themed('d3')}</div>
</div>
''')

    import flatten as fl
    for theme in ('light', 'dark'):
        out = f'illustrations/flat/{theme}'
        os.makedirs(out, exist_ok=True)
        open(f'{out}/{uid}.svg', 'w').write(fl.flatten(doc, fl.theme_vars(theme)))

    print('wrote illustrations/' + uid + '.svg')
