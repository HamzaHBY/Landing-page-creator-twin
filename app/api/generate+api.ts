/**
 * POST /api/generate
 *
 * Twin Studio routes everything through their Supabase edge function
 * /functions/v1/edit-premium-image which then dispatches to either:
 *   - sketch_model: "gpt-image-2" → OpenAI gpt-image-1 (Ultimate, 350 cr)
 *   - sketch_model: "premium"     → Recraft V3 (Premium, 0.5K/1K/2K/4K)
 *
 * This route is the equivalent dispatcher. Both tiers run via fal.ai now:
 *   - Ultimate → fal-ai/gpt-image-1/edit-image (queue API via @fal-ai/client,
 *     avoids the 90 s synchronous timeout of OpenAI's direct path through
 *     the Expo runtime)
 *   - Premium  → fal-ai/recraft-v3 with a condensed <1000 char prompt
 *     (Recraft V3 rejects anything longer)
 *
 * Any input data: URLs are first uploaded to fal.storage so they end up as
 * https:// URLs (the fal queue's image-download worker doesn't accept data
 * URIs in image_urls).
 */
import { fal } from '@fal-ai/client';
import { buildSketchPrompt } from '../../src/lib/buildSketchPrompt';
import { buildPremiumPrompt } from '../../src/lib/buildPremiumPrompt';
import { buildImagePositions } from '../../src/lib/buildImagePositions';
import templatesData from '../../src/data/templates.json';
import type {
  GenerateRequest,
  GenerateResponse,
  SectionTemplate,
  AspectRatio,
} from '../../src/lib/types';
import { GPT_IMAGE_SIZES } from '../../src/lib/constants';

const TEMPLATES = templatesData as unknown as SectionTemplate[];

const falKey = process.env.FAL_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (falKey) {
  fal.config({ credentials: falKey });
}

const FAL_GPT_IMAGE_MODEL = 'fal-ai/gpt-image-1/edit-image';
const FAL_RECRAFT_MODEL = 'fal-ai/recraft-v3';

function pickGptImageSize(aspectRatio: AspectRatio): '1024x1024' | '1024x1536' | '1536x1024' {
  const a = GPT_IMAGE_SIZES[aspectRatio];
  if (!a) return '1024x1536';
  if (a.width === a.height) return '1024x1024';
  return a.height > a.width ? '1024x1536' : '1536x1024';
}

function pickRecraftSize(aspectRatio: AspectRatio): string {
  const a = GPT_IMAGE_SIZES[aspectRatio];
  if (!a) return 'portrait_16_9';
  if (a.width === a.height) return 'square_hd';
  if (a.height > a.width) return a.height / a.width >= 1.6 ? 'portrait_16_9' : 'portrait_4_3';
  return a.width / a.height >= 1.6 ? 'landscape_16_9' : 'landscape_4_3';
}

function dataUrlToBlob(dataUrl: string): Blob {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) throw new Error('expected base64 data URL');
  const mime = m[1];
  const buffer = Buffer.from(m[2], 'base64');
  return new Blob([new Uint8Array(buffer)], { type: mime });
}

async function ensureHttpsUrl(url: string, name: string): Promise<string> {
  if (url.startsWith('data:')) {
    const blob = dataUrlToBlob(url);
    const uploaded = await fal.storage.upload(blob);
    return uploaded;
  }
  return url;
}

function pickImageUrlFromResult(data: unknown): string | null {
  const obj = data as { images?: Array<{ url?: string }>; image?: { url?: string } };
  if (Array.isArray(obj.images) && obj.images[0]?.url) return obj.images[0].url;
  if (obj.image?.url) return obj.image.url;
  return null;
}

export async function POST(req: Request): Promise<Response> {
  let body: GenerateRequest;
  try {
    body = (await req.json()) as GenerateRequest;
  } catch {
    return Response.json(
      { error: 'invalid JSON', prompt: '' } satisfies GenerateResponse,
      { status: 400 },
    );
  }

  // ── 1. assemble the image list + positions manifest ───────────────────────
  const productImages = body.productImageUrls.map((url, i) => ({
    id: `prod-${i}`,
    url,
    name: `product-${i + 1}`,
  }));

  const { positions, imageUrls } = buildImagePositions({
    sketchUrl: body.sketchDataUrl,
    productImages,
    zones: body.zones,
    globalInspirationUrl: body.globalInspirationUrl,
  });

  // ── 2. build the master prompt (verbatim Twin Studio logic) ───────────────
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

  // ── Ultimate tier → fal-ai/gpt-image-1/edit-image ─────────────────────────
  if (body.quality === 'ultimate') {
    if (!falKey) {
      return Response.json(
        {
          error:
            'FAL_KEY is not configured on the server. Ultimate is routed through fal.ai (fal-ai/gpt-image-1/edit-image).',
          prompt,
        } satisfies GenerateResponse,
        { status: 500 },
      );
    }

    try {
      // Upload any data: URIs to fal.storage so the queue worker can fetch them
      const hostedUrls = await Promise.all(
        imageUrls.map((u, i) => ensureHttpsUrl(u, `img-${i}.png`)),
      );

      const size = pickGptImageSize(body.aspectRatio);
      const outputFormat =
        body.outputFormat === 'jpeg' ? 'jpeg' : body.outputFormat === 'webp' ? 'webp' : 'png';

      const result = await fal.subscribe(FAL_GPT_IMAGE_MODEL, {
        input: {
          prompt,
          image_urls: hostedUrls,
          image_size: size,
          num_images: 1,
          quality: 'high',
          output_format: outputFormat,
        },
      });

      const url = pickImageUrlFromResult(result.data);
      if (!url) {
        throw new Error(
          `fal.ai returned no image url: ${JSON.stringify(result.data).slice(0, 400)}`,
        );
      }
      return Response.json({ imageUrl: url, prompt } satisfies GenerateResponse);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return Response.json(
        { error: message, prompt } satisfies GenerateResponse,
        { status: 500 },
      );
    }
  }

  // ── Premium tier → Recraft V3 via fal.ai (condensed <1000 char prompt) ────
  if (body.quality === 'premium') {
    if (!falKey) {
      return Response.json(
        {
          error: 'FAL_KEY is not configured. Add a fal.ai API key to use the Premium (Recraft V3) tier.',
          prompt,
        } satisfies GenerateResponse,
        { status: 500 },
      );
    }

    try {
      const condensedPrompt = buildPremiumPrompt({
        zones: body.zones,
        templates: TEMPLATES,
        country: body.country,
        language: body.language,
        primaryColor: body.primaryColor,
        globalInstruction: body.globalInstruction,
        brief: body.brief,
      });

      const result = await fal.subscribe(FAL_RECRAFT_MODEL, {
        input: {
          prompt: condensedPrompt,
          image_size: pickRecraftSize(body.aspectRatio),
          style: 'realistic_image',
        },
      });

      const url = pickImageUrlFromResult(result.data);
      if (!url) {
        throw new Error(
          `fal.ai returned no image url: ${JSON.stringify(result.data).slice(0, 400)}`,
        );
      }
      return Response.json({ imageUrl: url, prompt } satisfies GenerateResponse);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return Response.json(
        { error: message, prompt } satisfies GenerateResponse,
        { status: 500 },
      );
    }
  }

  return Response.json(
    { error: 'unknown quality', prompt } satisfies GenerateResponse,
    { status: 400 },
  );
}

export async function GET(): Promise<Response> {
  return Response.json({
    ok: true,
    hasOpenAI: Boolean(openaiKey),
    hasFal: Boolean(falKey),
    templates: TEMPLATES.length,
  });
}
