# Vizi Screenshot Studio

Generates App Store / Play Store screenshots by **re-creating Vizi's UI in a
browser** — no simulator, no device, no running app. The screens are plain
React + CSS ports of the real components, laid out at true point size and then
scaled, so a 16pt body line is a 16pt body line.

Everything lives in this folder. `vizi-mobile/` is never touched.

```
screenshot-studio/
  src/theme.ts            colors / spacing / radius / typography, ported 1:1
  src/icons.ts            copied verbatim from vizi-mobile/src/components/icons.ts
  src/paywall-pattern.ts  copied verbatim from vizi-mobile/src/components/
  src/screens/            session screen + paywall, recreated in plain DOM
  src/components/         Screen / RoundedButton / IconButton + the device frame
  src/devices.ts          export sizes and the canvas layout maths
  src/config.ts           default captions, transcripts, paywall copy
  config/slides.config.json  what the dashboard saves and the export reads
  scripts/export.mjs      Playwright -> PNG
  public/fonts/           Chunk (gitignored) + Poppins
  public/scenes/          demo camera photos (gitignored, re-downloadable)
```

## Prerequisites

- **Node 20.11+** (developed on 24).
- **Chromium for Playwright** — `npx playwright install chromium`.
- **The Chunk font.** It is a licensed asset, gitignored repo-wide, and must
  exist at `vizi-assets/font/chunk-font/Chunk.woff2` (or `Chunk.otf`). Copy it
  into the studio with `npm run fonts`. Without it the export refuses to run
  rather than quietly producing screenshots in a fallback face.
  Poppins is bundled (SIL Open Font License) and self-hosted, so exports never
  touch the network.

## Setup

```bash
cd vizi-assets/screenshot-studio
npm install
npx playwright install chromium
npm run fonts     # copies Chunk from vizi-assets/font/chunk-font
npm run scenes    # downloads the demo camera photos into public/scenes
```

## Dashboard

```bash
npm run dev       # http://localhost:5178
```

Pick a device, pick a slide, edit the caption / camera photo / status pill /
transcript lines (or the paywall copy and prices), and watch the live preview
scaled to fit. **Save** writes `config/slides.config.json`; **Export all**
saves and reminds you to run `npm run export` — the exporter is a Node process,
so the browser cannot start it itself.

## Export

```bash
npm run export                              # all devices, all slides
npm run export -- --device iphone-6.9       # one device
npm run export -- --slide 3                 # one slide (1-based)
```

Playwright loads each slide at `size / 2` CSS pixels with
`deviceScaleFactor: 2`, waits for `document.fonts.ready` plus every image to
decode, then screenshots. Afterwards it re-reads the PNG headers and prints the
real dimensions — a wrong size fails the run.

Output:

```
vizi-assets/screenshots/
  iphone-6.9/01-conversation.png … 05-vizi-plus.png
  iphone-6.9-xl/…
  ipad-13/…
```

`vizi-assets/screenshots/` is gitignored — it is generated output.

## Sizes

App Store Connect only wants the largest display in each family; it scales the
rest of the listing from those.

| Device | Preset | Pixels | Screen points |
| --- | --- | --- | --- |
| iPhone 6.9" | `iphone-6.9` | **1290 × 2796** | 430 × 932 @3x |
| iPhone 6.9" | `iphone-6.9-xl` | **1320 × 2868** | 440 × 956 @3x |
| iPad 13" | `ipad-13` | **2064 × 2752** | 1032 × 1376 @2x |

Both iPhone sizes are accepted for the 6.9" slot — upload either set, not both.

Vizi currently ships with `"supportsTablet": false` (see `vizi-mobile/app.json`),
so the iPad screenshots are **not** required today. The preset is there for when
iPad support lands. Note that the app has no iPad-specific layout, so the iPad
render is honestly what the app would show: the phone layout stretched across a
1032pt-wide screen.

## Device frame

Drawn in CSS from our own palette: a plain dark rounded bezel, a pill for the
Dynamic Island, a generic status bar (time plus abstract signal / wireless /
battery glyphs) and a home indicator. No Apple artwork, no product names, no
photoreal chrome — Apple's marketing guidelines do not allow device art you
did not license, and store screenshots do not need it.

## Image licensing — read before submitting

The demo photos in `public/scenes/` are Unsplash-licensed placeholders chosen to
make the mock legible. **Check `public/scenes/CREDITS.md` before any of these
reach App Store Connect**: no third-party logos in frame, no recognisable faces,
and nothing that misrepresents what the app does. If in doubt, replace them with
imagery we shot ourselves — drop the file in `public/scenes/` and add it to
`SCENES` in `src/config.ts`.

The same goes for the paywall prices: whatever the pricing pills say has to
match the real RevenueCat products in App Store Connect.

## Keeping it honest

`src/theme.ts`, `src/icons.ts` and `src/paywall-pattern.ts` are copies of the
app's own files. If the app's palette, icons or type scale change, re-copy them
— the studio has no build-time link to `vizi-mobile/`, on purpose, so it can be
run without the mobile toolchain installed.
