/**
 * POST /api/generate
 *
 * Twin Studio routes everything through their Supabase edge function
 * /functions/v1/edit-premium-image which then dispatches to either:
 *   - sketch_model: "gpt-image-2" → OpenAI gpt-image-1 (Ultimate, 350 cr)
 *   - sketch_model: "premium"     → Recraft V3 (Premium, 0.5K/1K/2K/4K)
 *
 * This route is the equivalent dispatcher. Both tiers run via fal.ai now:
 *   - Ultimate → fal-ai/gpt-image-1/edit-image (queue API, avoids the
 *     synchronous 90 s socket cap inside `npx expo serve`)
 *   - Premium  → fal-ai/recraft-v3 with a condensed <1000 char prompt
 *     (Recraft V3 rejects anything longer)
 */
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

const FAL_QUEUE_BASE = 'https://queue.fal.run';
const FAL_GPT_IMAGE_MODEL = 'fal-ai/gpt-image-1/edit-image';
const FAL_RECRAFT_MODEL = 'fal-ai/recraft-v3';

const FAL_POLL_INTERVAL_MS = 1500;
// The custom server (server.js) disables Node HTTP timeouts, so we can afford
// to wait long enough for gpt-image-1 via fal queue (typical p95 ~ 90 s).
const FAL_TOTAL_TIMEOUT_MS = 300_000;

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

interface FalSubmitResponse {
  request_id?: string;
  status_url?: string;
  response_url?: string;
  status?: string;
  detail?: unknown;
}

async function falSubmit(model: string, input: object): Promise<FalSubmitResponse> {
  if (!falKey) throw new Error('FAL_KEY is not configured');
  const r = await fetch(`${FAL_QUEUE_BASE}/${model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${falKey}`,
    },
    body: JSON.stringify(input),
  });
  const text = await r.text();
  let parsed: FalSubmitResponse;
  try {
    parsed = text ? (JSON.parse(text) as FalSubmitResponse) : {};
  } catch {
    parsed = { detail: text };
  }
  if (!r.ok) {
    const detail =
      typeof parsed.detail === 'string'
        ? parsed.detail
        : parsed.detail
          ? JSON.stringify(parsed.detail)
          : text;
    throw new Error(`fal.ai submit (${r.status}): ${detail}`);
  }
  return parsed;
}

async function falPollResult(
  statusUrl: string,
  responseUrl: string,
  totalTimeoutMs: number,
): Promise<Record<string, unknown>> {
  if (!falKey) throw new Error('FAL_KEY is not configured');
  const headers = { Authorization: `Key ${falKey}` };
  const deadline = Date.now() + totalTimeoutMs;

  while (Date.now() < deadline) {
    const s = await fetch(statusUrl, { headers });
    if (!s.ok) {
      const t = await s.text();
      throw new Error(`fal.ai status (${s.status}): ${t}`);
    }
    const data = (await s.json()) as { status?: string };
    if (data?.status === 'COMPLETED') {
      const rsp = await fetch(responseUrl, { headers });
      if (!rsp.ok) {
        const t = await rsp.text();
        throw new Error(`fal.ai response (${rsp.status}): ${t}`);
      }
      return (await rsp.json()) as Record<string, unknown>;
    }
    if (data?.status === 'FAILED' || data?.status === 'ERROR') {
      throw new Error(`fal.ai job failed: ${JSON.stringify(data)}`);
    }
    await new Promise((res) => setTimeout(res, FAL_POLL_INTERVAL_MS));
  }
  throw new Error(`fal.ai job timed out after ${totalTimeoutMs}ms`);
}

function pickImageUrlFromResult(result: Record<string, unknown>): string | null {
  const images = (result as { images?: Array<{ url?: string }> }).images;
  if (Array.isArray(images) && images[0]?.url) return images[0].url;
  const image = (result as { image?: { url?: string } }).image;
  if (image?.url) return image.url;
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

  // ── Ultimate tier → fal-ai/gpt-image-1/edit-image (queue API) ─────────────
  if (body.quality === 'ultimate') {
    if (!falKey) {
      return Response.json(
        {
          error:
            'FAL_KEY is not configured on the server. Ultimate is routed through fal.ai (fal-ai/gpt-image-1/edit-image) to avoid the 90 s synchronous timeout of the Expo runtime.',
          prompt,
        } satisfies GenerateResponse,
        { status: 500 },
      );
    }

    try {
      const size = pickGptImageSize(body.aspectRatio);
      const submitted = await falSubmit(FAL_GPT_IMAGE_MODEL, {
        prompt,
        image_urls: imageUrls,
        image_size: size,
        num_images: 1,
        quality: 'high',
        output_format: body.outputFormat === 'jpeg' ? 'jpeg' : body.outputFormat,
      });
      if (!submitted.status_url || !submitted.response_url) {
        throw new Error(`fal.ai submit returned no status/response url: ${JSON.stringify(submitted)}`);
      }
      const result = await falPollResult(
        submitted.status_url,
        submitted.response_url,
        FAL_TOTAL_TIMEOUT_MS,
      );
      const url = pickImageUrlFromResult(result);
      if (!url) throw new Error(`fal.ai returned no image url: ${JSON.stringify(result).slice(0, 400)}`);
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

      const submitted = await falSubmit(FAL_RECRAFT_MODEL, {
        prompt: condensedPrompt,
        image_size: pickRecraftSize(body.aspectRatio),
        style: 'realistic_image',
      });
      if (!submitted.status_url || !submitted.response_url) {
        throw new Error(`fal.ai submit returned no status/response url: ${JSON.stringify(submitted)}`);
      }
      const result = await falPollResult(
        submitted.status_url,
        submitted.response_url,
        FAL_TOTAL_TIMEOUT_MS,
      );
      const url = pickImageUrlFromResult(result);
      if (!url) throw new Error(`fal.ai returned no image url: ${JSON.stringify(result).slice(0, 400)}`);
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
