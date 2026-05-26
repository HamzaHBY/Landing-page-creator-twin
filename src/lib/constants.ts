import type { AspectRatio, OutputFormat, Quality, Resolution } from './types';

export const GPT_IMAGE_SIZES: Record<
  AspectRatio,
  { label: string; width: number; height: number; group: string }
> = {
  portrait_1_3: {
    label: '1:3 Max Vertical (1024×3072)',
    width: 1024,
    height: 3072,
    group: 'Vertical (Mobile)',
  },
  portrait_9_16: {
    label: '9:16 Mobile (1080×1920)',
    width: 1080,
    height: 1920,
    group: 'Vertical (Mobile)',
  },
  portrait_2_3: {
    label: '2:3 Portrait (1200×1800)',
    width: 1200,
    height: 1800,
    group: 'Vertical (Mobile)',
  },
  square_hd: {
    label: '1:1 HD (1024×1024)',
    width: 1024,
    height: 1024,
    group: 'Square',
  },
  landscape_3_2: {
    label: '3:2 Landscape (1800×1200)',
    width: 1800,
    height: 1200,
    group: 'Horizontal (Desktop)',
  },
  landscape_16_9: {
    label: '16:9 Cinematic (1920×1080)',
    width: 1920,
    height: 1080,
    group: 'Horizontal (Desktop)',
  },
  landscape_3_1: {
    label: '3:1 Panoramic (3072×1024)',
    width: 3072,
    height: 1024,
    group: 'Horizontal (Desktop)',
  },
};

export const QUALITY_OPTIONS: { value: Quality; label: string; description: string }[] = [
  {
    value: 'ultimate',
    label: 'Ultimate',
    description: 'OpenAI gpt-image-1 — highest fidelity, follows complex prompts precisely',
  },
  {
    value: 'premium',
    label: 'Premium',
    description: 'Recraft V3 — sharper rendering, configurable 1K / 2K / 4K resolution',
  },
];

export const ASPECT_OPTIONS = (
  Object.entries(GPT_IMAGE_SIZES) as [AspectRatio, (typeof GPT_IMAGE_SIZES)[AspectRatio]][]
).map(([value, v]) => ({ value, label: v.label, group: v.group }));

export const OUTPUT_FORMATS: { value: OutputFormat; label: string }[] = [
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP' },
];

export const RESOLUTION_OPTIONS: { value: Resolution; label: string }[] = [
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
];

// Zone palette — used to colorize the sketch (these are LAYOUT identifiers only;
// the prompt instructs the model to ignore them when picking the final palette).
export const ZONE_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
  '#F8C471',
  '#82E0AA',
  '#F1948A',
  '#85C1E9',
];

// Colors / theme
export const COLORS = {
  bg: '#0A0A0A',
  surface: '#111111',
  surfaceAlt: '#161616',
  border: '#222222',
  borderStrong: '#2E2E2E',
  text: '#ECECEC',
  textMuted: '#9A9A9A',
  textFaint: '#666666',
  primary: '#00CED1',
  primaryStrong: '#00B5B8',
  danger: '#FF6B6B',
  success: '#4ADE80',
  warn: '#F59E0B',
  cardHover: '#1A1A1A',
};
