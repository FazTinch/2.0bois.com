# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static site for "The 2.0 BOIS" — a Bitcoin Ordinals NFT project featuring Fomojis characters. The site is built to be inscribed on the Bitcoin blockchain via the Ordinals protocol. All assets (images, fonts, CSS resets) are referenced via `ordinals.com/inscription/` URLs rather than local files.

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
`src/index.html` contains a large base64-encoded gzip blob (`base64GzipPackage`). At runtime, the page uses `pako.min.js` to decompress this blob and inject it as the page's `innerHTML`. The actual album UI lives in `src/album.html` which gets compiled into this blob during the deploy build.

The decompressed content includes inline `<script>` tags that are re-executed after injection.

### Source Structure
- `src/index.html` — Main page template (references `../css/` via `?__inline=true` for inlining)
- `src/album.html` — The album UI component (day/night toggle, three Fomoji characters, tracklist)
- `sass/` — SCSS source files organized as:
  - `00_setup/` — Variables, mixins, patterns
  - `01_global/` — Reset, typography, layout
  - `03_components/` — Component styles
  - `c-inline-style.scss` / `c-async-style.scss` — Entry points
- `js/` — JavaScript (plugins, main, vendor libs)
- `includes/` — Local font file (`jost-300-light.woff2`)
- `css/` — Compiled CSS output (do not edit directly)
- `deploy/` — Final production output
- `.tmp/` — Intermediate build artifacts

### External Dependencies (Ordinals Inscriptions)
All shared assets are loaded from `ordinals.com` inscriptions, including:
- Marx CSS reset (stylesheet)
- inline-svg.js
- All character/background images

No CDN or npm runtime dependencies — this is intentional for on-chain hosting.
