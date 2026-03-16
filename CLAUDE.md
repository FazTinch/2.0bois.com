# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static site for "The 2.0 BOIS" — a Bitcoin Ordinals NFT project featuring Fomojis characters. The site is built to be inscribed on the Bitcoin blockchain via the Ordinals protocol. All assets (images, fonts, CSS resets, JS libraries) are referenced via `ordinals.com/content/` URLs — always `/content/<id>`, never `/inscription/<id>` (which returns an HTML viewer page, not the raw asset).

## Build Commands

Install dependencies:
```
npm install
```

Cold dev build (no watch):
```
npx grunt build
```

Development (watch mode with livereload):
```
npx grunt
```

Production deploy build:
```
npx grunt deploy
```

## Build Pipeline (Grunt)

The build system uses Grunt. The key concept is that `src/album.html` is compiled into a gzip+base64 blob that is embedded as `base64GzipPackage` in `src/index.html` and decompressed at runtime by pako.

**`src/index.html` is a stable template** — it contains `const base64GzipPackage = '__BLOB__'` as a placeholder and is **never modified** by the build. `blobify` reads it, substitutes the real blob, and writes output files directly.

**Dev chain** (`grunt build` / watch):
1. `dart-sass:dev` → `.tmp/css/`
2. `postcss:dev` → `css/` (autoprefixed + minified)
3. `concat:dev` + `uglify:dev` → `js/script.js`
4. `inline:album` — inlines `css/c-inline-style.css` and `js/script.js` into `src/album.html` → `.tmp/album.html`
5. `blobify:dev` *(custom task)* — gzips `.tmp/album.html`, base64-encodes it, substitutes `'__BLOB__'` in `src/index.html` template, writes → `index.html`

**Deploy chain** (`grunt deploy`):
1. `clean:beforeDeploy` — wipes `.tmp/` and `deploy/`
2. `dart-sass:deploy` + `postcss:deploy` — compressed CSS
3. `concat:dev` + `uglify:dev` — minified JS
4. `inline:album` — inlines CSS + JS into album.html → `.tmp/album.html`
5. `htmlmin:album` — further minifies `.tmp/album.html` → `.tmp/album-min.html` (with `minifyCSS` + `minifyJS`)
6. `blobify:deploy` — gzips `.tmp/album-min.html`, substitutes `'__BLOB__'`, writes → `.tmp/deploy/index.html`
7. `htmlmin:deploy` — produces final `deploy/index.html`

## Architecture

### Key Concept: Compressed Inline Content
`src/index.html` decompresses a gzip+base64 blob at runtime using pako and injects it as `innerHTML`. The actual album UI lives in `src/album.html` which gets compiled into this blob during the build. Inline `<script>` tags in the decompressed content are re-executed via `loadScript()` since `innerHTML` does not execute scripts.

### Performance
- `<script type="module">` has zero static imports — DOMContentLoaded fires as soon as HTML is parsed (~67ms cached, ~197ms cold on Fast 4G)
- pako and inlineSVG are loaded in parallel via `Promise.all` inside `inflateContent()` after DOMContentLoaded
- Marx CSS reset is loaded async via `rel="preload" as="style"` — non-render-blocking
- `<link rel="preconnect" href="https://ordinals.com">` warms the connection early
- All ordinals assets are `cache-control: immutable` — instant on repeat visits

### Loading JS from Ordinals Inscriptions
Two patterns depending on the library format:
- **ESM libraries** (e.g. pako): use dynamic `import('https://ordinals.com/content/<id>')` — works because the outer script is `<script type="module">`
- **UMD/IIFE libraries** (e.g. inlineSVG): use `loadInscription(url)` which appends a classic `<script src>` tag and returns a Promise — sets a global (e.g. `window.inlineSVG`) on load

Add new inscription dependencies to the `inscriptions` array in `src/index.html`. They are guaranteed to execute before the blob scripts run.

### Inlining SVGs from Inscriptions
Use `<img class="svg" data-src="https://ordinals.com/content/<id>">` — `data-src` prevents the browser pre-fetch so inlineSVG only makes one request. The resulting `<svg>` element is fully styleable via CSS (e.g. `.tedy_icon svg path { fill: #fff }`).

### Source Structure
- `src/index.html` — Outer wrapper template with blob decompression logic and `__BLOB__` placeholder
- `src/album.html` — The album UI (day/night toggle, three Fomoji characters, tracklist, notice strip)
- `sass/` — SCSS source files organized as:
  - `00_setup/` — Variables, mixins, patterns
  - `01_global/` — Reset, typography, layout
  - `03_components/` — Component styles
  - `c-inline-style.scss` / `c-async-style.scss` — Entry points
- `js/` — JavaScript (plugins.js, main.js concat → script.js, inlined into blob)
- `includes/` — Local font file (`jost-variable.woff2` — variable font, weights 100–900, pending inscription)
- `css/` — Compiled CSS output (do not edit directly)
- `deploy/` — Final production output
- `.tmp/` — Intermediate build artifacts

### External Dependencies (Ordinals Inscriptions)
- Marx CSS reset — loaded async via preload
- pako 2.1.0 (ESM) — dynamic import inside `inflateContent()`
- inline-svg.js — classic script via `loadInscription()`
- All character/background/logo images

No CDN or npm runtime dependencies — intentional for on-chain hosting. Blob size should be kept minimal; shared libraries belong as inscriptions, not inlined into the blob.

### Font
`includes/jost-variable.woff2` is the Jost variable font (26KB, latin, weights 100–900). The `@font-face` in `sass/c-inline-style.scss` declares it with `font-weight: 100 900`. The site uses `font-weight: 300` (light). This file is pending inscription on Bitcoin — once inscribed, the `@font-face` src should point to `https://ordinals.com/content/<id>`.

## Next Features

### 1. Inscribe Jost Variable Font
The file `includes/jost-variable.woff2` (26KB) is ready to inscribe. Steps:
1. Inscribe `includes/jost-variable.woff2` on Bitcoin via ord
2. Note the resulting inscription ID
3. In `sass/c-inline-style.scss`, update the `@font-face` src from the local file to:
   ```css
   src: url("https://ordinals.com/content/<id>") format("woff2 supports variations"),
        url("https://ordinals.com/content/<id>") format("woff2");
   ```
4. Remove `includes/jost-variable.woff2` from the repo
5. Run `npx grunt build` and verify the font loads correctly
6. Run `npx grunt deploy` and update the live site

### 2. Tedy SVG Styling
`.tedy_icon svg path { fill: #fff }` CSS rule is in place. Verify the white fill is rendering correctly on the live site after the inlineSVG + `/content/` URL fixes from this session.
