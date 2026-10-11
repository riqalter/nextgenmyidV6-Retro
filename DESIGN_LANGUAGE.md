# FUTC — Design Language

> Reverse-engineered from [futc.de](https://futc.de/) (Felix Umland).
> Source of truth: `css/style.css?v=13`, `css/fonts.css?v=8`, `index.html`.
> Captured 2026-10-10. Every value below is literal — copy it verbatim.

![Hero](.openchamber/screenshots/futc-hero-2026-10-10T04-08-07-555.jpg)

---

## 0. The one-sentence thesis

> **A 1984 Macintosh that learned to be a portfolio.**

Everything on the page is either (a) a piece of that machine's chrome — menu bar,
windows, dialogs, floppy icons, Finder icon view, desktop pattern — or (b) *content
pushed through a 1-bit ordered-dither pipeline* so the photographs, video and 3D
renders collapse into black-and-white until you interact with them.

The stated reference is in the stylesheet's own first line:

```css
/* FUTC — System 1
   1-bit black & white, one red. Inspired by the 1984 Macintosh. */
```

Three consequences follow, and they are the whole design system:

| Law | Consequence |
|---|---|
| **Only two inks plus one accent** | No greys from blending, no colour photography in the chrome. Depth is *drawn* (offset shadows, hatch fills), never rendered. |
| **Stepped, never smooth** | Transitions use `steps()`. The blinking cursor blinks at `steps(1)`. The photo crossfade uses `steps(5)`. The floppy shutter uses `steps(3)`. |
| **One red, rationed hard** | Red marks exactly three kinds of thing: *you are here*, *this is a control/state*, and *this is the brand*. Never decoration. |

---

## 1. Tokens (copy this block verbatim)

```css
:root {
  /* ink */
  --ink:   #000;
  --paper: #fff;
  --red:   #E00000;   /* 5.04:1 on white — safe for text */
  --muted: #4a4a4a;   /* 8.9:1 on white */

  /* families */
  --font-ui:   'Pixelify Sans', 'VT323', ui-monospace, monospace;
  --font-body: 'Atkinson Hyperlegible', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-mono: 'VT323', ui-monospace, 'SFMono-Regular', Menlo, monospace;
  --font-ja:   'DotGothic16', 'Hiragino Sans', 'Yu Gothic', 'Noto Sans JP', sans-serif;

  /* structure */
  --line:      2px;
  --shadow:    4px 4px 0 var(--ink);
  --gutter:    16px;
  --menubar-h: 2.5rem;

  /* 1-bit fill patterns, inline SVG, crispEdges */
  --pat-50: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='2' shape-rendering='crispEdges'%3E%3Crect width='1' height='1'/%3E%3Crect x='1' y='1' width='1' height='1'/%3E%3C/svg%3E");
  --pat-25: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect width='1' height='1'/%3E%3Crect x='2' y='2' width='1' height='1'/%3E%3C/svg%3E");

  color-scheme: light;
}
```

`--pat-50` is a **50% checkerboard**, `--pat-25` a **25% dot screen**. Both are the
only "greys" the design permits. They are drawn at a 4×4 device-pixel tile so they
stay crisp at any zoom.

---

## 2. Typography

Four families, four jobs. Do not blur them.

| Family | Job | Loaded as |
|---|---|---|
| **Pixelify Sans** | All interface chrome + headings. Variable 400–700. | `fonts/pixelify.woff2` (preloaded) |
| **Atkinson Hyperlegible** | Body copy only. 400 + 700 + 400 italic. | `fonts/atkinson-*.woff2` |
| **VT323** | Terminal/meta text: clocks, section numbers, sub-titles, Finder info bars, `DISK 01`, `↗`, status lines. | `fonts/vt323.woff2` |
| **DotGothic16** | The two Japanese glyphs only (ようこそ 折り紙). Subsetted with `pyftsubset`. | `fonts/dotgothic16-ja.woff2` |

**Why Atkinson Hyperlegible for body copy** is stated in `fonts.css`: it is
*"designed for low-vision readers"*. Pixel text is never used for a paragraph —
pixel fonts have no lowercase x-height and are illegible at length. The pairing is
deliberate: **pixel for the machine, humanist sans for the human.**

### Scale

```css
body                    { font: 400 1.0625rem/1.6 var(--font-body); }   /* 17px */

.hero-title             { font-ui 700  clamp(2.6rem,  9vw, 4.5rem)/.95  ; letter-spacing: -.01em }
.section-title          { font-ui 700  clamp(2.75rem,10vw, 6rem  )/.9  }
.section-kicker         { font-mono      1.4rem /1                     ; color: var(--red) }
.section-sub            { font-mono      1.5rem /1.1                   }  /* ::before adds "— " */

.hero-role              { font-mono      1.6rem /1                     }
.service h3             { font-ui 700   1.6rem /1.05                   }
.contact-info h3        { font-ui 700   1.75rem/1.1                    }
.finder-status-label    { font-mono      1.25rem                       }
.file-name              { font-ui 500   1.15rem /1.25                  }
.preset-name            { font-ui 500   1.1rem  /1.25                  }
.finder-info            { font-mono      1.15rem                       }
.disk-name              { font-ui 700   clamp(1rem,2.2vw,1.2rem)/1.05  }
.window-title           { font-ui        .95rem /1                     }
.desktop-bar            { 400           .95rem                         }
```

### The two rules that make it feel like 1984

1. **Tight leading on display type.** `.9` / `.95` on multi-hundred-pixel headings —
   the lines almost touch. This is period-correct (Chicago-era bitmap faces had
   near-zero sidebearing) and it makes a 6rem title read as one object.
2. **The metadata voice is always monospace.** Every "this is a machine speaking"
   string — section numbers, `6 packs`, `1.44 MB each`, `Sat 11:07`, `highlights.mov` —
   is `VT323`. Switching to `font-mono` is how you mark "not human-readable content".

---

## 3. Layout

```css
.section { max-width: 1120px; margin-inline: auto;
           padding: clamp(4rem, 10vw, 8rem) var(--gutter) 0; }
```

- **16px gutter, always**, at every viewport.
- **Single measure.** One 1120px column. No nested sidebars, no masonry.
- **Rhythm is the window chrome.** Space between sections is set by
  `clamp(4rem, 10vw, 8rem)` so the gap scales, but the *felt* rhythm comes from
  `.section-head::after` — the dithered rule — which closes every section head.
- **Vertical stack order is a desktop metaphor**: menu bar (fixed) → hero →
  full-bleed reel band → documents → desktop/footer.

### Grid recipes in use

| Component | Track |
|---|---|
| `.about-body` | `minmax(0,360px) minmax(0,1fr)` — collapses to 1 at 760px |
| `.services` | `repeat(2, minmax(0,1fr))` — 1 at 760px |
| `.presets-grid` | `repeat(3, minmax(0,1fr))` — 2 at 760px |
| `.finder-grid` | `repeat(auto-fill, minmax(min(100%,15rem),1fr))` |
| `.disks` | `repeat(auto-fill, minmax(min(100%,9.5rem),1fr))` — 2 at 520px |
| `.contact` | `minmax(0,1.65fr) minmax(0,1fr)` — 1 at 860px |

`minmax(0, …)` on every flexible track is non-negotiable — it is what lets long
German compound words and unbroken URLs shrink instead of blowing out the grid.

---

## 4. Chrome components

### 4.1 The window — the single most reused form

```css
.window {
  position: relative;
  background: var(--paper);
  border: var(--line) solid var(--ink);
  box-shadow: var(--shadow);        /* 4px 4px 0 — hard, no blur */
}

.window-title {                      /* the striped title bar */
  position: relative; display: flex; align-items: center; justify-content: center;
  height: 1.6rem; padding: 4px 3px;
  border-bottom: var(--line) solid var(--ink);
  background: repeating-linear-gradient(to bottom,
              var(--ink) 0 1px, transparent 1px 3px) content-box;
  font-family: var(--font-ui); font-size: .95rem; line-height: 1;
  user-select: none;
}
.window-title-text {                 /* the paper label punching out of the stripes */
  padding: 0 .65em; background: var(--paper);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: calc(100% - 3rem);
}
.window-close {                      /* the System 1 close box */
  position: absolute; left: .65rem; top: 50%; translate: 0 -50%;
  width: 13px; height: 13px;
  border: var(--line) solid var(--ink);
  background: var(--paper);
  box-shadow: 0 0 0 3px var(--paper);   /* clears the stripes behind it */
}
.window-body { padding: clamp(1.25rem, 3vw, 2rem); }
```

Three details carry the whole illusion:

- The title bar is a **repeating gradient**, not a pattern — 1px ink every 3px.
  It is `content-box` painted so the border stays solid.
- The title text is **white on top of the stripes**, so it reads as a paper label
  taped into a hatched bar.
- The close box has `box-shadow: 0 0 0 3px var(--paper)` to punch a gap in the
  hatching. Without it, the stripes run through the box and it dies.

**Modal dialog variant** — thicker, double-ruled, like a real alert box:

```css
.window--dialog {
  border-width: 3px;
  box-shadow: inset 0 0 0 3px var(--paper),
              inset 0 0 0 5px var(--ink),
              6px 6px 0 var(--ink);
}
```

### 4.2 Menu bar (sticky, 2.5rem, bottom rule)

- Height is a token because `scroll-padding-top: calc(var(--menubar-h) + 1rem)`
  depends on it — anchor jumps must clear the bar.
- `overflow-x: auto` with `scrollbar-width: none`: on a narrow desktop the items
  scroll rather than wrap; the bar never grows.
- **Active section** is a 3px red underline, `text-underline-offset: 5px`.
- **Live clock**, `Sat 11:07`, `Intl.DateTimeFormat('en-GB')`, `tabular-nums`,
  refreshed every 15s. Not decoration — it is proof the machine is on.
- **Motion toggle** is a literal System 1 checkbox: a 14px box with an X drawn
  from two `linear-gradient`s, shown only when `aria-pressed="true"`.

### 4.3 Buttons

```css
.btn {
  min-height: 44px;                  /* touch target floor, always */
  padding: .35em 1.3em;
  border: var(--line) solid var(--ink);
  border-radius: 12px;               /* the ONE radius on the site */
  background: var(--paper); color: var(--ink);
  font-family: var(--font-ui); font-size: 1.05rem; line-height: 1.2;
}
.btn:hover  { background: var(--ink); color: var(--paper); }
.btn:active { background: var(--red);  border-color: var(--red); color: var(--paper); }
.btn:disabled {                       /* "working": hatched out */
  background: var(--pat-25) 0 0 / 4px 4px, var(--paper);
}
```

- `.btn--default` adds the **heavy outer ring**: `box-shadow: 0 0 0 2px var(--paper),
  0 0 0 5px var(--ink)` — a white gap then a black ring. Exactly one primary
  action per region.
- `.btn--small` → `min-height: 36px`, `.95rem`, radius 9px.
- `border-radius` is **12px / 9px and nothing else**. The System 1 square corners
  would be more authentic, but 12px is the deliberate concession to modern touch;
  do not increase it.

### 4.4 Section header — the dithered rule

```css
.section-head { position: relative; padding-bottom: 1.25rem; }
.section-head::after {
  content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 10px;
  background: var(--pat-50) 0 0 / 4px 4px;
  border-block: var(--line) solid var(--ink);
}
```

A 10px band of 50% checkerboard between two 2px rules. It is the site's only
horizontal divider, and it doubles as the section's baseline. The `.section-sub`
is prefixed with `— ` via `::before`, giving the whole head a caption rhythm:
number → title → dashed sub → rule.

### 4.5 The floppy disk (Brands)

Pure CSS, three layers, no images:

```css
.disk {
  aspect-ratio: 90 / 94;
  background: var(--ink);
  border-radius: 4px;
  clip-path: polygon(0 0, 91% 0, 100% 8.5%, 100% 100%, 0 100%);  /* cut corner */
  transition: translate .2s steps(2);
}
.disk::before, .disk::after {          /* write-protect holes */
  bottom: 5%; width: 7%; aspect-ratio: 1; background: var(--paper);
}
.disk::before { left: 5%; } .disk::after { right: 5%; }

.disk-shutter {                        /* red = the magnetic disk underneath */
  top: 0; left: 24%; width: 52%; height: 33%;
  background: var(--red); overflow: hidden;
}
.disk-shutter::before {                /* the metal shutter, with its slot */
  position: absolute; inset: 0;
  background: linear-gradient(var(--ink),var(--ink)) 22% 30% / 22% 55% no-repeat,
              var(--pat-50) 0 0 / 4px 4px, var(--paper);
  border: var(--line) solid var(--ink); border-top: 0;
  transition: translate .3s steps(3);
}
.disk-label {                          /* ruled paper label */
  left: 9%; right: 9%; top: 41%; bottom: 0;
  background: repeating-linear-gradient(to bottom,
              transparent 0 calc(1.1rem - 1px), #bbb calc(1.1rem - 1px) 1.1rem),
              var(--paper);
}
```

Hover (`@media (hover:hover)` only): the disk lifts `translate: 0 -6px` **and the
shutter slides right 55%**, exposing the red disc underneath. This is the single
most characteristic interaction on the site — an affordance that only makes sense
because both states were drawn by hand.

### 4.6 Finder icon view (Projects)

```css
.file-name a::before { content: '↗ '; color: var(--red); }
```

Hover/focus-within inverts the icon rather than swapping it:

```css
filter: invert(1) hue-rotate(180deg);
```

Black stays black, white becomes black, **red becomes cyan-ish blue**. It is a
one-property recolour that keeps the icon art intact. Applied to `.file-icon`,
`.desktop-icons img`. `.desktop-icons img` also carries `outline: 4px solid
var(--paper)` so the icon sits in a paper cut-out on the desktop pattern.

The whole card is the hit target — `.file-name a::after { content:''; position:absolute; inset:0 }`.

### 4.7 Finder info / status bars

```css
.finder-info {
  display: flex; justify-content: space-between;
  border-bottom: var(--line) solid var(--ink);
  box-shadow: 0 2px 0 var(--paper), 0 3px 0 var(--ink);   /* the 1px groove */
  font-family: var(--font-mono); font-size: 1.15rem;
}
.finder-status {
  border-top: var(--line) solid var(--ink);
  background: var(--pat-25) 0 0 / 4px 4px;                 /* 25% dot screen */
}
.finder-status-label { background: var(--paper); padding: 0 .4em; }  /* punches out */
```

Three facts, spaced with `space-between`, in VT323, separated from the content by
a shadow groove. Labels punch through the hatch with a paper background.

### 4.8 The desktop (footer)

```css
.desktop {
  margin-top: clamp(5rem, 12vw, 9rem);
  border-top: var(--line) solid var(--ink);
  background: var(--pat-50) 0 0 / 4px 4px fixed;   /* ← fixed, not scroll */
}
```

`fixed` is the load-bearing word, with the reason in the source comment: a 50%
checkerboard that scrolls gets resampled at sub-pixel offsets and shimmers; pinned
to the viewport it reads as a desktop *behind* the page. Icons sit on `3.5rem`
padding with paper `outline` cut-outs and paper-backed captions that invert on
hover. The bottom bar is solid paper — the classic menu-bar strip.

### 4.9 Info list (`<dl>`)

```css
.info { border-top: var(--line) solid var(--ink); }
.info > div {
  display: flex; justify-content: space-between; gap: 1rem;
  padding: .45rem 0;
  border-bottom: 1px dashed var(--ink);      /* dashed = a data row, not a rule */
}
.info dt { font-family: var(--font-ui); }
.info dd { margin: 0; text-align: right; overflow-wrap: anywhere; }
```

Dashed row separators, not solid. Solid rules are reserved for structure.

### 4.10 Form controls

```css
.field input, .field textarea {
  width: 100%; padding: .6rem .75rem;
  border: var(--line) solid var(--ink);
  border-radius: 0;                /* inputs are square; only buttons are 12px */
  font-size: 1rem;
}
.field input::placeholder { color: #666; opacity: 1; }
.field input:user-invalid { border-color: var(--red); border-style: dashed; }
```

- `border-radius: 0` on inputs is deliberate: **square is "field", 12px is "button".**
- `:user-invalid` (not `:invalid`) so a pristine form is never red.
- Placeholder is `#666` — the one hard-coded hex outside `:root`, because
  `#666` is the Atkinson placeholder value, not a design token.
- Status line gets a `▶ ` prefix via `.form-status:not(:empty)::before`.

---

## 5. Motion

### 5.1 The law: everything is stepped

| Thing | Timing |
|---|---|
| `.cursor` blink | `blink 1.06s steps(1) infinite` |
| Photo dither ↔ colour | `opacity .45s steps(5)` |
| Floppy shutter | `translate .3s steps(3)` |
| Floppy lift | `translate .2s steps(2)` |
| Reel dither ↔ colour | reveal is **Bayer-ordered in 2×2-cell blocks** |
| Preset box dither ↔ colour | reveal is **Bayer-ordered in 2×2-cell blocks** |

There is not one `ease` on the site. Smooth interpolation would break the
illusion the instant it appeared; the stepping *is* the aesthetic.

Easing is still used — but only **inside the frame-to-frame budget**, in JS:
`smoothstep` for the fold, `easeOutCubic` for swirl spread, `1-(1-p)³` for the
services cascade. Per-frame easing ≠ smooth CSS transitions.

### 5.2 The motion switch is a first-class feature

```js
// inline in <head>, before any paint
var m = null;
try { m = localStorage.getItem('futc-motion'); } catch (e) {}
if (!m) m = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'off' : 'on';
document.documentElement.dataset.motion = m;
document.documentElement.classList.add('js');
```

Priority is **saved choice → OS preference → on**, set on `<html>` *before* CSS
paints so nothing animates by surprise. The header toggle flips it live and fires
`document.dispatchEvent(new CustomEvent('futc:motion', { detail: next }))`; every
module listens. Turning motion off must, within one frame:

- stop the blink,
- drop the photo transition,
- force every `[data-zoom]` window open,
- render one static hero frame,
- pause the reel,
- freeze the preset boxes in their rest pose.

`@media (prefers-reduced-motion: reduce)` then covers the case where the visitor
has *not* explicitly opted in:

```css
@media (prefers-reduced-motion: reduce) {
  html:not([data-motion="on"]) *,
  html:not([data-motion="on"]) *::before { animation: none !important; transition: none !important; }
}
```

The `:not([data-motion="on"])` guard is essential: an explicit "on" must beat the
OS default.

---

## 6. The 1-bit pipeline (the signature move)

Full-colour media is *never* shown by default. Every image/video/3D pass renders
through an **8×8 Bayer ordered-dither threshold**, and only resolves to colour on
intent.

The Bayer matrix is built by recursion, identically in all three shaders:

```glsl
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
```

Luminance + threshold → 1 or 0:

```glsl
float l   = dot(c, vec3(0.299, 0.587, 0.114));
float ink = step(bayer8(cell) + 0.5 / 64.0, l);
gl_FragColor = vec4(vec3(ink), 1.0);
```

Three sites, three triggers:

| Site | Trigger |
|---|---|
| Portrait (`images/man-dither.png`) | `Show in color` button, or hover on fine pointers |
| Reel (`video/reel-*.webm/mp4`) | dissolves to colour **as the band crosses the middle of the screen**; a `Dither` button overrides |
| Preset boxes (3D) | hover / focus; on touch, when the card is centred |

**The dissolve is also dithered.** It does not cross-fade; it *reveals in Bayer
order, in 2×2-cell blocks* — colour appears as a pattern sweeping across the
frame. That is the difference between a filter and a language.

Static portraits pre-bake the dither offline (`man-dither.png` + CSS
`image-rendering: pixelated`) rather than paying for a shader.

---

## 7. Progressive enhancement rules

1. **No WebGL is a supported state, not an error.** Every canvas gets a
   `.has-webgl` class; CSS shows an `<img>` fallback when it's absent.
2. **No JS is a supported state.** `<html>` only gets `.js` when JS ran;
   `html.js [data-zoom]:not(.is-open) { opacity: 0 }` means without JS every
   window is simply visible.
3. **Decorative canvases are `aria-hidden`.** The hero bird, the swirl, the reel
   canvas and the preset canvas carry no text. Meaningful content is in real
   DOM: the reel has `<p class="sr-only">A looping reel of highlights…</p>`,
   the typed role line has a full `.sr-only` sentence
   (*"Software Developer, Photographer, YouTuber, Creative Professional"*) and
   only the animated copy is `aria-hidden`.
4. **State lives in ARIA, never in a class you invented.** `aria-pressed` on every
   toggle, `aria-current="true"` on the active nav item, `aria-expanded` on the
   pull-down menu.
5. **Skip link** is the first focusable node, offset `-100px`, moves to `.5rem`
   on focus.

---

## 8. Accessibility budget

```css
:focus-visible { outline: 3px solid var(--red); outline-offset: 3px; }
::selection    { background: var(--red); color: var(--paper); }
```

- Red is the focus ring, not black — the one place red is used for a UI affordance
  on every element at once, which is why it is allowed.
- Chrome that is flush to the viewport edge (menu items, motion toggle) uses
  `outline-offset: -3px` so the ring draws inside and isn't clipped.
- `.btn--default` uses `outline-offset: 8px` — the button already has a 5px ring,
  so the focus ring sits outside it.
- `.file:focus-within` / `.preset:focus-within` outline the **whole card** with
  `outline-offset: 10px / 4px` and suppress the inner link outline, so there is
  one visible focus target, not two nested ones.
- Contrast: red `#E00000` = **5.04:1** on white (passes AA for normal text);
  muted `#4a4a4a` = **8.9:1**; placeholder `#666` = **5.74:1**. See `COLORSTYLE.md`.
- Hit targets: `.btn` `min-height: 44px`, `.btn--small` 36px, `.menubar a` full
  bar height.

---

## 9. Content voice

The copy is a load-bearing part of the design. Three registers, each mapped to a
visual register:

| Register | Where | Type |
|---|---|---|
| **Confessional first person** | Hero, About | Atkinson body |
| **Machine telemetry** | Clock, `6 packs`, `1.44 MB each`, `2026 K in disk`, `∞ K available`, `DISK 01`, `highlights.mov` | VT323 |
| **Deadpan self-deprecation** | *"(no this is not real film I will just use any excuse to open Blender)"*, *"You probably won't read this anyways so just scroll down."*, *"You probably won't read this anyways…"* | Atkinson body |

The joke is structural: the third register sits inside the second, in a box that
looks like a Finder window. **Deadpan is a tone, not a font size** — it is set at
normal weight and size, and the absurdity comes from the framing.

---

## 10. Anti-patterns — what breaks the language

- ❌ Any colour other than `#E00000`, `#4a4a4a`, `#666`, `#bbb`, `#000`, `#fff`.
- ❌ Blurred shadows. `4px 4px 0` — hard offset, zero blur, always.
- ❌ `border-radius` above 12px, or rounded inputs.
- ❌ A CSS `transition` without `steps()`.
- ❌ More than one `.btn--default` per visible region.
- ❌ Red on a decorative element with no state or meaning attached.
- ❌ Interpolation (`font-weight: 450`, animated `box-shadow`, smooth colour).
- ❌ Full-colour media that never goes through the dither.
- ❌ Sans-serif (non-pixel) for chrome, or pixel type for body copy.
- ❌ Greys. Use `--pat-50` / `--pat-25`; they read as *texture*, not *colour*.

---

## 11. Copy-paste starter

```css
:root{
  --ink:#000; --paper:#fff; --red:#E00000; --muted:#4a4a4a;
  --font-ui:'Pixelify Sans','VT323',ui-monospace,monospace;
  --font-body:'Atkinson Hyperlegible',system-ui,sans-serif;
  --font-mono:'VT323',ui-monospace,Menlo,monospace;
  --line:2px; --shadow:4px 4px 0 var(--ink); --gutter:16px; --menubar-h:2.5rem;
  --pat-50:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='2' shape-rendering='crispEdges'%3E%3Crect width='1' height='1'/%3E%3Crect x='1' y='1' width='1' height='1'/%3E%3C/svg%3E");
  --pat-25:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect width='1' height='1'/%3E%3Crect x='2' y='2' width='1' height='1'/%3E%3C/svg%3E");
}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);
     font:400 1.0625rem/1.6 var(--font-body);-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration-thickness:2px;text-underline-offset:3px}
a:hover{background:var(--ink);color:var(--paper);text-decoration:none}
:focus-visible{outline:3px solid var(--red);outline-offset:3px}
::selection{background:var(--red);color:var(--paper)}
```

---

## Companion documents

- [`HOWITSWORK.md`](HOWITSWORK.md) — architecture, boot order, the three WebGL
  pipelines, performance discipline.
- [`COLORSTYLE.md`](COLORSTYLE.md) — the ink set, contrast table, the rationing
  rule, the dither palettes.