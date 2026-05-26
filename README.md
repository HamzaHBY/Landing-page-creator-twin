# Landing Page Creator — Twin Studio canvas-builder clone

Open-source reimplementation of [Twin Studio](https://twinstudio.app)'s **Landing Page Creator** (canvas-builder mode). Reverse-engineered from a full static analysis of Twin Studio's bundle and Supabase REST API. The clone reproduces:

- The same drag-zone-onto-canvas workflow (drop sections → set heights → assign prompts → generate)
- The same **1,203 pre-made section templates** across 10 categories (Hero, Problem Agitation, The Solution, Social Proof, How It Works, FAQ, VS, CTA, Landing Page, Before/After)
- The same **master system prompt** (≈ 3,400 words) — verbatim port of `buildSketchPrompt()` from Twin Studio's `entry.js`
- The same **brand-brief block** (`buildBriefPromptSection()`) and the same image-role manifest convention
- The same **two model tiers** Twin Studio exposes:
  - **Ultimate** → OpenAI `gpt-image-1` (Twin Studio's internal `sketch_model: "gpt-image-2"`)
  - **Premium** → Recraft V3 via fal.ai

## Stack

- **Expo SDK 56** with **Expo Router** (file-based routing + server API routes)
- **React Native Web** — same stack Twin Studio itself uses
- **TypeScript** end-to-end
- `openai` SDK for the gpt-image-1 backend
- `sharp` for any server-side image processing
- Single repo, single deploy (works on Vercel out of the box via the Expo Router preset)

## Quick start

```sh
git clone https://github.com/HamzaHBY/landing-page-creator.git
cd landing-page-creator
npm install

# add your API key
cp .env.example .env
# then edit .env and set OPENAI_API_KEY=sk-...   (and optionally FAL_KEY=...)

# dev server
npm run web
```

Open <http://localhost:8081>.

## Quality tiers

| UI label | Model | Backend hint | Min API key |
| --- | --- | --- | --- |
| **Ultimate** (default) | OpenAI `gpt-image-1` | `OPENAI_API_KEY` | OpenAI org verified for `gpt-image-1` |
| **Premium** | Recraft V3 | `FAL_KEY` | fal.ai |

Twin Studio's own UI gates `gpt-image-1` behind 350 credits per generation. This clone has no credit system — you pay OpenAI/fal directly.

## How it works

1. The left **Section Library** loads all 1,203 templates from `src/data/templates.json`. Pick one to add it as a new zone on the canvas. Each zone has a default proportion (`default_height_ratio`) and a default prompt that already references `[PRODUCT_IMAGE]`, `[BRAND_NAME]`, `[HEADLINE]` placeholders (not substituted client-side — gpt-image-1 resolves them by reading the product reference images).
2. The **Right Panel** lets you upload product images (one or many — these become the "BRAND EXTRACTION" reference in the prompt), set country/language context, fill out the optional Brand Brief, and configure the selected zone (free-text override, canvas annotation, inspiration image, content image).
3. The **Top Bar** controls quality tier, aspect ratio (1:3 default, 1:1, 9:16, 3:1, etc.), and output format.
4. When you hit **Generate**, the client:
   - Rasterises the canvas into a PNG sketch via `<canvas>` (`src/lib/renderSketch.ts`).
   - Builds the master prompt via `buildSketchPrompt()` (`src/lib/buildSketchPrompt.ts`) — concatenates: image-role manifest + zone instructions + context + brand brief + master system prompt.
   - POSTs sketch + product images + zone metadata to `/api/generate` (`app/api/generate+api.ts`).
5. The API route routes to OpenAI's `images.edit` (with `model: "gpt-image-1"`) or to fal.ai's Recraft V3, returns the image.

## Files of interest

| File | What it is |
| --- | --- |
| `src/data/templates.json` | All 1,203 section templates with full prompt text. |
| `src/data/categories.json` | Category names + per-category template counts. |
| `src/lib/buildSketchPrompt.ts` | Verbatim port of Twin Studio's master-prompt builder. |
| `src/lib/buildBriefPromptSection.ts` | Verbatim port of Twin Studio's brand-brief block formatter. |
| `src/lib/buildImagePositions.ts` | Builds the image-role manifest sent to the model. |
| `src/lib/renderSketch.ts` | Rasterises zones into the PNG layout sketch. |
| `app/api/generate+api.ts` | Server-side dispatcher → OpenAI gpt-image-1 / fal Recraft V3. |
| `app/index.tsx` | Main canvas-builder screen. |

## Notes & known limitations

- `gpt-image-1` requires an OpenAI org that has been verified for the model. If you see `403: Your organization is not verified to use this model`, see <https://platform.openai.com/account/organization>.
- The canvas in this clone uses a **stacked-zone model** (full-width strips) rather than free-form rectangles. Twin Studio supports both — extending to free-form is a follow-up.
- The product image is passed directly to the model. Twin Studio's pipeline relies on the master prompt instructing gpt-image-1 to extract brand identity from the product reference — there is no separate "analyze product" API call (verified by static analysis of the bundle).
- This project is for educational / personal use. Twin Studio's IP (their UI, brand, the template wording) belongs to them; the 1,203 prompt strings are reproduced under fair-use/research-purposes only.
