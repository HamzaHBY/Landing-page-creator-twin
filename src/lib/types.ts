export type Quality = 'ultimate' | 'premium';

export type AspectRatio =
  | 'portrait_1_3'   // 1024 x 3072 (default — 1:3)
  | 'portrait_9_16'  // 1080 x 1920
  | 'portrait_2_3'   // 1200 x 1800
  | 'square_hd'      // 1024 x 1024
  | 'landscape_3_2'  // 1800 x 1200
  | 'landscape_16_9' // 1920 x 1080
  | 'landscape_3_1'; // 3072 x 1024

export type OutputFormat = 'jpeg' | 'png' | 'webp';
export type Resolution = '1K' | '2K' | '4K';

export interface SectionTemplate {
  id: string;
  category: string;
  name: string;
  description: string;
  prompt: string;
  inspiration_image_url: string | null;
  height: number; // 0..1 — default_height_ratio
}

export interface Zone {
  id: string;
  number: number;
  label: string;
  height: number;            // 0..1 proportion of canvas
  sectionId?: string;        // selected template
  userText?: string;         // canvas text annotation
  zoneInstruction?: string;  // free-text override that beats the template
  color: string;             // background color of the zone in the sketch
  inspirationImageUrl?: string;
  contentImageUrl?: string;
}

export interface BrandBrief {
  visualStyle?: string;
  audienceAvatar?: string;
  painPoint?: string;
  deepDesire?: string;
  productName?: string;
  valueProp?: string;
  benefit1?: string;
  benefit2?: string;
  benefit3?: string;
  step1?: string;
  step2?: string;
  step3?: string;
  anchorPrice?: string;
  actualPrice?: string;
  offerFormat?: string;
  urgency?: string;
}

export interface ProductImage {
  id: string;
  url: string;
  name: string;
}

export interface ImagePositions {
  sketchPosition: number;        // index of canvas sketch in image_urls
  productPositions: number[];    // indices of product/brand reference images
  contentImages: { position: number; zoneLabel: string }[];
  inspirationImages: { position: number; zoneLabel: string; zoneNumber: number }[];
  globalInspirationPosition?: number;
}

export interface GenerateRequest {
  sketchDataUrl: string;          // PNG data-url of the canvas sketch
  productImageUrls: string[];     // public URLs of product images
  globalInspirationUrl?: string;
  zones: Zone[];
  brief?: BrandBrief;
  country?: string;
  language?: string;
  primaryColor?: string;          // dominant accent color override
  globalInstruction?: string;
  quality: Quality;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  outputFormat: OutputFormat;
}

export interface GenerateResponse {
  imageUrl?: string;
  imageBase64?: string;
  prompt: string;
  error?: string;
}
