import { PropertyMedia } from '../types';

// ------------------------------------------------------------------------
// MEDIA URL SAFETY
// ------------------------------------------------------------------------
// `blob:` object URLs only live as long as the tab that created them, so a
// media row holding one is permanently broken once the page is reloaded.
// Anything we persist or render must be durable: an https URL from Supabase
// Storage, an inline data: URL, or a same-origin path.

export function isDurableMediaUrl(url?: string | null): boolean {
  if (!url) return false;
  const value = String(url).trim();
  if (!value) return false;
  const lower = value.toLowerCase();
  if (lower.startsWith('blob:')) return false;
  if (lower.startsWith('data:image/') || lower.startsWith('data:video/') || lower.startsWith('data:application/pdf')) return true;
  if (lower.startsWith('http://') || lower.startsWith('https://')) return true;
  return value.startsWith('/');
}

/** True for data: URLs, which must be rendered in-page (browsers block them in new tabs). */
export function isInlineDataUrl(url?: string | null): boolean {
  if (!url) return false;
  const lower = String(url).trim().toLowerCase();
  return lower.startsWith('data:image/') || lower.startsWith('data:video/') || lower.startsWith('data:application/pdf');
}

/**
 * Detects a Storage object reference stored instead of a fetchable URL:
 * a bucket-qualified path ("payment-proofs/123_abc.jpg") or a bare object
 * path ("123_abc.jpg") saved when only one bucket existed. A signed URL can
 * be minted for these on demand.
 */
export function isPaymentProofPath(url?: string | null): boolean {
  if (!url) return false;
  const value = String(url).trim();
  if (!value || value.includes('://')) return false; // real URLs are not paths
  if (/^(blob|data):/i.test(value)) return false;
  return value.startsWith('payment-proofs/') || /^[\w-]+\.[a-z0-9]{1,8}$/i.test(value);
}

/** Crawlers (Open Graph / JSON-LD) only understand fetchable absolute URLs. */
export function isAbsoluteHttpUrl(url?: string | null): boolean {
  if (!url) return false;
  const lower = String(url).trim().toLowerCase();
  return lower.startsWith('http://') || lower.startsWith('https://');
}

// ------------------------------------------------------------------------
// VIDEO HELPERS
// ------------------------------------------------------------------------

const VIDEO_FILE_EXT = /\.(mp4|m4v|mov|webm|ogv|ogg|avi|mkv)$/i;

/** True when a URL points at a video file a <video> element can actually play. */
export function isPlayableVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  const value = String(url).trim();
  if (!value) return false;
  if (value.toLowerCase().startsWith('data:video/')) return true;
  if (!isAbsoluteHttpUrl(value)) return false;
  return VIDEO_FILE_EXT.test(value.split(/[?#]/)[0]);
}

/** Hosts that must be rendered in an iframe (YouTube, Vimeo, Matterport...). */
const EMBED_HOST = /(?:youtube\.com|youtu\.be|vimeo\.com|matterport\.com|google\.com\/maps|maps\.app\.goo\.gl)/i;

export function isEmbeddableUrl(url?: string | null): boolean {
  if (!url || !isAbsoluteHttpUrl(url)) return false;
  try {
    return EMBED_HOST.test(new URL(String(url).trim()).host) || EMBED_HOST.test(String(url).trim());
  } catch {
    return EMBED_HOST.test(String(url).trim());
  }
}

/** Rewrites a watch/share link into an iframe-safe embed URL (null if none). */
export function toEmbedUrl(url?: string | null): string | null {
  if (!url || !isAbsoluteHttpUrl(url)) return null;
  const raw = String(url).trim();
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`;
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const id = parsed.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (parsed.pathname.startsWith('/shorts/')) return `https://www.youtube.com/embed/${parsed.pathname.split('/')[2] || ''}`;
      if (parsed.pathname.startsWith('/embed/')) return raw;
    }
    if (host === 'vimeo.com') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
    if (isEmbeddableUrl(raw)) return raw;
    return null;
  } catch {
    return isEmbeddableUrl(raw) ? raw : null;
  }
}

type MediaLike = { media_type?: string | null; url: string };

/** Rows meant to be rendered inside an <img> (never videos or documents). */
export function isImageMedia<T extends MediaLike>(media: T | null | undefined): boolean {
  if (!media || !isDurableMediaUrl(media?.url)) return false;
  const type = String(media.media_type || 'IMAGE').toUpperCase();
  if (type === 'VIDEO' || type === 'DOCUMENT') return false;
  return !isPlayableVideoUrl(media.url);
}

/**
 * Rows meant for a player: an explicit VIDEO row (or a URL that is clearly a
 * video file). The URL still has to be durable so it can reach the DOM.
 */
export function isVideoMedia<T extends MediaLike>(media: T | null | undefined): boolean {
  if (!media || !isDurableMediaUrl(media?.url)) return false;
  if (String(media.media_type || '').toUpperCase() === 'VIDEO') return true;
  return isPlayableVideoUrl(media.url);
}

/** Drops dead/ephemeral entries so a broken image can never reach the DOM. */
export function usableMedia<T extends { url: string }>(media?: T[] | null): T[] {
  if (!media || media.length === 0) return [];
  return media.filter((m) => isDurableMediaUrl(m?.url));
}

/** Primary photo of a property, ignoring rows whose URL can never load. */
export function primaryMedia(media?: PropertyMedia[] | null): PropertyMedia | null {
  const usable = usableMedia(media);
  if (usable.length === 0) return null;
  // Never hand an <img> a video (or any non-image) URL: the card would render
  // a broken thumbnail instead of the branded placeholder.
  const images = usable.filter(isImageMedia);
  const pool = images.length > 0 ? images : [];
  if (pool.length === 0) return null;
  return pool.find((m) => m.is_primary) || pool[0] || null;
}

// ------------------------------------------------------------------------
// INLINE (DATABASE-STORED) IMAGE COMPRESSION
// ------------------------------------------------------------------------
// Used when Supabase Storage is unavailable (bucket missing / RLS blocked).
// The image is re-encoded to a bounded JPEG data URL so it stays durable,
// always renders, and never blows up the size of a Supabase response.

export interface InlineImageOptions {
  /** Longest edge in pixels after scaling. */
  maxEdge?: number;
  /** Starting JPEG quality (0-1). */
  quality?: number;
  /** Hard cap on the base64 string length (payload guard). */
  maxBase64Length?: number;
}

const DEFAULT_INLINE_OPTIONS: Required<InlineImageOptions> = {
  maxEdge: 1280,
  quality: 0.72,
  maxBase64Length: 220_000,
};

/** Absolute ceiling for one inline image (~1.6M chars) before we give up. */
const HARD_BASE64_LIMIT = 1_600_000;

function decodeImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof URL === 'undefined' || typeof Image === 'undefined') {
      reject(new Error('Image decoding is not supported in this environment'));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unsupported or corrupt image file'));
    };
    img.src = objectUrl;
  });
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl && dataUrl.startsWith('data:image/') ? dataUrl : null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Re-encodes an uploaded picture into a bounded, durable JPEG data URL.
 * Returns null when the file cannot be decoded as an image.
 */
export async function compressImageToDataUrl(
  file: File,
  options: InlineImageOptions = {}
): Promise<string | null> {
  if (!file || typeof document === 'undefined') return null;
  if (file.type && !file.type.startsWith('image/')) return null;

  const maxEdge = Math.max(320, options.maxEdge ?? DEFAULT_INLINE_OPTIONS.maxEdge);
  const startQuality = Math.min(0.95, Math.max(0.35, options.quality ?? DEFAULT_INLINE_OPTIONS.quality));
  const maxBase64Length = Math.max(32_000, options.maxBase64Length ?? DEFAULT_INLINE_OPTIONS.maxBase64Length);
  // base64 expands binary by ~4/3, so the binary budget is ~74% of the cap
  const maxBinaryLength = Math.floor(maxBase64Length * 0.74);

  let img: HTMLImageElement;
  try {
    img = await decodeImage(file);
  } catch {
    return null;
  }

  const naturalWidth = img.naturalWidth || img.width || maxEdge;
  const naturalHeight = img.naturalHeight || img.height || maxEdge;
  if (!naturalWidth || !naturalHeight) return null;

  let edge = maxEdge;
  let quality = startQuality;
  let dataUrl: string | null = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, edge / Math.max(naturalWidth, naturalHeight));
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Flatten transparency (JPEG has no alpha) so screenshots/logos stay legible
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    dataUrl = await canvasToDataUrl(canvas, quality);
    if (!dataUrl) return null;

    if (dataUrl.length <= maxBinaryLength) break;

    // Too large: trade quality first, then resolution.
    if (quality > 0.45) {
      quality = Math.max(0.4, quality - 0.12);
    } else if (edge > 480) {
      edge = Math.max(400, Math.floor(edge * 0.7));
      quality = startQuality;
    } else {
      break;
    }
  }

  if (!dataUrl || dataUrl.length > HARD_BASE64_LIMIT) return null;
  return dataUrl;
}

/**
 * Last-resort fallback for non-image uploads (e.g. PDF payment proofs):
 * Base64-encodes the raw file into a durable data URL when Storage is
 * unavailable, so the document still reaches the reviewer instead of
 * silently disappearing.
 */
export function fileToDataUrl(file: File, maxBytes = 4_000_000): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof FileReader === 'undefined' || !file) {
      resolve(null);
      return;
    }
    if (file.size > maxBytes) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' && reader.result.startsWith('data:')
        ? reader.result
        : null;
      resolve(result);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
