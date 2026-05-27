/**
 * Picks a default landing-page section lineup, matching Twin Studio's
 * auto-generation behaviour: the canvas opens with a sensible 6-section
 * funnel (Hero → Problem → Solution → Social Proof → How It Works → CTA)
 * instead of an empty editor.
 *
 * Templates are randomized within each category so the user gets variety
 * across loads. The first section is always a Hero so the page has a
 * proper top.
 */
import { ZONE_COLORS } from './constants';
import type { SectionTemplate, Zone } from './types';

const DEFAULT_FUNNEL: ReadonlyArray<{ category: string; height: number }> = [
  { category: 'Hero Section', height: 0.42 },
  { category: 'Problem Agitation', height: 0.28 },
  { category: 'The Solution', height: 0.3 },
  { category: 'How It Works', height: 0.28 },
  { category: 'Social Proof', height: 0.28 },
  { category: 'CTA', height: 0.22 },
];

function randId(): string {
  return `z-${Math.random().toString(36).slice(2, 10)}`;
}

function pickRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickDefaultZones(templates: SectionTemplate[]): Zone[] {
  const byCategory = new Map<string, SectionTemplate[]>();
  for (const tpl of templates) {
    const arr = byCategory.get(tpl.category) || [];
    arr.push(tpl);
    byCategory.set(tpl.category, arr);
  }

  const zones: Zone[] = [];
  let i = 0;
  for (const slot of DEFAULT_FUNNEL) {
    const pool = byCategory.get(slot.category) || [];
    const tpl = pickRandom(pool);
    if (!tpl) continue;
    zones.push({
      id: randId(),
      number: i + 1,
      label: tpl.name,
      height: tpl.height || slot.height,
      sectionId: tpl.id,
      color: ZONE_COLORS[i % ZONE_COLORS.length],
    });
    i += 1;
  }
  return zones;
}
