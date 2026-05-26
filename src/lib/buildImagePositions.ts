/**
 * Mirror of the IIFE inside Twin Studio's edit-premium-image call that builds
 * the imagePositions manifest. The manifest tells the prompt exactly what each
 * index in `image_urls` represents.
 *
 * Image order (matches Twin Studio):
 *   1. canvas sketch (always)
 *   2..N: product reference images
 *   N+1..M: per-zone content images (in zone order)
 *   M+1..P: per-zone inspiration images (in zone order)
 *   P+1: global inspiration image (optional)
 */
import type { Zone, ImagePositions, ProductImage } from './types';

export interface BuiltImageList {
  positions: ImagePositions;
  imageUrls: string[];
}

export function buildImagePositions(args: {
  sketchUrl: string;
  productImages: ProductImage[];
  zones: Zone[];
  globalInspirationUrl?: string;
}): BuiltImageList {
  const { sketchUrl, productImages, zones, globalInspirationUrl } = args;
  const imageUrls: string[] = [sketchUrl];
  let pos = 1;

  const positions: ImagePositions = {
    sketchPosition: pos,
    productPositions: [],
    contentImages: [],
    inspirationImages: [],
  };
  pos += 1;

  for (const p of productImages) {
    imageUrls.push(p.url);
    positions.productPositions.push(pos);
    pos += 1;
  }

  for (const z of zones) {
    if (z.contentImageUrl) {
      imageUrls.push(z.contentImageUrl);
      positions.contentImages.push({
        position: pos,
        zoneLabel: z.label,
      });
      pos += 1;
    }
  }

  for (const z of zones) {
    if (z.inspirationImageUrl) {
      imageUrls.push(z.inspirationImageUrl);
      positions.inspirationImages.push({
        position: pos,
        zoneLabel: z.label,
        zoneNumber: z.number,
      });
      pos += 1;
    }
  }

  if (globalInspirationUrl) {
    imageUrls.push(globalInspirationUrl);
    positions.globalInspirationPosition = pos;
  }

  return { positions, imageUrls };
}
