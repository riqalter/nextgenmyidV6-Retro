# FUTC — How It Works

> Reverse-engineered from [futc.de](https://futc.de/).
> Source of truth: `index.html`, `js/main.js?v=8`, `js/hero.js?v=10`,
> `js/reel.js?v=8`, `js/presets.js?v=12`, `css/style.css?v=13`.
> Captured 2026-10-10.

---

## 0. Shape of the thing

A **single static page** — one HTML file, two CSS files, four vanilla JS files,
five self-hosted fonts, one JSON file, some images and two videos. No framework,
no build step, no bundler, no npm. The largest JS file (`hero.js`, 752 lines) is
hand-written WebGL with a hand-written matrix library.

```
/                                   ← static host
├── index.html                      28 KB, everything
├── impressum.html
├── datenschutz.html
├── css/
│   ├── style.css?v=13              999 lines — the entire design system
│   └── fonts.css?v=8                52 lines — 5 @font-face
├── js/
│   ├── main.js?v=8                 280 lines — all interface behaviour
│   ├── hero.js?v=10                752 lines — WebGL origami bird + 2D swirl
│   ├── reel.js?v=8                 207 lines — WebGL video dither
│   └── presets.js?v=12             297 lines — WebGL 3D film boxes
├── fonts/  pixelify.woff2 · atkinson-{400,400i,700}.woff2
│          vt323.woff2 · dotgothic16-ja.woff2
├── images/ favicons · icons/*.svg · man.jpg · man-dither.png
├── video/  reel-{wide,tall}.{webm,mp4} · reel-{wide,tall}.jpg
└── presets/ presets.json + <slug>.webp
```

The `?v=N` query strings are a hand-rolled cache-buster — bump the number when you
edit a file, get infinite caching otherwise.

**Why it matters:** every design decision here was available to the author because
there was no framework dictating one. That is the reason the site feels hand-made.
A React rebuild would have to *earn* each of these back.

---

## 1. Boot order

The order is load-bearing. Getting it wrong causes visible flash-of-wrong-state.

```
┌─ <head> ────────────────────────────────────────────────┐
│  1. <meta viewport>, <title>, theme-color               │
│  2. <link rel=icon> ×2                                   │
│  3. <link rel=preload> pixelify.woff2  as=font          │  ← only the two
│     <link rel=preload> atkinson-400.woff2 as=font       │    fonts used above
│  4. <link rel=stylesheet> fonts.css   then  style.css   │    the fold
│  5. <script> INLINE — motion preference + .js class      │  ← must be sync
│  6. <script defer umami.dev.futc.de/script.js>          │    analytics, DNT
└─────────────────────────────────────────────────────────┘
┌─ <body> ────────────────────────────────────────────────┐
│  7. skip link → header → main → footer                  │  full HTML parsed
│  8. <script src="js/main.js">     ┐                     │  classic, at the
│     <script src="js/hero.js">     │ NOT deferred —      │  end of body, so
│     <script src="js/reel.js">     │ blocking, in order │  no network round
│     <script src="js/presets.js">  ┘                     │  trip
└─────────────────────────────────────────────────────────┘
```

### The inline head script

```js
// Motion preference: saved choice wins, otherwise follow the OS setting.
(function () {
  var m = null;
  try { m = localStorage.getItem('futc-motion'); } catch (e) {}
  if (!m) m = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'off' : 'on';
  document.documentElement.dataset.motion = m;
  document.documentElement.classList.add('js');
})();
```

Three jobs, all of which must happen **synchronously before first paint**:

1. Resolve motion → `<html data-motion="on|off">`. Every module and several CSS
   rules read this attribute; resolving it in JS would let the cursor blink and the
   windows fade first.
2. Set `data-motion` from `localStorage` in a `try/catch` — Safari private mode
   throws on `localStorage`, and that must not take down the page.
3. Add `.js`. CSS gates *all* entrance animation behind it:
   `html.js[data-motion="on"] [data-zoom]:not(.is-open) { opacity: 0 }`.
   Without JS the class never lands, so nothing is ever hidden.

### Why the scripts are not `defer`

`defer` would execute them after parsing but before `DOMContentLoaded`, which is
also fine. They are plain `<script>` at the end of `<body>` so they run
immediately after the parser reaches them, in document order, with the DOM above
them already built. Order matters:

- `main.js` sets up `[data-zoom]` observers that add `.is-open` to windows.
- `hero.js`, `reel.js`, `presets.js` each read `document.documentElement.dataset.motion`.

---

## 2. `main.js` — interface behaviour

Zero dependencies, one IIFE, `'use strict'`. Each feature bails early if its
element is missing (`if (form) {…}`), so a trimmed-down page stays working.

### 2.1 The event bus

There is exactly one, and everything that isn't a user click goes through it:

```js
document.dispatchEvent(new CustomEvent('futc:motion', { detail: next }));
```

Listeners: typing restart, window forcing, services re-layout, hero loop, reel
sync, presets kick. This is why the toggle feels instant everywhere at once —
no module polls.

### 2.2 Motion toggle

```js
motionToggle.addEventListener('click', () => {
  const next = motionOn() ? 'off' : 'on';
  root.dataset.motion = next;
  try { localStorage.setItem('futc-motion', next); } catch (e) {}
  syncMotionToggle();                                            // aria-pressed
  document.dispatchEvent(new CustomEvent('futc:motion', { detail: next }));
});
```

### 2.3 Pull-down menu (≤ 840px)

A hand-rolled disclosure with all five things a real menu needs:

| Concern | Implementation |
|---|---|
| State | `.is-open` class + `aria-expanded` on the button |
| Initial focus | `setOpen(true)` → `menu.querySelector('a').focus()` |
| Escape | `keydown` → close **and** `pull.focus()` (focus must not fall to `<body>`) |
| Outside click | `document.click` → close unless the click was inside the menu or on the button |
| Focus leaving | `focusout` → close when `relatedTarget` is outside the menu |

Also closes on any `a` click (navigation wins).

### 2.4 Clock

```js
const fmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
const tick = () => { clock.textContent = fmt.format(new Date()).replace(',', ''); };
tick(); setInterval(tick, 15000);
```

`en-GB` → `Sat 11:07` with a comma stripped. `font-variant-numeric: tabular-nums`
in CSS stops the layout jittering as digits change. 15s is coarse enough not to
matter, fine enough to feel alive.

### 2.5 Scroll-spy

```js
const line = window.innerHeight * 0.35;
tracked.forEach((sec, i) => { if (sec && sec.getBoundingClientRect().top <= line) idx = i; });
```

- **0.35 viewport height**, not 0 — the switch happens above the visual centre so
  the highlight leads the eye to the content you're *about* to see.
- **rAF-throttled** with a `navTicking` latch: one layout read per frame, max,
  and `{ passive: true }` so the scroll listener can never block scrolling.

### 2.6 Typed role line

A 4-phrase typewriter: `Software Developer → Photographer → YouTuber → Creative Professional`.

```js
let delay = deleting ? 45 : 85 + Math.random() * 40;   // typing is humanised
if (!deleting && charIdx === phrase.length) { deleting = true; delay = 1900; }  // hold
else if (deleting && charIdx === 0)        { deleting = false; delay = 350; }
```

- **Randomised typing delay (85–125ms)** and a fixed 45ms delete — the asymmetry
  is what stops it reading as a machine.
- First run waits 2200ms, so the hero logo has unfolded before the text starts.
- `min-height: 1em` on the line reserves the height; otherwise the dialog jumps
  when "Photographer" wraps to two lines.
- Motion off → no animation, the full first phrase is written immediately.
- Restarted from the `futc:motion` listener.

### 2.7 System 1 zoom-rectangle windows

This is the site's signature transition. When a `[data-zoom]` element scrolls in,
it draws **9 nested rectangles growing from its own centre**, then pops the real
element in behind them.

```js
const r = el.getBoundingClientRect();
const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
const FRAMES = 9, STEP = 26, TRAIL = 3;
const rects = [];

for (let i = 0; i <= FRAMES; i++) {
  setTimeout(() => {
    const t = i / FRAMES;
    const e = t * t * (3 - 2 * t);                        // smoothstep
    const w = r.width * (0.06 + 0.94 * e);
    const h = r.height * (0.06 + 0.94 * e);
    const d = document.createElement('div');
    d.className = 'zoom-rect';
    d.style.cssText = `left:${cx-w/2}px;top:${cy-h/2}px;width:${w}px;height:${h}px`;
    document.body.appendChild(d);
    rects.push(d);
    if (rects.length > TRAIL) rects.shift().remove();      // keep 3 alive
    if (i === FRAMES) {
      el.classList.add('is-open');
      delete el.dataset.opening;                            // re-entrancy guard
      setTimeout(() => rects.splice(0).forEach(n => n.remove()), STEP);
    }
  }, i * STEP);
}
```

- `FRAMES × STEP` = 9 × 26ms ≈ **234ms** — under a quarter second, so a full page
  scroll draws eight of them without feeling slow.
- `TRAIL = 3` gives motion-blur-ish persistence: three outlined rectangles are
  alive at any moment. This is what makes it read as *zooming* rather than
  *fading*.
- `el.dataset.opening` and `classList.contains('is-open')` make it idempotent —
  `IntersectionObserver` can fire twice and nothing breaks.
- `.zoom-rect` is `position: fixed; z-index: 60; pointer-events: none; border: 2px solid` —
  drawn over everything, catching no clicks.

**Observation gate:**

```js
new IntersectionObserver(cb, { threshold: 0, rootMargin: '0px 0px -12% 0px' })
```

The `-12%` bottom inset opens the window once its **top edge is 12% up** the
viewport, which is why the tall About window opens even though it can't fit.

**Three escape hatches, all necessary:**

| Situation | Handling |
|---|---|
| Motion off | `openWindow` adds `.is-open` and returns — no rectangles |
| No `IntersectionObserver` | `zoomTargets.forEach(el => el.classList.add('is-open'))` |
| Keyboard user tabs in first | `el.addEventListener('focusin', () => el.classList.add('is-open'))` |

Without the third, tabbing into a window that hasn't opened yet would focus an
invisible element.

**Stagger:** `data-zoom-delay="1700"` on the hero dialog defers it until after the
origami fold — the only element that opts out of the on-scroll rhythm.

### 2.8 Portrait dither ↔ colour

Class toggle + `aria-pressed` + label swap (`Show in color` ⇄ `Show dithered`).
CSS handles both hover (`@media (hover: hover)`) and the explicit button, so the
button is a touch/keyboard affordance and hover is the bonus.

### 2.9 Services cascade — "a messy stack that tidies up"

The four `.service` windows start stacked like dropped cards and align themselves
into a 2×2 grid as you scroll.

```js
function measure() {
  items.forEach(it => { it.style.transform = ''; });              // reset first!
  const first = items[0];
  offsets = items.map((it, i) => ({
    x: first.offsetLeft - it.offsetLeft + i * 34,                 // 34px cascade step
    y: first.offsetTop  - it.offsetTop  + i * 30,                  // 30px cascade step
  }));
}

function layout() {
  const active = motionOn() && wide.matches;                       // min-width: 761px
  services.classList.toggle('is-cascading', active);
  if (!active) { items.forEach(it => { it.style.transform = ''; }); return; }

  const p = Math.min(1, Math.max(0, (vh * 0.9 - r.top) / (vh * 0.55)));
  const e = 1 - (1 - p) ** 3;                                      // easeOutCubic
  items.forEach((it, i) => {
    const o = offsets[i];
    it.style.transform = e >= 1 ? '' : `translate(${o.x*(1-e)}px, ${o.y*(1-e)}px)`;
  });
}
```

Details worth stealing:

- **`measure()` clears transforms before reading `offsetLeft`** — otherwise you
  measure the *displaced* positions and the offsets compound into nonsense on
  every resize.
- **Offsets are relative to `items[0]`, not absolute.** `first.offsetLeft - it.offsetLeft`
  gives the displacement needed to stack item *i* exactly on item 0, plus a
  deliberate 34/30px cascade step. This works at any breakpoint without hardcoding.
- **`e >= 1 ? '' : …`** — once tidied, the inline style is *removed*, not set to
  identity. The grid reclaims the elements completely; no lingering compositing layer.
- **`will-change: transform` only on `.is-cascading`**, so the hint exists exactly
  while transforms are being animated.
- Re-measures on `resize`, re-lays-out on scroll (rAF-latched, passive) and on
  `futc:motion`.

### 2.10 Contact form

Client-side, posts JSON to a webhook.

```
honeypot field `website`   → if filled, reset and return silently
link spam regex            → reject name and message separately
  /(https?:\/\/|www\.|http:\/\/|\.com|\.net|\.org|\.io|\.dev|\.co|\.uk|\.de)/i
```

The regex list is TLD-specific (`.de` is there because the author is German), and
the message rejection message is deliberately awkward:

> *"Please do not include links in your message. If you need to share a URL, please
> mention it in your message and I will follow up via email."*

That's a copy bug preserved verbatim in production — a useful reminder that real
sites carry their archaeology.

```js
const res = await fetch(webhookUrl, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, message: msg, timestamp: new Date().toISOString() }),
});
if (!res.ok) throw new Error('HTTP ' + res.status);
```

Status is written into `#formStatus` (`role="status" aria-live="polite"`) and
styled with `.is-error` → red, `▶ ` prefix via CSS. Button label goes
`Sending…` / disabled, restored in `finally`.

**Known weakness worth knowing if you copy this:** the link regex is trivially
bypassable and there is no server-side validation visible from the client. The
honeypot is the real gate. Treat both as convenience, not security.

---

## 3. `hero.js` — origami bird + glyph swirl

The most elaborate piece on the site. Two canvases, two completely different
technologies, one aesthetic.

### 3.1 The concept

> A folded packet of red paper opens up into the FUTC bird logo.

The logo is a flat drawing. `hero.js` gives **9 stroke-centreline points a depth**,
folds them into a 3D paper bird, and renders it with raw WebGL through a 1-bit
ordered-dither pass. Viewed straight-on through an orthographic camera, the folded
bird *is* the logo. It then writes the `FUTC` wordmark one pen stroke at a time.

### 3.2 Hand-rolled linear algebra

No `gl-matrix`. The file contains ~80 lines of vec3/3×3 helpers:

```js
const mulM = (A, B) => { … };                              // row-major 3×3
const mulV = (M, v) => [ … ];                              // M · v
const axisAngle = (u, th) => { … };                       // Rodrigues
const rotX = th => axisAngle([1,0,0], th);  const rotY = …;  const rotZ = …;
const hingeT = (p, u, th) => { const R = axisAngle(u, th); return { R, t: sub(p, mulV(R, p)) }; };
```

`hingeT` is the important one: it builds a rotation **about an arbitrary axis
through an arbitrary point** — i.e. a paper crease. Everything else is
composition (`{ R, t }` rigid transforms, `compose`/`apply`).

Orientation blending uses **quaternions** with slerp, so the global sheet→display
turn is arc-length correct and never gimbal-flips:

```js
const q = qSlerp(qStart, qShow, g);
const R = qToM(q);
R = mulM(rotY(swayY + tiltX*0.14 + scroll*2.2), R);       // tilt *after* orientation
R = mulM(rotX(swayX + tiltY*0.09 - scroll*0.6), R);
```

### 3.3 Rig

```
LOGO = { A, L, N, Q1, Bt, Lw, R, S }     9 points in SVG units, y-down
```

Each carries a depth (`A: -40`, `Bt: +330`, …), scaled by `DEPTH = 0.3`. The
source comment is a design constraint:

> *"DEPTH keeps the finished bird shallow — a lightly creased paper cutout — so
> tilting it barely changes the logo's proportions."*

`NODES` then declares a **parent-relative fold hierarchy**:

```js
const NODES = [ [name, keys, parent, hingeEdge, [winStart, winEnd]], … ];
```

Each node has a *hinge edge* (two keys) and a *window* `[t0, t1]` during the
unfold. In `poseBird(f)`:

```js
const p = clamp01((f - n.win[0]) / (n.win[1] - n.win[0]));
```

…drives each facet's own rotation. Crucially, a child aims its hinge normal at the
**parent's** plane normal, so folds propagate down the tree instead of each flap
rotating in isolation:

```js
const vc     = norm(perp(thirdVertex(n.tri, a, b)));      // child normal
const target = norm(perp(thirdVertex(par.tri, a, b)));    // parent normal
```

`SHOULDER = edgeKey('S','R')` carries the comment *"drawn in the logo even though
it's an inner edge"* — edges that aren't real polygon borders still get ink.

### 3.4 Rendering — 2 passes into 1 texture

The scene shader writes **raw data into channels**, then a second fullscreen pass
turns it into pixels. There is no 8-bit colour anywhere in the scene pass.

```glsl
// FS_SCENE — writes data, not colour
if (vKind > 1.5) { gl_FragColor = vec4(0.0, 0.0, 0.5, 1.0); return; }  // paper plate
if (vKind > 0.5) { gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0); return; }  // stroke
vec3 n = normalize(vNormal);
if (!gl_FrontFacing) n = -n;
float lum = 0.18 + 0.82 * max(dot(n, uLight), 0.0);
gl_FragColor = vec4(lum, gl_FrontFacing ? 1.0 : 0.0, 0.0, 1.0);
```

```
.r = luminance (Lambert, wrapped)
.g = front/back side flag
.b = semantic tag: 1.0 = ink stroke, 0.5 = paper plate, 0.0 = foldable face
.a = coverage
```

Then the dither pass:

```glsl
vec4 s = texture2D(uTex, gl_FragCoord.xy / uRes);
if (s.a < 0.5) discard;
if (s.b > 0.75) { gl_FragColor = vec4(uRed, 1.0); return; }   // the logo's strokes
if (s.b > 0.25) { gl_FragColor = vec4(1.0); return; }         // blank paper
float th = bayer8(gl_FragCoord.xy) + 0.5/64.0;
// both sides of the sheet are red; the back reads a touch lighter
float ink = s.g > 0.5 ? mix(0.04, 0.7, 1.0 - s.r)
                      : mix(0.03, 0.6, 1.0 - s.r);
gl_FragColor = th < ink ? vec4(uRed, 1.0) : vec4(1.0);
```

Two lines of shading that carry the illusion:

- `+ 0.5/64.0` — a half-LSB bias so a threshold of exactly 0.5 doesn't alias.
- The front/back asymmetry (`0.7/0.6`, `0.04/0.03`) means **folding the paper over
  visibly lightens it**, so the form is legible while still strictly two-tone.

Rendering setup:

```js
gl.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, depth: false });
```

`antialias: false` is the whole point — antialiasing would add grey pixels the
dither pass would then have to threshold, producing mush. `depth: false` because
the bird is a **paper cutout**: facets are painter-ordered in JS, not depth-sorted.

Orthographic camera: `HALF_H = 1.0, NEAR = 0.1, FAR = 20, camZ = -5`.

Strokes are expanded to quads in JS with a **pixel-exact** half-width:

```js
const px = Math.max(2, Math.round(H * 0.021));
const hw = Math.max(2, Math.round(px * w)) / 2 * (2 * HALF_H / H);
```

Everything lands on integer pixels, so the 1-bit output stays sharp.

### 3.5 Timing

```js
const FOLD_START = 0.35, FOLD_DUR = 3.0;
// after it settles, idle takes over
const idle = t - FOLD_START - FOLD_DUR;
const settled = smooth(idle / 1.5);
const written = (idle - 0.2) / 0.08;      // one wordmark stroke per 80ms
```

- t = 0.35s → the lone triangle appears.
- 0.35–3.35s → the unfold, eased with `smoothstep`.
- +1.5s → "settled", then the idle sway fades in.
- idle → `FUTC` writes itself, one stroke per 80ms.

Idle motion is deliberately small — the source comment:

> *"Idle moves the bird only as one rigid piece: a few degrees of tilt and a slow
> float, while a light circles overhead and the dithered shading drifts across the creases."*

Because the shading is dithered, the circling light makes the **dither pattern
itself** crawl over the folds. A gradient-based render would just look like the
light moved; this looks like the ink is re-screening.

### 3.6 Glyph swirl (2D canvas, `#swirl`)

A background field of 1-bit glyphs and icons orbiting the bird.

```js
const CHARS = '*+#%&@$=/\\|<>{}[]01;:~^?!FUTC'.split('');
const ICONS = ['prism','film','camera','mail','monitor','trash','phone','code'];
const PX = 2;   // one swirl pixel = 2 CSS px
```

**Everything is thresholded, including the sprites:**

```js
function threshold(cnv) {
  const img = ctx.getImageData(0, 0, cnv.width, cnv.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) d[i + 3] = d[i + 3] > 110 ? 255 : 0;
  ctx.putImageData(img, 0, 0);
  return cnv;
}
```

Glyph sprites are `16px VT323` (so the swirl is monospace, matching the design
system); icons are drawn to a 16×16 canvas with `imageSmoothingEnabled = false`
and thresholded identically. Three sprite pools:

| Pool | Share | Colour |
|---|---|---|
| `chars` | 84% | black |
| `reds` | 6% (`*`, `+`, `#`) | `#E00000` |
| `icons` | 10% | black |

Distribution — density falls off with radius, and the count scales with area
between 50 and 150:

```js
const count = Math.round(Math.min(150, Math.max(50, area / 1100)));
const r = R * (0.16 + 0.84 * Math.pow(rnd(), 0.8));
```

`Math.pow(rnd(), 0.8)` biases outward (exponent < 1), so the field is denser at
the rim and clear at the centre — where the bird lives. **Every particle shares
`Math.sqrt(R / r)` angular velocity**, so inner particles sweep faster and the
field reads as differential rotation.

Deterministic PRNG, so the field is stable across resizes:

```js
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
```

(MINSTD LCG — no `Math.random()`, so a resize doesn't reshuffle the composition.)

Per-frame draw:

```js
const k      = easeOutCubic((intro - p.delay) / 1.6);          // intro: each sprite flies in
const spread = 1 + (1 - k) * 1.8 + scroll * 1.6;                // scroll pushes it out
const a      = p.a + p.w * t + (1 - k) * 2.2 * Math.sign(p.w);
const r      = p.r * spread * (1 + 0.04 * Math.sin(t * 0.7 + p.wobble));
const y      = cy + Math.sin(a) * r * 0.62;                     // squashed ellipse
if (fade < 1 && (p.wobble / 6) > fade) return;                 // dissolve 1-bit style
```

The last line is the good one: as the swirl fades out on scroll, sprites are
**removed one at a time in a random order** instead of alpha-fading, so the field
disintegrates into a sparse scatter of glyphs. It's the 2D equivalent of the
Bayer reveal.

### 3.7 Budget discipline

```js
const BIRD_PX = s.width < 520 ? 2 : 3;   // one bird pixel = 3 CSS px (2 on small stages)
```

The bird renders to a canvas ~⅓ CSS size, then CSS scales it up with
`image-rendering: pixelated`. Swirl uses `PX = 2`. The result is a hard pixel grid
for ~1/9 the fragment work of a full-res canvas.

The loop only exists when it must:

```js
function update() {
  const shouldRun = motionOn() && visible && !document.hidden;
  if (shouldRun && !running)  { running = true;  raf = requestAnimationFrame(frameLoop); }
  else if (!shouldRun && running) { running = false; cancelAnimationFrame(raf); raf = 0; }
  if (!motionOn()) renderStill();                 // one static frame instead
}
```

Three gates — **motion preference, `IntersectionObserver` on the hero,
`visibilitychange`** — plus:

```js
document.addEventListener('futc:motion', () => {
  if (motionOn()) start = performance.now() - (FOLD_START + FOLD_DUR + 1) * 1000;  // skip intro
  update();
});
```

Re-enabling motion rewinds the clock past the intro so the fold doesn't replay.

Pointer tilt is fine-pointer only, with exponential smoothing:

```js
if (matchMedia('(pointer: fine)').matches) hero.addEventListener('pointermove', …);
tiltX += (tgtX - tiltX) * 0.06;
```

**`?t=1.2` freezes the animation clock** for screenshotting:

```js
const DEBUG_T = params.has('t') ? Number(params.get('t')) : null;
const t = DEBUG_T ?? (now - start) / 1000;
```

### 3.8 Degradation

```js
try { renderer = makeRenderer(birdCanvas); } catch (e) { console.warn('bird: WebGL unavailable', e); }
if (renderer) stage.classList.add('has-webgl');
birdCanvas.addEventListener('webglcontextlost', e => {
  e.preventDefault(); renderer = null; stage.classList.remove('has-webgl');
});
```

CSS pairs on it:

```css
.hero-stage.has-webgl .hero-bird-fallback { display: none; }
.hero-stage:not(.has-webgl) .hero-bird   { display: none; }
```

Without WebGL you get `<img class="hero-bird-fallback" src="favicon.svg">` — the
logo, flat, at 64% — and `.hero-swirl` still runs (it's a 2D canvas, independent).
`webglcontextlost` is handled explicitly: `preventDefault()` and drop back, rather
than dying mid-session when the GPU is reset.

---

## 4. `reel.js` — the highlight band

A `<video>` in a **full-bleed band** (breaks out of the 1120px measure entirely),
put through a WebGL dither that resolves to colour as the band crosses the screen.

### 4.1 Source selection

```js
const ext = video.canPlayType('video/webm; codecs="av01.0.05M.08")') ? '.webm' : '.mp4';
const tallMq = matchMedia('(max-width: 700px)');   // keep in sync with the <picture> source
function loadSource() {
  const kind = tallMq.matches ? 'tall' : 'wide';
  if (kind === loadedKind) return;                 // idempotent
  loadedKind = kind;
  video.src = video.dataset[kind] + ext;
  video.load();
}
```

Two **separate cuts** (4:5 portrait and 1920:600 wide) because a phone-crop of a
16:3 video is unreadable. AV1 in WebM where supported, H.264/MP4 as fallback.
`preload="none"` in the markup; the file is fetched only near the viewport:

```js
new IntersectionObserver(([e]) => { near = e.isIntersecting; sync(); }, { rootMargin: '400px 0px' }).observe(section);
```

A second observer with **no rootMargin** drives the rAF loop, so the shader only
runs while the band is genuinely on screen.

### 4.2 The shader

```glsl
vec2 cell = floor(gl_FragCoord.xy / uCell);
// dissolve in chunky 2x2-cell blocks, in ordered-dither order
float reveal = bayer8(floor(cell / 2.0)) + 0.5 / 64.0;
if (reveal < uMix) { gl_FragColor = vec4(texture2D(uTex, toUV(gl_FragCoord.xy)).rgb, 1.0); return; }
vec3 c = texture2D(uTex, toUV((cell + 0.5) * uCell)).rgb;
float l = dot(c, vec3(0.299, 0.587, 0.114));
l = clamp((l - 0.5) * 1.3 + 0.52, 0.0, 1.0);      // contrast push
float ink = step(bayer8(cell) + 0.5 / 64.0, l);
gl_FragColor = vec4(vec3(ink), 1.0);
```

- `uCell = 3 * dpr` → 3px dither cells. Coarse enough to read as halftone.
- `toUV()` reimplements `object-fit: cover` in the shader (`uScale`) because the
  canvas can't `object-fit` a texture.
- The dithered branch samples at the **cell centre** (`(cell + 0.5) * uCell`) —
  sampling per-pixel would let the pattern shimmer as the video moved.
- `1.3` contrast around a `0.52` pivot, because video is already low-contrast and
  a naive threshold crushes it to mud.

### 4.3 Scroll-driven dissolve

```js
function mixFromScroll() {
  const p = (vh - r.top) / (vh + r.height);      // 0 entering, 1 leaving
  return smooth((p - 0.2) / 0.18) * (1 - smooth((p - 0.62) / 0.18));
}
```

0 when the top hits the bottom of the screen, 1 when the bottom leaves the top.
Two `smooth` ramps multiplied give a **plateau**: dithered → colour (fully in,
roughly centred) → dithered again as it leaves. The visitor never clicks anything;
the scroll position is the state.

### 4.4 `Dither` override

```js
ditherBtn.addEventListener('click', () => {
  forceDither = !forceDither;
  ditherBtn.setAttribute('aria-pressed', String(forceDither));
  if (!raf && onScreen) raf = requestAnimationFrame(loop);
});
gl.uniform1f(loc.uMix, forceDither ? 0 : mixFromScroll());
```

Because the scroll loop keeps running even when fully dithered (the video still
plays underneath), the button has to **poke the loop** — it can't assume a frame
is imminent.

**Uploads are lazy.** The video is uploaded once it has a frame, the poster
before that:

```js
const src = video.readyState >= 2 ? video : (poster.complete && poster.naturalWidth ? poster : null);
if ((dirty || !video.paused) && upload()) dirty = false;
```

No `<video>` → no WebGL pass at all, and the plain `<img class="reel-poster">`
underneath carries the section. **A poster first, video only if it can play.**

---

## 5. `presets.js` — 3D film boxes

Six Lightroom packs as photoreal 3D boxes, one canvas spanning the whole grid.

### 5.1 One canvas, many viewports

The canvas is `position: absolute; inset: 0` over `.presets-body`, behind the
text. Each box is drawn **into its card's rectangle** using `gl.viewport` +
`gl.scissor`:

```js
const x = Math.round((r.left - box.left) * dpr);
const y = Math.round((box.bottom - r.bottom) * dpr);   // GL origin is bottom-left
gl.viewport(x, y, w, h);
gl.scissor(x, y, w, h);
```

Layout stays pure CSS grid. WebGL is a **decorative overlay** that reads the
cards' `getBoundingClientRect()` — it cannot break the layout, and the text is
always selectable, always accessible, always present without WebGL. Scroll
therefore costs one `getBoundingClientRect()` per visible card.

### 5.2 Lighting

```glsl
vec3 keyL  = normalize(vec3(-0.55, 0.65, 0.55));   // warm key, upper left front
vec3 fillL = normalize(vec3(0.8, 0.05, 0.6));      // cool fill, right
vec3 backL = normalize(vec3(0.25, 0.7, -0.65));    // back light, above and behind
vec3 light = vec3(0.16)                                             // ambient
  + vec3(1.05, 0.98, 0.88) * 1.05 * max(dot(n, keyL), 0.0)
  + vec3(0.80, 0.88, 1.00) * 0.32 * max(dot(n, fillL), 0.0)
  + vec3(1.00) * 0.30 * max(dot(n, backL), 0.0);

float spec = pow(max(dot(n, normalize(keyL + v)), 0.0), 160.0) * 0.25;
float rim  = pow(1.0 - max(dot(n, v), 0.0), 4.0) * 0.25 * max(dot(n, backL) + 0.4, 0.0);
vec3 c = albedo * light + vec3(spec + rim);
c = c / (1.0 + 0.12 * c);      // soft shoulder so the key light doesn't clip
```

Three decisions:

- **Lights are fixed relative to the camera, not the model.** The source comment:
  *"three-point studio lighting, fixed relative to the camera so the highlights
  glide across the faces as a box turns."* Product-shot lighting, not a lamp in
  the room.
- **`spec` exponent 160** with the comment: *"the faces are flat, so a broad
  highlight would wash a whole face out; a tight one is a hotspot that glides
  across as the box turns."*
- **Reinhard shoulder `c/(1+0.12c)`** — without it the key light clips to white
  before the dither ever sees it.

### 5.3 The dither lift

```glsl
l = clamp((sqrt(l) - 0.5) * 1.7 + 0.5, 0.0, 0.0);  // ← see note
```

Precisely: `l = clamp((sqrt(l) - 0.5) * 1.7 + 0.5, 0.0, 1.0);` with the comment
**"lift the dark boxes' midtones so labels survive."** Without `sqrt`, the packs
are dark cardboard and their type dithers into illegible noise. **In any
dither-threshold pipeline, gamma-correct before thresholding.**

The reveal reuses the identical Bayer-in-2×2-blocks scheme:

```glsl
if (bayer8(floor(cell / 2.0)) + 0.5 / 64.0 < uMix) { gl_FragColor = vec4(c, 1.0); return; }
```

### 5.4 Pose and easing

```js
const BASE_YAW = Math.PI - 0.45;   // the printed front faces -z in the exported meshes
const idle     = 0.22 * Math.sin(t * 0.5 + c.phase);
const tYaw     = BASE_YAW + (c.hover ? c.px * 0.6 : idle);
const tPitch   = 0.28   + (c.hover ? c.py * 0.3 : 0.05 * Math.sin(t * 0.37 + c.phase));
const tZoom    = c.hover ? 1.08 : 1;
const k        = Math.min(1, dt * 6);
c.yaw += (tYaw - c.yaw) * k;
```

- Every card gets `phase = i * 1.3` so six boxes never breathe in unison.
- Frame-rate-independent smoothing via `dt`-scaled lerp.
- `dist = mesh.r / sin(FOV/2) * 0.92` — a bounding-sphere fit so any mesh frames
  correctly without hand-tuned distances.
- Rounded when settled (`Math.abs(c.mix - want) < 0.004`) so the loop can stop.

### 5.5 Hover vs. touch

```js
let want = c.hover ? 1 : 0;
if (!canHover) {
  const mid = (r.top + r.height / 2) / vh;
  want = Math.abs(mid - 0.5) < 0.2 ? 1 : 0;      // centred on screen
}
```

Touch has no hover, so "am I being looked at" becomes "am I in the middle of the
screen" — the same reveal semantics, driven by scroll instead of the pointer.

### 5.6 Loading

```js
new IntersectionObserver(([e]) => { if (e.isIntersecting) load(); }, { rootMargin: '600px 0px' }).observe(body);

async function load() {
  const dir = body.dataset.src.replace(/[^/]+$/, '');
  const data = await (await fetch(body.dataset.src)).json();
  Object.entries(data.models).forEach(([name, m]) => { meshes[name] = makeMesh(m); });
  await Promise.all(cards.map(async c => {
    c.tex  = makeTexture(await loadImage(dir + c.slug + '.webp'));
    c.mesh = meshes[pack.model];
  }));
  body.classList.add('has-webgl');
}
```

**One shared box mesh plus one texture per pack.** The header comment:

> *"One shared box mesh plus one texture per pack (the older packs' artwork is
> re-baked onto it with `tools/bake_presets.py`)"*

So geometry is uploaded once; the JSON only carries vertex/index arrays and pack
metadata. `loading` guards against double-fetch, and a `catch` around the whole
thing means a failed load just leaves the cards text-only.

### 5.7 Idle cost

```js
const moving = motionOn();
let busy = moving;                       // idle rotation keeps us drawing
…
return busy || !canHover;                // touch: colour follows scroll
```

When motion is off, `busy` stays false, the loop stops after the settle, and the
boxes sit at their rest pose. One `kick()` re-renders.

---

## 6. Cross-cutting patterns

### 6.1 WebGL context

```js
antialias: false        // AA greys would poison the threshold
depth: false            // paper cutout & flat cards: painter's order, not depth
alpha: true, premultipliedAlpha: true   // hero must composite over the page
alpha: false, preserveDrawingBuffer: false   // reel: opaque, don't hoard VRAM
```

`dpr = Math.min(window.devicePixelRatio || 1, 1.5)` — capped. Beyond 1.5 the extra
fragments buy nothing on a dithered image.

Every context registers `webglcontextlost` and degrades to the CSS fallback.
`canvas.getContext('webgl')` returning `null` is treated as normal, not exceptional.

### 6.2 rAF discipline

```js
let ticking = false;
function schedule() { if (!ticking) { ticking = true; requestAnimationFrame(job); } }
window.addEventListener('scroll', schedule, { passive: true });
```

One latch pattern across scroll-spy, services cascade and the reel button. Plus
`dt = Math.min(0.05, (now - last) / 1000)` in the preset loop to survive tab-switch
stalls without a jump.

### 6.3 Observers

| Observer | Target | Options | Purpose |
|---|---|---|---|
| Zoom | `[data-zoom]` | `threshold: 0, rootMargin: '0px 0px -12% 0px'` | open the window |
| Hero | `.hero` | default | pause the loop when off screen |
| Hero | `.hero` | `ResizeObserver` | re-fit the canvases |
| Reel | `#reel` | `rootMargin: '400px 0px'` | prefetch the video |
| Reel | `#reelStage` | default | run the rAF loop |
| Presets | `#presets` | `rootMargin: '600px 0px'` | load meshes + textures |
| Presets | `#presets` | default | kick the loop |
| Presets | `#presets` | `ResizeObserver` | resize the canvas |

Every one **unobserves or short-circuits after firing**. No persistent observers
polling work that has already been done.

### 6.4 ARIA as the source of truth

State lives in attributes CSS can read, so styling never needs a second source:

```css
.btn[aria-pressed], .reel-toggle[aria-pressed="true"] { background: var(--ink); color: var(--paper); }
.motion-toggle[aria-pressed="true"] .motion-toggle-box { background: /* X drawn from 2 gradients */; }
.menubar-menu a[aria-current="true"] { text-decoration: underline; text-decoration-color: var(--red); }
```

### 6.5 BEM-ish flat naming

One flat namespace — `.window`, `.window-title`, `.window-body`, `.finder-grid`,
`.finder-info`, `.finder-status` — no nesting, no prefixes beyond the component
word. A 999-line stylesheet with flat names needs no tooling to stay navigable.

---

## 7. Build it yourself — file order

1. **Tokens + type + reset** — the `:root` block, four `@font-face`,
   `box-sizing: border-box`, focus/selection.
2. **Chrome** — `.window` (+ title, close, body), `.btn` (+ `--default`,
   `--small`), `.section-head`, `.info`.
3. **Motion switch** — inline `<head>` script, `.js` gating, `prefers-reduced-motion`.
4. **Menu bar** — sticky, clock, active-section underline, pull-down ≤840px.
5. **`main.js`** — motion toggle, menu, clock, scroll-spy, zoom-rect windows.
6. **Static sections** — hero copy, about, services, presets, brands, projects,
   contact, desktop footer. All CSS; no JS needed to *read* the page.
7. **`hero.js`** — glyph swirl first (2D, easy win), then the WebGL bird.
8. **`reel.js`** — source selection + `IntersectionObserver` before the shader.
9. **`presets.js`** — viewport/scissor before anything else.

---

## 8. What to take, what to skip

**Take:**

- Stepped transitions as a *design system*, not an accessibility compromise.
- The inline `<head>` motion script — solve preference before first paint.
- `dt`-based easing and rAF latches.
- Cap DPR at 1.5 for full-screen shader work.
- Draw decorative 3D into an overlay canvas; keep the DOM authoritative for
  layout, text and accessibility.
- Two hard shadows per focus state: a paper gap then the ring.
- Pre-bake 1-bit assets offline (`man-dither.png`) when a static image suffices.

**Skip / modernise:**

- The `?v=N` cache-buster — use hashed filenames.
- Hand-rolled linear algebra — but only if you bundle. Otherwise it's *smaller*
  than gl-matrix and beats a framework.
- The client-side link-spam regex. Honeypot and server validation only.
- `filter: invert(1) hue-rotate(180deg)` for icon hover — it's clever, and it
  will surprise the next person who adds an orange icon.
- Anything that duplicates state in JS and CSS. This codebase doesn't; keep it
  that way.

---

## Companion documents

- [`DESIGN_LANGUAGE.md`](DESIGN_LANGUAGE.md) — tokens, type scale, components,
  motion rules, anti-patterns.
- [`COLORSTYLE.md`](COLORSTYLE.md) — the ink set, contrast, the rationing rule,
  dither palettes.