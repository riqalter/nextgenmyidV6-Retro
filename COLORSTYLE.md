# FUTC — Colour Style

> Reverse-engineered from [futc.de](https://futc.de/).
> Source of truth: the `:root` block of `css/style.css?v=13`, plus the colour
> literals in `js/hero.js?v=10`, `js/reel.js?v=8`, `js/presets.js?v=12`.
> Captured 2026-10-10.

---

## 0. The rule the whole palette obeys

> **1-bit black & white, one red.**

Stated in the stylesheet's own first line. There is no gradient, no shadow blur,
no alpha-scrimmed overlay, no dark mode. The entire page is drawn with **two
opaque inks** and **one accent**, plus **two "greys" that are actually textures**.

The reference is the 1984 Macintosh, whose screen was 1-bit and whose interface
literally could not express another colour. The site works *within* that
constraint rather than quoting it decoratively — the red is used because the
original didn't have it, and that is exactly why it means something.

---

## 1. The complete ink set

### Declared (`:root`)

| Token | Hex | RGB | HSL | Role |
|---|---|---|---|---|
| `--ink` | `#000000` | 0, 0, 0 | `hsl(0 0% 0%)` | Every border, every glyph, every shadow. Body text. |
| `--paper` | `#FFFFFF` | 255, 255, 255 | `hsl(0 0% 100%)` | Every background. |
| `--red` | `#E00000` | 224, 0, 0 | `hsl(0 100% 44%)` | The one accent. |
| `--muted` | `#4A4A4A` | 74, 74, 74 | `hsl(0 0% 29%)` | Secondary descriptions only. |

Plus `<meta name="theme-color" content="#ffffff">` — the browser chrome matches
paper, so the address bar disappears into the page.

### Undeclared literals (there are only four)

| Hex | Where | Why it's not a token |
|---|---|---|
| `#666` | `.field input::placeholder`, `::placeholder` | The Atkinson placeholder value. 1 line, 1 use. |
| `#bbb` | `.disk-label` ruled-paper gradient | The line on a physical label. Deliberately light. |
| `#000` | `hero.js` — glyph sprites | Canvas drawing, can't read CSS vars. |
| `#E00000` | `hero.js` — red glyph sprites + `uRed` uniform | Same. |

**That is the whole palette.** Four tokens, four literals, zero others. If you are
reproducing this and you find yourself reaching for a second hue, you have left
the design language.

---

## 2. Contrast

Measured against `--paper` (`#fff`).

| Pair | Ratio | WCAG AA | Used for |
|---|---|---|---|
| `--ink` on `--paper` | **21:1** | AAA | Body copy, headings, borders |
| `--muted` `#4a4a4a` on paper | **8.86:1** | AAA | `.file p`, `.contact-role`, `.disk--blank .disk-name` |
| `--red` `#E00000` on paper | **5.04:1** | AA (all sizes) | Section numbers, `DISK 01`, `↗`, `▶` |
| `#666` on paper | **5.74:1** | AA | Input placeholders |
| paper on `--ink` | **21:1** | AAA | Inverse button/link hovers |
| paper on `--red` | **5.04:1** | AA (all sizes) | `.btn:active`, `::selection`, `.preset-soon` |
| `#bbb` on paper | *1.92:1* | ✗ **decorative only** | Ruled lines on floppy labels |

The two source comments carry the audit:

```css
--red:   #E00000;   /* 5.04:1 on white — safe for text */
--muted: #4a4a4a;   /* 8.9:1 on white */
```

`#E00000` is chosen to clear 4.5:1 *and* keep max channel at 224, not 255 —
`#FF0000` is 4.0:1 and would fail AA for normal text. The red is tuned, not
picked from a swatch.

`#bbb` at 1.92:1 is the single deliberate failure: it's a hairline on a 3.5"
floppy label, ~1px tall, and carries no information. Everything that carries
information passes AA.

### Never used for text

- The `--pat-50` / `--pat-25` hatches — texture, never glyphs.
- `filter: invert(1) hue-rotate(180deg)` on hover — the *inverse* of a black icon
  on paper, always an icon, never text.

---

## 3. The rationing rule

Red appears on the site **exactly twenty times in 999 lines of CSS**. Every use
falls into one of five permitted categories. If your red doesn't fit one of them,
it isn't red — it's ink.

### Category 1 — You are here *(4 uses)*

| Selector | Treatment |
|---|---|
| `.menubar-menu a[aria-current="true"]` | 3px red underline, `offset 5px` |
| `.section-kicker` | `01`, `02`, `03`… set in red VT323 |
| `.hero-bird-caption` 折り紙 | red, vertical-rl, on a paper chip |
| `.menubar-logo` | the logo is red at rest |

### Category 2 — This is a state or control *(9 uses)*

| Selector | Treatment |
|---|---|
| `:focus-visible` | `outline: 3px solid var(--red); outline-offset: 3px` |
| `::selection` | `background: var(--red); color: var(--paper)` |
| `.btn:active` | fill + border go red |
| `.motion-toggle[aria-pressed="true"] .motion-toggle-box` | red-free — the X is `--ink` |
| `.file:focus-within` | 3px red outline, `offset 10px`, whole card |
| `.preset:focus-within` | 3px red outline, `offset 4px`, whole card |
| `.form-status.is-error` | message in red |
| `:user-invalid` on input/textarea | `border-color: var(--red); border-style: dashed` |
| `.field label span` | the required-asterisk `*` |

### Category 3 — Machine telemetry *(2 uses)*

| Selector | Treatment |
|---|---|
| `.hero-prompt` (`>`) + `.cursor` | red prompt and blinking block cursor |
| `.disk-no` (`DISK 01`…`DISK 09`) | red VT323 on the floppy label |

### Category 4 — Brand / the accent object *(3 uses)*

| Selector | Treatment |
|---|---|
| `.preset-soon` | red sticker, `rotate: -6deg`, `box-shadow: 3px 3px 0 var(--ink)` |
| `.disk-shutter` | `background: var(--red)` — the magnetic disk under the shutter |
| `.file-name a::before` / `.preset-name a::before` | `content: '↗ '` — the external-link marker |

### Category 5 — Inverse hover that preserves brand *(2 uses)*

```css
.menubar-logo:hover      { background: var(--ink); color: var(--red); }
```

Inverting turns black-on-white into white-on-black; the logo **stays red** rather
than going white. One of two places where the accent deliberately survives the
inverse. The other is `.hero-swirl`'s red sprites in the WebGL pass.

### The line you will not find in the stylesheet

There is **no red on any heading, no red in body copy, no red button fill at
rest, and no red in any large surface**. Red is a 5–10% accent by area. On the
hero it appears as a single glyph, a single prompt, and a 1px cursor.

---

## 4. The two fake greys

Grey is banned. What the design uses instead is **halftone texture** — the visual
grammar of a 1-bit screen printing tone.

```css
/* 50% — a 2×2 checkerboard, two diagonal 1px rects */
--pat-50: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='2' shape-rendering='crispEdges'%3E%3Crect width='1' height='1'/%3E%3Crect x='1' y='1' width='1' height='1'/%3E%3C/svg%3E");

/* 25% — a 4×4 tile with two 1px rects */
--pat-25: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect width='1' height='1'/%3E%3Crect x='2' y='2' width='1' height='1'/%3E%3C/svg%3E");
```

| Pattern | Coverage | Perceived | Tiled at | Used by |
|---|---|---|---|---|
| `--pat-50` | 50% | ≈ `#808080` | `4px 4px` | `.section-head::after` rule, `.disk-shutter::before`, `.desktop` background |
| `--pat-25` | 25% | ≈ `#BFBFBF` | `4px 4px` | `.finder-status` (24px band), `.btn:disabled` |

`shape-rendering='crispEdges'` is mandatory — without it the browser antialiases
the 1px rects into grey fringes and the pattern turns to mush.

The perceived values above are the *area averages*; on screen you never see a flat
grey, you see the pattern. That is the point — a texture survives being the only
tone in the system, where a grey would read as an accidental default.

### The third texture: horizontal stripes

Not a token, but a pattern, and it's the window title bar:

```css
.window-title, .reel-bar {
  background: repeating-linear-gradient(to bottom,
              var(--ink) 0 1px, transparent 1px 3px) content-box;
}
```

1px ink every 3px — **33% horizontal line screen**. `content-box` paint origin so
the 2px border below stays solid. The same value is reused for the reel's control
bar, tying the full-bleed band to the document language.

### The fourth texture: the floppy label

```css
.disk-label {
  background: repeating-linear-gradient(to bottom,
              transparent 0 calc(1.1rem - 1px), #bbb calc(1.1rem - 1px) 1.1rem),
              var(--paper);
}
```

A `#bbb` 1px rule every `1.1rem` — a lined index card. At ≤520px it degrades to
plain paper (`background: var(--paper)`), because hairlines are noise on a small
disk.

---

## 5. Colour in the 1-bit pipeline

The WebGL passes **render in colour, then threshold to 1-bit before display.**
Full-colour pixels exist only in the framebuffer, never on screen. That ordering
matters for reproducing the look.

### Hero — `uRed` is the only colour

```glsl
uniform vec3 uRed;                              // #E00000
vec4 s = texture2D(uTex, gl_FragCoord.xy / uRes);
if (s.a < 0.5) discard;
if (s.b > 0.75) { gl_FragColor = vec4(uRed, 1.0); return; }   // the logo's strokes
if (s.b > 0.25) { gl_FragColor = vec4(1.0); return; }         // blank paper
float th = bayer8(gl_FragCoord.xy) + 0.5 / 64.0;
float ink = s.g > 0.5 ? mix(0.04, 0.7, 1.0 - s.r)   // front of the sheet
                      : mix(0.03, 0.6, 1.0 - s.r);  // back — a touch lighter
gl_FragColor = th < ink ? vec4(uRed, 1.0) : vec4(1.0);
```

Output is exactly two values: `#E00000` or `#FFFFFF`.

Two details that make the origami legible:

- **The back of the sheet is lighter** (`0.6/0.03` vs `0.7/0.04`). Folding the
  paper over visibly changes the ink coverage, so the 3D form is legible while
  remaining strictly two-tone. Without this the bird is a flat red blob.
- **Luminance is wrapped** (`0.18 + 0.82 * max(dot(n,uLight),0)`) so faces turned
  away from the light still dither to ~18% instead of solid black.

### The scene pass writes no colour at all

```glsl
if (vKind > 1.5) { gl_FragColor = vec4(0.0, 0.0, 0.5, 1.0); return; }  // paper plate
if (vKind > 0.5) { gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0); return; }  // ink stroke
float lum = 0.18 + 0.82 * max(dot(n, uLight), 0.0);
gl_FragColor = vec4(lum, gl_FrontFacing ? 1.0 : 0.0, 0.0, 1.0);
```

| Channel | Carries |
|---|---|
| `.r` | Lambert luminance |
| `.g` | front / back face flag |
| `.b` | semantic tag — `1.0` stroke, `0.5` plate, `0.0` foldable face |
| `.a` | coverage |

The dither pass is the only place colour is chosen. **Separate geometry from
colour**: the scene shader decides *what and how lit*, the dither shader decides
*ink or paper*.

### Swirl sprite pools

```js
const chars = CHARS.map(ch => charSprite(ch, 16, '#000'));
const reds  = ['*', '+', '#'].map(ch => charSprite(ch, 16, '#E00000'));
```

And every sprite — black, red, or icon — is alpha-thresholded:

```js
for (let i = 0; i < d.length; i += 4) d[i + 3] = d[i + 3] > 110 ? 255 : 0;
```

So a glyph is not anti-aliased greys; it is a hard 1-bit mask. Selection:

```js
const pool = roll < 0.1 ? sprites.icons : roll < 0.16 ? sprites.reds : sprites.chars;
```

| Pool | Share | Colour |
|---|---|---|
| `chars` — `*+#%&@$=/\|<>{}[]01;:~^?!FUTC` | 84% | `#000` |
| `icons` — prism, film, camera, mail, monitor, trash, phone, code | 10% | `#000` |
| `reds` — `*`, `+`, `#` | **6%** | `#E00000` |

Six percent. The rationing rule survives into the decorative layer: red glyphs are
roughly one in sixteen, and only three of the twenty glyph shapes are ever red.

### Reel and preset boxes — colour in, 1-bit out

These two *do* sample real photographs, so the pipeline is:

```glsl
vec3 c = texture2D(uTex, toUV(...)).rgb;          // real colour from video/artwork
float l = dot(c, vec3(0.299, 0.587, 0.114));      // Rec.709 luma
l = clamp((sqrt(l) - 0.5) * 1.7 + 0.5, 0.0, 1.0);// gamma lift + contrast
gl_FragColor = vec4(vec3(step(bayer8(cell) + 0.5/64.0, l)), 1.0);   // 0.0 or 1.0
```

Output is pure black and pure white. The **reveal** back to colour is also
ordered-dithered, in 2×2-cell blocks:

```glsl
if (bayer8(floor(cell / 2.0)) + 0.5 / 64.0 < uMix) { gl_FragColor = vec4(c, 1.0); return; }
```

Two rules that must be copied exactly:

1. **`sqrt(l)` before thresholding.** Linear luma from dark cardboard packs lands
   under 0.25 and dithers into noise. The square root lifts midtones so the
   printed labels survive. In any dither-threshold pipeline, correct gamma first.
2. **Sample at the cell centre** in the dithered branch — `(cell + 0.5) * uCell`,
   not `gl_FragCoord.xy`. Per-pixel sampling makes the pattern shimmer as the
   video plays.

Preset-box cell size is `3 * dpr`; `dpr` capped at 1.5. Presets lift their
midtone **twice as hard** (1.7 vs the reel's 1.3) because the artwork is dark
packaging rather than video.

---

## 6. Colour as the interaction primitive

On this site colour **is** the state signal. There are no other affordances —
no opacity, no scale, no icon change.

| Interaction | Colour signal |
|---|---|
| Link hover | `background: var(--ink); color: var(--paper)` — full inversion |
| Button hover | full inversion |
| Button press | `background: var(--red)` — **red = pressed** |
| Focus | 3px red ring |
| Text selection | red fill, paper text |
| Icon hover | `invert(1) hue-rotate(180deg)` — black→black, white→black, red→cyan |
| Nav active | red underline |
| Toggle on | ink-filled button / X in a checkbox |
| Required field invalid | red dashed border |
| Dithered media resolved | Bayer reveal, not a colour cross-fade |

The inversion trick deserves a note:

```css
.file:hover .file-icon, .desktop-icons a:hover img { filter: invert(1) hue-rotate(180deg); }
```

One CSS filter recolours an icon without swapping assets. `#000` → `#000`
(`invert(0) = 1`… then `hue-rotate(180deg)` returns black to black), `#FFF` → `#000`,
and `#E00000` → a cyan-ish blue. It's a period-correct "invert video" gag that
also happens to be correct behaviour. **It's fragile** — it assumes icons are
pure black/white/red and nothing else. Add an orange icon and this silently
breaks. If you reproduce it, constrain the icons.

---

## 7. Anti-patterns

- ❌ Any hex outside `#000 · #fff · #E00000 · #4a4a4a · #666 · #bbb`.
- ❌ `opacity` for hierarchy. Use `--muted`, `--pat-50`, or `--pat-25`.
- ❌ A real grey (`#888`, `#ccc`, `grey()`). Halftone instead.
- ❌ Gradients that aren't one of the four repeating-linear-gradients listed above.
- ❌ `box-shadow` with a blur radius. `4px 4px 0` — hard offset only.
- ❌ Red on a heading, a large fill, or a resting button.
- ❌ Red in more than ~10% of any viewport.
- ❌ A second accent hue. The 1-bit screen had room for one.
- ❌ Colour-fading a media reveal. Bayer-order the dissolve.
- ❌ Thresholding without the `+ 0.5/64.0` half-LSB bias — it aliases at 0.5.

---

## 8. The palette as tokens

```css
:root {
  --ink:   #000000;
  --paper: #FFFFFF;
  --red:   #E00000;   /* 5.04:1 on paper — safe for text */
  --muted: #4A4A4A;   /* 8.9:1 on paper */

  /* texture, not colour */
  --pat-50: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='2' shape-rendering='crispEdges'%3E%3Crect width='1' height='1'/%3E%3Crect x='1' y='1' width='1' height='1'/%3E%3C/svg%3E");
  --pat-25: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Crect width='1' height='1'/%3E%3Crect x='2' y='2' width='1' height='1'/%3E%3C/svg%3E");
  --pat-rule: repeating-linear-gradient(to bottom, var(--ink) 0 1px, transparent 1px 3px);

  color-scheme: light;   /* there is no dark mode. saying so is the point */
}
```

If you add a dark theme, note that this design has **no `prefers-color-scheme`
branch anywhere** — 999 lines, one `color-scheme: light`. Darkening a 1-bit
design means inverting every token, which changes the *meaning* of the red (a
darkened red on black drops under 4.5:1 immediately). That's why it isn't there.

---

## Companion documents

- [`DESIGN_LANGUAGE.md`](DESIGN_LANGUAGE.md) — tokens, type scale, components,
  motion, anti-patterns.
- [`HOWITSWORK.md`](HOWITSWORK.md) — architecture, boot order, the three WebGL
  pipelines, performance discipline.