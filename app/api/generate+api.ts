/**
 * POST /api/generate
 *
 * Twin Studio routes everything through their Supabase edge function
 * /functions/v1/edit-premium-image which then dispatches to either:
 *   - sketch_model: "gpt-image-2" → OpenAI gpt-image-1 (Ultimate, 350 cr)
 *   - sketch_model: "premium"     → Recraft V3 (Premium, 0.5K/1K/2K/4K)
 *
 * This route is the equivalent dispatcher, sitting on top of the OpenAI SDK
 * (and optionally fal.ai for Recraft V3 / fal-routed gpt-image-1).
 */
import OpenAI from 'openai';
import { buildSketchPrompt } from '../../src/lib/buildSketchPrompt';
import { buildImagePositions } from '../../src/lib/buildImagePositions';
import templatesData from '../../src/data/templates.json';
import type {
  GenerateRequest,
  GenerateResponse,
  SectionTemplate,
} from '../../src/lib/types';
import { GPT_IMAGE_SIZES } from '../../src/lib/constants';

const TEMPLATES = templatesData as unknown as SectionTemplate[];

const openaiKey = process.env.OPENAI_API_KEY;
const falKey = process.env.FAL_KEY;

const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mime: string } {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) throw new Error('sketchDataUrl must be a base64 data URL');
  return { mime: m[1], buffer: Buffer.from(m[2], 'base64') };
}

function bufferToFile(buffer: Buffer, mime: string, name: string): File {
  return new File([new Uint8Array(buffer)], name, { type: mime });
}

async function fetchAsFile(url: string, index: number): Promise<File> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`failed to fetch image ${index}: ${r.status}`);
  const blob = await r.blob();
  const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
  return new File([blob], `ref-${index}.${ext}`, { type: blob.type || 'image/png' });
}

function pickGptImageSize(aspectRatio: string): '1024x1024' | '1024x1536' | '1536x1024' {
  const a = GPT_IMAGE_SIZES[aspectRatio as keyof typeof GPT_IMAGE_SIZES];
  if (!a) return '1024x1536';
  if (a.width === a.height) return '1024x1024';
  return a.height > a.width ? '1024x1536' : '1536x1024';
}

export async function POST(req: Request): Promise<Response> {
  let body: GenerateRequest;
  try {
    body = (await req.json()) as GenerateRequest;
  } catch {
    return Response.json({ error: 'invalid JSON', prompt: '' } satisfies GenerateResponse, { status: 400 });
  }

  // ── 1. assemble the image list + positions manifest ────────────────────────
  const productImages = body.productImageUrls.map((url, i) => ({
    id: `prod-${i}`,
    url,
    name: `product-${i + 1}`,
  }));

  const { positions, imageUrls } = buildImagePositions({
    sketchUrl: 'memory://sketch',
    productImages,
    zones: body.zones,
    globalInspirationUrl: body.globalInspirationUrl,
  });

  // ── 2. build the master prompt (verbatim Twin Studio logic) ────────────────
  const prompt = buildSketchPrompt({
    mode: 'canvas-builder',
    zones: body.zones,
    templates: TEMPLATES,
    country: body.country,
    language: body.language,
    primaryColor: body.primaryColor,
    brandColorsEnabled: Boolean(body.primaryColor),
    imagePositions: positions,
    globalInstruction: body.globalInstruction,
    brief: body.brief,
  });

  if (body.quality === 'ultimate') {
    if (!openai) {
      return Response.json(
        {
          error:
            'OPENAI_API_KEY is not configured on the server. Add it to .env or your deployment environment.',
          prompt,
        } satisfies GenerateResponse,
        { status: 500 },
      );
    }

    try {
      // gather files: index 0 is the canvas sketch (from data URL),
      // index 1..N pulled from imageUrls (skip "memory://sketch")
      const sketch = dataUrlToBuffer(body.sketchDataUrl);
      const files: File[] = [bufferToFile(sketch.buffer, sketch.mime, 'sketch.png')];
      for (let i = 1; i < imageUrls.length; i++) {
        files.push(await fetchAsFile(imageUrls[i], i));
      }

      const size = pickGptImageSize(body.aspectRatio);

      const resp = await openai.images.edit({
        model: 'gpt-image-1',
        image: files,
        prompt,
        size,
        n: 1,
      });

      const b64 = resp.data?.[0]?.b64_json;
      if (!b64) throw new Error('OpenAI returned no image data');

      const ext = body.outputFormat === 'png' ? 'png' : body.outputFormat === 'webp' ? 'webp' : 'jpeg';
      return Response.json({
        imageBase64: `data:image/${ext};base64,${b64}`,
        prompt,
      } satisfies GenerateResponse);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return Response.json({ error: message, prompt } satisfies GenerateResponse, { status: 500 });
    }
  }

  // ── Premium tier → Recraft V3 via fal.ai ───────────────────────────────────
  if (body.quality === 'premium') {
    if (!falKey) {
      return Response.json(
        {
          error:
            'FAL_KEY is not configured. Add a fal.ai API key to use the Premium (Recraft V3) tier.',
          prompt,
        } satisfies GenerateResponse,
        { status: 500 },
      );
    }
    try {
      const r = await fetch('https://fal.run/fal-ai/recraft-v3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Key ${falKey}`,
        },
        body: JSON.stringify({
          prompt,
          image_size: body.aspectRatio === 'portrait_1_3' ? 'portrait_4_3' : 'portrait_16_9',
          style: 'realistic_image',
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || `fal.ai returned ${r.status}`);
      const url = j?.images?.[0]?.url;
      if (!url) throw new Error('fal.ai returned no image url');
      return Response.json({ imageUrl: url, prompt } satisfies GenerateResponse);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return Response.json({ error: message, prompt } satisfies GenerateResponse, { status: 500 });
    }
  }

  return Response.json({ error: 'unknown quality', prompt } satisfies GenerateResponse, {
    status: 400,
  });
}

export async function GET(): Promise<Response> {
  return Response.json({
    ok: true,
    hasOpenAI: Boolean(openaiKey),
    hasFal: Boolean(falKey),
    templates: TEMPLATES.length,
  });
}
