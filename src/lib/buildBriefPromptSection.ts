/**
 * Verbatim port of Twin Studio's buildBriefPromptSection (entry.js offset 7871984).
 * Formats the user's Brand Brief into a high-priority block injected into the
 * master prompt.
 */
import type { BrandBrief } from './types';

export function buildBriefPromptSection(o: BrandBrief): string {
  const t: string[] = [];

  if (o.visualStyle) t.push(`Visual style & vibe: ${o.visualStyle}`);

  const l: string[] = [];
  if (o.audienceAvatar) l.push(`Target audience: ${o.audienceAvatar}`);
  if (o.painPoint) l.push(`Pain point: ${o.painPoint}`);
  if (o.deepDesire) l.push(`Deep desire: ${o.deepDesire}`);
  if (l.length) t.push(l.join(' | '));

  if (o.productName) t.push(`Product name: ${o.productName}`);
  if (o.valueProp) t.push(`Value proposition: ${o.valueProp}`);

  const i = [o.benefit1, o.benefit2, o.benefit3].filter(Boolean) as string[];
  if (i.length)
    t.push(`Key benefits: ${i.map((b, k) => `(${k + 1}) ${b}`).join(', ')}`);

  const n = [o.step1, o.step2, o.step3].filter(Boolean) as string[];
  if (n.length)
    t.push(`How it works: ${n.map((s, k) => `Step ${k + 1}: ${s}`).join(' → ')}`);

  const s: string[] = [];
  if (o.anchorPrice) s.push(`Original price: ${o.anchorPrice} (strikethrough)`);
  if (o.actualPrice) s.push(`Offer price: ${o.actualPrice} (prominent)`);
  if (o.offerFormat) s.push(`Offer format: ${o.offerFormat}`);
  if (o.urgency) s.push(`Urgency/scarcity: ${o.urgency}`);
  if (s.length) t.push(s.join(' | '));

  if (!t.length) return '';

  return `─── BRAND BRIEF — MANDATORY PARAMETERS (HIGHEST PRIORITY) ───
${t.join('\n')}
⚠️ CRITICAL: Every parameter above is user-defined and must be respected precisely and consistently across every zone. These override all AI defaults.`;
}
