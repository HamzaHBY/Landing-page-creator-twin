/**
 * Renders the canvas-builder zones into a PNG data URL, the same way Twin
 * Studio's canvas widget rasterises its layout before POSTing to
 * edit-premium-image.
 *
 * Output is a portrait/landscape image of `aspectRatio` filled top-to-bottom
 * with colored zones in zone order. Each zone gets its label, number and
 * section template name burned in. The model uses this as the layout sketch.
 */
import type { Zone, AspectRatio, SectionTemplate } from './types';
import { GPT_IMAGE_SIZES } from './constants';

export interface RenderSketchOptions {
  zones: Zone[];
  aspectRatio: AspectRatio;
  templates: SectionTemplate[];
  width?: number;
}

export function renderSketchDataUrl(opts: RenderSketchOptions): string {
  if (typeof document === 'undefined') {
    throw new Error('renderSketchDataUrl can only run in the browser');
  }
  const { zones, aspectRatio, templates, width } = opts;
  const target = GPT_IMAGE_SIZES[aspectRatio];
  const W = width ?? target.width;
  const H = Math.round((W * target.height) / target.width);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');

  // background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  const totalHeight = zones.reduce((acc, z) => acc + z.height, 0) || 1;

  let y = 0;
  for (const zone of zones) {
    const h = Math.round((zone.height / totalHeight) * H);

    ctx.fillStyle = zone.color;
    ctx.fillRect(0, y, W, h);

    ctx.strokeStyle = '#FFFFFFCC';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, y + 2, W - 4, h - 4);

    // label centered
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const tpl = zone.sectionId ? templates.find((t) => t.id === zone.sectionId) : undefined;
    const title = tpl ? `${zone.label} — ${tpl.name}` : zone.label;

    const numSize = Math.max(40, Math.round(h * 0.18));
    ctx.font = `bold ${numSize}px Inter, Arial, sans-serif`;
    ctx.fillText(`Zone ${zone.number}`, W / 2, y + h / 2 - numSize * 0.7);

    const titleSize = Math.max(22, Math.round(h * 0.07));
    ctx.font = `600 ${titleSize}px Inter, Arial, sans-serif`;
    ctx.fillText(title, W / 2, y + h / 2 + numSize * 0.2);

    if (zone.userText) {
      const txtSize = Math.max(16, Math.round(h * 0.05));
      ctx.font = `400 ${txtSize}px Inter, Arial, sans-serif`;
      const lines = wrapText(ctx, zone.userText, W - 80);
      lines.forEach((line, i) => {
        ctx.fillText(line, W / 2, y + h / 2 + numSize * 0.6 + i * txtSize * 1.3);
      });
    }

    y += h;
  }

  return canvas.toDataURL('image/png');
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}
