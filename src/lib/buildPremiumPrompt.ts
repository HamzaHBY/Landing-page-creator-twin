/**
 * Condensed prompt builder for the Premium tier (Recraft V3 via fal.ai).
 *
 * Recraft V3 caps prompts at 1000 characters, so we cannot reuse the full
 * 13.7k-char master prompt used by the Ultimate tier. This builder keeps the
 * essentials Twin Studio considers most important for layout fidelity:
 *
 *   - A short reminder that the sketch is layout-only
 *   - Country / language / brand-color overrides
 *   - The selected sections in order with optional user overrides
 *   - The optional global instruction
 *   - Minimal brand-brief fields
 *
 * The output is hard-capped to 950 characters as a final safety guard.
 */
import type { Zone, BrandBrief, SectionTemplate } from './types';

export interface BuildPremiumPromptArgs {
  zones: Zone[];
  templates: SectionTemplate[];
  country?: string;
  language?: string;
  primaryColor?: string;
  globalInstruction?: string;
  brief?: BrandBrief;
}

const MAX_PROMPT_CHARS = 950;
const MAX_OVERRIDE_CHARS = 70;
const MAX_GLOBAL_INSTRUCTION_CHARS = 140;

export function buildPremiumPrompt(args: BuildPremiumPromptArgs): string {
  const {
    zones,
    templates,
    country = '',
    language = '',
    primaryColor = '',
    globalInstruction = '',
    brief,
  } = args;

  const header =
    'High-converting landing page. Sketch is layout-only — do NOT copy its colors, text or people. Extract brand from product reference images, render new copy in target language.';

  const ctx: string[] = [];
  if (country) ctx.push(`Market: ${country}`);
  if (language) ctx.push(`Lang: ${language}`);
  if (primaryColor) ctx.push(`CTA color: ${primaryColor}`);
  if (brief?.productName) ctx.push(`Product: ${brief.productName}`);
  if (brief?.audienceAvatar) ctx.push(`Audience: ${brief.audienceAvatar}`);
  if (brief?.valueProp) ctx.push(`Value: ${brief.valueProp}`);

  const zoneLines = zones.map((z, idx) => {
    const tpl = z.sectionId ? templates.find((t) => t.id === z.sectionId) : undefined;
    const sectionName = tpl?.name || z.label || `Zone ${idx + 1}`;
    const override = (z.zoneInstruction || z.userText || '')
      .trim()
      .slice(0, MAX_OVERRIDE_CHARS);
    const num = z.number ?? idx + 1;
    return override ? `${num}. ${sectionName} — ${override}` : `${num}. ${sectionName}`;
  });

  const tail = globalInstruction
    ? `Notes: ${globalInstruction.trim().slice(0, MAX_GLOBAL_INSTRUCTION_CHARS)}`
    : '';

  const parts = [
    header,
    ctx.length ? ctx.join(' | ') : '',
    zoneLines.length ? `Sections (top→bottom):\n${zoneLines.join('\n')}` : '',
    tail,
  ].filter(Boolean);

  let prompt = parts.join('\n');

  if (prompt.length > MAX_PROMPT_CHARS) {
    prompt = prompt.slice(0, MAX_PROMPT_CHARS - 3) + '...';
  }
  return prompt;
}
