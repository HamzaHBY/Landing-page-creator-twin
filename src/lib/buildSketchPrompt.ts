/**
 * Verbatim port of Twin Studio's buildSketchPrompt (entry.js offset 7944042).
 * Assembles the master prompt that is sent to gpt-image-1.
 *
 * The original signature is:
 *   buildSketchPrompt(mode, zones, prompts, zoneInstructions, country, language,
 *                    brandColors, primaryColor, imagePositions, globalInstruction,
 *                    enabledTemplates, brandName)
 *
 * We keep the same structure so the prompt text is byte-identical to what
 * Twin Studio produces for canvas-builder mode.
 */
import type { Zone, BrandBrief, ImagePositions, SectionTemplate } from './types';
import { buildBriefPromptSection } from './buildBriefPromptSection';

export interface BuildSketchPromptArgs {
  mode: 'canvas-builder' | 'precision-edit';
  zones: Zone[];
  templates: SectionTemplate[];                       // full catalogue (so we can look up by id)
  country?: string;
  language?: string;
  primaryColor?: string;                              // dominant accent color override
  brandColorsEnabled?: boolean;                       // l
  imagePositions: ImagePositions;
  globalInstruction?: string;
  brief?: BrandBrief;
  brandName?: string;                                 // K — typically unset; brief.productName takes precedence
  enabledTemplateZoneIds?: Set<string>;               // E — if set, only zones in this set apply their template's defaultPrompt
}

export function buildSketchPrompt(args: BuildSketchPromptArgs): string {
  const {
    mode,
    zones,
    templates,
    country = '',
    language = '',
    primaryColor = '',
    brandColorsEnabled = false,
    imagePositions: h,
    globalInstruction = '',
    brief,
    enabledTemplateZoneIds: E,
  } = args;

  // f — map of zoneId → user text annotation (Twin Studio: prompts.map(e=>[e.zoneId, e.text.trim()]))
  const f = new Map<string, string>(
    zones.map((z) => [z.id, (z.userText || '').trim()])
  );

  // T — per-zone instruction strings
  const T = zones.map((zone, idx) => {
    const n = (zone.zoneInstruction || '').trim();   // user's explicit override
    const i = f.get(zone.id) || '';                  // canvas text annotation
    const s = zone.label || `Zone ${zone.number ?? idx + 1}`;
    const l = zone.number ?? idx + 1;

    // template.defaultPrompt — pulled from the 1,203-template catalogue
    let c = '';
    if (zone.sectionId) {
      const t = templates.find((x) => x.id === zone.sectionId);
      const allowed = !E || E.has(zone.id);
      if (t && allowed) c = t.prompt;
    }

    // Layout-only inspiration block
    const p = h.inspirationImages.find(
      (e) => e.zoneLabel === s || e.zoneNumber === l
    );
    let u = '';
    if (p) {
      u =
        ` [LAYOUT REFERENCE: Image ${p.position} shows the desired spatial organisation, element placement and internal spacing for this zone ONLY. Copy the layout skeleton — how elements are arranged, their relative sizes, and the spacing rhythm. ABSOLUTELY FORBIDDEN: do NOT extract, replicate or be influenced by the colors, brand identity, products, logos, photographs, or any textual content of that inspiration image. It is a structural wireframe reference, nothing more.]`;
    }

    // Content image block (image rendered as content inside the zone)
    const T2 = h.contentImages.find((e) => e.zoneLabel === s);
    let y = '';
    if (T2) {
      y = ` [DISPLAY IMAGE: Image ${T2.position} must be visually present inside this zone as a content element — place it naturally within the zone design.]`;
    }

    const I = [
      n ? `[🔴 USER PRIORITY — ABSOLUTE OVERRIDE]: ${n}` : '',
      c,
      i,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      (I
        ? `  Zone ${l} — "${s}": ${I}`
        : `  Zone ${l} — "${s}": (no specific instruction — apply best practices for this section type)`) +
      u +
      y
    );
  });

  // Context line
  const y = [country ? `Target market: ${country}` : '', language ? `Language: ${language}` : '']
    .filter(Boolean)
    .join(' | ');

  // Color override line
  const I =
    brandColorsEnabled && primaryColor
      ? `Dominant accent color override: ${primaryColor} — use this as the primary CTA and focal-point color.`
      : '';

  // Brand brief block
  const A = brief ? buildBriefPromptSection(brief) : '';

  // Product reference / inference line
  const R =
    h.productPositions.length > 0
      ? `BRAND EXTRACTION: Product/brand reference images (${h.productPositions
          .map((e) => `Image ${e}`)
          .join(
            ', '
          )}) contain the real product and brand identity. Extract the exact brand palette, visual style, product details and target audience cues. Every zone must feel native to this brand.`
      : 'Infer the product and brand identity from zone instructions and context. Invent a coherent, premium brand identity that maximises trust and desire.';

  // Precision-edit mode short-circuit
  if (mode === 'precision-edit') {
    return [
      'Apply precise, targeted modifications to the uploaded reference image.',
      'Preserve the overall composition, lighting and style. Only modify the areas specified below.',
      T.length > 0
        ? `ZONE EDITS (apply precisely, do NOT alter anything outside these zones):\n${T.join('\n')}`
        : '',
      y,
      I,
      'Ultra-high quality, photorealistic, seamless edits.',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  // Image role manifest — built dynamically based on what's attached
  const imageRoleManifest = (() => {
    const e: string[] = [];
    e.push(
      `Image ${h.sketchPosition}: LAYOUT SKETCH — defines zone structure, proportions and order ONLY. Reproduce dimensions faithfully.`
    );
    for (const t of h.productPositions) {
      e.push(
        `Image ${t}: PRODUCT / BRAND REFERENCE — extract brand identity (colors, product visuals, logo, style) and apply it throughout the ENTIRE page. This is the source of brand truth.`
      );
    }
    for (const t of h.contentImages) {
      e.push(
        `Image ${t.position}: CONTENT IMAGE for zone "${t.zoneLabel}" — render this image INSIDE the zone as a visual content element.`
      );
    }
    for (const t of h.inspirationImages) {
      e.push(
        `Image ${t.position}: ⛔ LAYOUT-ONLY INSPIRATION for zone "${t.zoneLabel}" — use SOLELY to understand spatial layout, internal element arrangement and spacing proportions of this zone. ⛔ STRICTLY FORBIDDEN: do NOT use the colors, branding, products, photographs, illustrations, logos or any text content from this image anywhere in the output. It is an invisible structural wireframe reference.`
      );
    }
    if (h.globalInspirationPosition != null) {
      e.push(
        `Image ${h.globalInspirationPosition}: ⛔ GLOBAL LAYOUT INSPIRATION — use ONLY to understand the overall design aesthetic, spacing rhythm, and visual hierarchy of the ENTIRE page. ⛔ STRICTLY FORBIDDEN: do NOT copy colors, products, logos, typography, photographs or any brand elements from this image. It is a structural mood reference only.`
      );
    }
    return e.join('\n');
  })();

  // Canvas-builder master prompt — VERBATIM port from Twin Studio's bundle
  return `You are an elite creative director with 20+ years of experience in high-converting landing page design, performance media buying and applied neuromarketing. Your task: produce one single, cohesive landing page image — pixel-perfect, publication-ready.

╔══════════════════════════════════════════════════════════════════╗
║  ⛔ RULE #0 — SKETCH IMAGE IS LAYOUT ONLY — READ BEFORE ANYTHING ELSE  ⛔  ║
╚══════════════════════════════════════════════════════════════════╝

The image(s) labelled "Image 1", "Image 2", "Image 3", etc. that show a sketch, wireframe or numbered zone layout (containing labels like "Zone 1", "Zone 2", or section names) are EXCLUSIVELY layout blueprints. They communicate ONE thing only: the structural organisation of sections on the page.

⛔ YOU MUST NEVER — under any circumstances — do any of the following with a layout sketch image:
  1. COPY OR DISPLAY any product shown in the sketch. The sketch product is a PLACEHOLDER. Replace it entirely with the REAL product from the product reference images.
  2. COPY OR DISPLAY any text, numbers, words, labels, prices, or copy from the sketch. Every piece of text in the final image must be freshly AI-generated for the target market.
  3. COPY OR DISPLAY any person, face, model, or character from the sketch. The people in sketches are structural placeholders — they define layout composition only.
  4. COPY any color, gradient, brand identity, logo, or visual style from the sketch. Style comes exclusively from the product reference images and zone instructions.
  5. COPY any photograph, illustration, or graphical content that appears inside the sketch zones. All visuals must be generated from scratch.

✅ The ONLY things you extract from the layout sketch are:
  • Number of sections and their vertical order (top → bottom)
  • Proportional height of each section relative to the total page height
  • General spatial arrangement within each section (text left / image right, etc.)
  • Whether a section is hero, testimonial, CTA, features grid, before/after, etc.

⛔ PEOPLE & CHARACTERS — ABSOLUTE RULE:
If the layout sketch contains any human figures, faces, or models, those are placeholder silhouettes that define composition positions only. You MUST:
  • NEVER reproduce those same people or their appearance in the output.
  • ALWAYS create entirely new, original people who are authentically from the TARGET COUNTRY (${country || 'the target market'}).
  • Adapt the people's ethnicity, style, age, and appearance to match the culture and demographic of the target market AND the product type being advertised.
  • Characters must feel like real, relatable people from that specific culture — not generic stock models.

⛔ PRODUCT TYPE ADAPTATION — MANDATORY:
The generated landing page MUST be fully adapted to the type of product being advertised (skincare, fashion, food, tech, fitness, etc.). Every visual decision — imagery style, color psychology, typography, layout density, proof elements — must feel native to that product category and its target audience.

THIS RULE OVERRIDES ALL OTHER INSTRUCTIONS. Any violation of Rule #0 is a CRITICAL GENERATION FAILURE.
══════════════════════════════════════════════════════════════════

🚨🚨🚨 PRODUCT PACKAGING & TEXT — ABSOLUTE NON-NEGOTIABLE RULE 🚨🚨🚨
PRODUCT/BRAND REFERENCE IMAGES MUST BE REPRODUCED WITH 100% FIDELITY — ZERO EXCEPTIONS:

1. TEXT ON PRODUCT PACKAGING: NEVER translate, modify, replace, remove, or alter ANY text, letters, words, numbers, or characters printed on the product or its packaging. If the product label says "SHAMPOO REPAIR" in English, it MUST remain "SHAMPOO REPAIR" in English — regardless of the target language (${language}). The AI MUST NOT translate product text into ${language} or any other language. Product text is SACRED and UNTOUCHABLE.
2. LOGOS & BRAND MARKS ON PRODUCT: Reproduce EXACTLY — same shape, same font, same color, same size, same placement. Zero deviation.
3. PRODUCT COLORS: Every color on the product must match EXACTLY — same hue, same saturation, same brightness. No adaptation, no substitution.
4. PRODUCT SHAPE & FORM: Identical silhouette, proportions, and 3D form. No simplification, no distortion.
5. TEXTURES & MATERIALS: Same finish (matte/glossy/metallic/transparent), same surface texture, same material appearance.
6. PRODUCT INFORMATION: All ingredient lists, nutritional facts, barcodes, certification marks, legal text — KEEP IDENTICAL. Do not remove, blur, or replace.
7. GRAPHIC ELEMENTS ON PRODUCT: Every stripe, pattern, gradient, icon, illustration, or decorative element on the product surface — UNCHANGED.

CRITICAL DISTINCTION: The target language (${language}) applies ONLY to AI-generated marketing copy, headlines, CTAs, and body text that you create for the landing page — it NEVER applies to existing text already printed ON THE PRODUCT ITSELF. Product text is pre-existing reality that must be cloned perfectly.
ANY modification to the product's text, logo, colors, or packaging is a CRITICAL FAILURE.
🚨🚨🚨 END PRODUCT RULE 🚨🚨🚨

━━━ ATTACHED IMAGES — READ THIS FIRST ━━━
${imageRoleManifest}

⚠️ ABSOLUTE RULE — IMAGE ROLE SEPARATION:
Each image above has ONE specific role. Mixing roles is a critical error. In particular:
• Layout inspiration images are INVISIBLE to the end user — they define structure only, never content or style
• Product/brand images are the ONLY source of brand colors, products and identity
• Content images must appear as visual elements inside their assigned zone
• The canvas sketch defines STRUCTURE only, never colors or style

⚠️ CRITICAL RULE — DO NOT APPLY CANVAS ZONE COLORS TO THE IMAGE:
The numbered zones on the sketch canvas have colored backgrounds — these are ONLY layout identifiers. They are NOT the colors of the landing page. Generate your own cohesive brand-derived palette.

⚠️ CRITICAL RULE — UNIFIED PAGE, NOT PER-ZONE DESIGN:
Design ONE complete landing page with a single unified vision. Establish the GLOBAL design system first (brand colors, font families, spacing rhythm), then apply it consistently across every zone.

━━━ STEP 1 · CANVAS LAYOUT ━━━
Image ${h.sketchPosition} is the layout sketch. Numbered zones define sections top to bottom. Their vertical proportions and order are FIXED — reproduce them exactly.

━━━ STEP 2 · BRAND & PRODUCT INTELLIGENCE ━━━
${R}
⚠️ MANDATORY — IDENTIFY PRODUCT CATEGORY FIRST: Before writing any copy or generating any visual, explicitly determine:
  1. What is the product? (e.g. anti-wrinkle face cream, hair serum, dietary supplement, etc.)
  2. What specific problem does it solve? (e.g. wrinkles/skin aging, hair loss, excess weight, etc.)
  3. What specific body part or area is treated? (e.g. face skin, scalp, teeth, body, etc.)
  4. What is the target customer profile? (age, gender, pain points)
All visuals, before/after images, and people photos generated later MUST be coherent with answers 2 and 3.
Extract: primary color, secondary color, typographic voice, imagery style, target customer. Apply this identity consistently across every zone.

━━━ STEP 3 · NEUROMARKETING & CONVERSION DESIGN ━━━
- Visual hierarchy: guide the eye headline → proof → CTA using size, contrast and whitespace
- Color psychology: CTA buttons in high-contrast warm color (unless overridden below), trust elements in cool/neutral tones
- Directional cues: use imagery, arrows or spatial flow to push attention toward conversion elements
- Social proof anchoring: position numbers/logos/faces near CTAs to reduce friction
- Generous white space — premium brands breathe; never cramped
- Consistent 8-pt spacing grid across all zones

━━━ STEP 4 · ELITE COPYWRITING ━━━
- Headlines: 3–8 ultra-powerful words — trigger desire, solve pain, spark curiosity
- CTA buttons: imperative verb + specific outcome ("Get Instant Access", "Start Free Today")
- Social proof: always use specific numbers ("47,293 customers", "4.9 / 5 ★ · 2,400 reviews")
- Zero filler: "innovative", "solutions", "synergy" are BANNED

━━━ STEP 5 · VISUAL COHERENCE (MANDATORY) ━━━
- Consistent color palette (3–4 colors max, derived from brand) — same palette in EVERY zone
- Max 2 font families — one display, one body — same fonts in EVERY zone
- Seamless background transitions between zones
- Every section must feel designed by the same hand

🚨🚨🚨 ABSOLUTE RULE — ZERO WHITE GAPS BETWEEN SECTIONS 🚨🚨🚨
The final image must be a single, seamless, full-bleed composition from the very top pixel to the very bottom pixel. STRICTLY FORBIDDEN:
- Any white strip, white band, white margin, or white gap between sections
- Any empty/blank row of pixels separating one zone from the next
- Any padding, gutter, or white space at the top, bottom, or between sections of the image
- Any section whose background does not extend fully to its edges
- Any "seam" or visible border line between sections

✅ MANDATORY RULES for background continuity:
1. Every section's background color or gradient MUST fill 100% of that section's pixel area — edge to edge, top to bottom, left to right — with ZERO white or transparent pixels at the boundaries
2. Adjacent sections must transition directly into each other: the last pixel row of section N must be immediately followed by the first pixel row of section N+1 with no gap whatsoever
3. If sections share the same background color, they blend seamlessly. If they have different backgrounds, the transition is a hard or soft edge — but NEVER a white gap
4. The overall image background must be fully covered — no white canvas showing through anywhere
5. Treat the entire image canvas as a single filled rectangle where every pixel belongs to a designed section

Any white gap, strip, or empty space between sections is a CRITICAL GENERATION FAILURE.
🚨🚨🚨 END ZERO-GAP RULE 🚨🚨🚨

━━━ ZONE INSTRUCTIONS — ABSOLUTE PRIORITY ━━━
These override all guidelines above:
${T.join('\n')}

━━━ CONTEXT ━━━
${[y, I].filter(Boolean).join('\n')}

${A ? A + '\n\n' : ''}${globalInstruction ? `━━━ GLOBAL INSTRUCTION ━━━\n${globalInstruction}\n\n` : ''}⚠️ ABSOLUTE RULE — NO NAVIGATION BAR, NO HEADER BAR, NO FOOTER BAR:
Do NOT add any top navigation bar, site menu, hamburger menu, or sticky header unless a zone is explicitly labelled "header" or "navigation". Do NOT add any footer bar, copyright strip, or bottom links unless a zone is explicitly labelled "footer". Only render what the zone instructions request. Adding unrequested UI chrome is a CRITICAL FAILURE.

🚨🚨🚨 ABSOLUTE RULE — NEVER ADD UNREQUESTED SECTIONS 🚨🚨🚨
You MUST generate ONLY the zones that exist in the layout sketch. NEVER invent, add, or inject any additional section, block, panel, or visual element that is not explicitly defined by a numbered zone in the sketch. This includes:
- Do NOT add extra testimonial blocks not in the sketch
- Do NOT add FAQ sections not in the sketch
- Do NOT add feature grids not in the sketch
- Do NOT add any section "because it would look good" or "to complete the page"
- The number of sections in the output MUST exactly match the number of zones in the sketch — no more, no less
Adding any unrequested section or content block is a CRITICAL GENERATION FAILURE.
🚨🚨🚨 END NO-EXTRA-SECTIONS RULE 🚨🚨🚨

🚨🚨🚨 ABSOLUTE RULE — PRODUCT-COHERENT VISUALS (BEFORE/AFTER, PEOPLE, COMPARISONS) 🚨🚨🚨
STEP 0 — BEFORE GENERATING ANY VISUAL: Identify the EXACT product category and its core problem/solution from the product reference images and zone instructions.

Examples of correct product-visual coherence:
• Anti-wrinkle face cream → before/after shows SKIN / WRINKLES, people images show FACES with skin improvement
• Teeth whitening product → before/after shows TEETH, people images show MOUTHS / SMILES
• Hair growth serum → before/after shows HAIR / SCALP, people images show HAIR
• Weight loss supplement → before/after shows BODY / BELLY, people images show BODY TRANSFORMATION
• Acne treatment → before/after shows FACE SKIN with pimples vs clear skin

⛔ CRITICAL COHERENCE RULE: Every visual element — before/after comparison, person photo, result image, testimonial photo — MUST directly illustrate the specific problem that the product solves and the specific result it delivers.

FORBIDDEN ERRORS (these are CRITICAL FAILURES):
- Showing teeth before/after for a SKIN CREAM — the skin cream solves skin problems, NOT dental problems
- Showing hair results for a weight loss product
- Showing body transformation for a face serum
- Using ANY before/after imagery that does not directly match the product's specific benefit
- Using people photos that do not show the relevant body part or transformation area

✅ MANDATORY PROCESS for before/after sections:
1. First identify: What body part or area does this product treat?
2. Then generate: Before/after images showing EXACTLY that body part with the problem BEFORE and the improvement AFTER
3. The transformation shown must be the EXACT transformation the product claims to deliver

This rule has ZERO exceptions. A before/after image that does not match the product's benefit is a CRITICAL GENERATION FAILURE that completely destroys the ad's credibility.
🚨🚨🚨 END PRODUCT-COHERENT VISUALS RULE 🚨🚨🚨

OUTPUT REQUIREMENTS: Ultra-high resolution, photorealistic quality. No lorem ipsum. No placeholder shapes. No borders or device frames. Final pixel-perfect landing page image only.`;
}
