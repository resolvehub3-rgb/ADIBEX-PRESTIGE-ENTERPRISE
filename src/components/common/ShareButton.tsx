import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Share2, Link2, ImageIcon, Paperclip, Check } from 'lucide-react';

interface ShareButtonProps {
  /** Listing title shown in the share sheet / social preview. */
  title: string;
  /** Public listing URL that gets shared. */
  url: string;
  /** Caption appended to the link on social apps. */
  text?: string;
  /** Cover photo or video URL attached to the share when the platform supports it. */
  mediaUrl?: string | null;
  /** Icon-only variant for dense table rows. */
  compact?: boolean;
  className?: string;
}

const MENU_WIDTH = 256;
const MENU_HEIGHT = 300;
const MAX_ATTACH_BYTES = 12 * 1024 * 1024;

/** Downloads a listing photo/video so it can travel with the share sheet. */
async function buildShareFile(mediaUrl?: string | null): Promise<File | null> {
  if (!mediaUrl) return null;
  try {
    const res = await fetch(mediaUrl, { mode: 'cors' });
    if (!res.ok) return null;

    const declared = Number(res.headers.get('content-length') || 0);
    if (declared && declared > MAX_ATTACH_BYTES) return null;

    const blob = await res.blob();
    if (!blob.type || blob.type.indexOf('/') === -1) return null;

    const path = (mediaUrl.split('?')[0].split('/').pop() || 'listing').replace(/[^a-zA-Z0-9._-]/g, '');
    const hasExt = path.includes('.');
    const ext = blob.type.split('/')[1] || 'bin';
    return new File([blob], hasExt ? path : `${path || 'listing'}.${ext}`, { type: blob.type });
  } catch {
    // CORS / offline → share the link without an attachment.
    return null;
  }
}

const openWindow = (href: string) => {
  window.open(href, '_blank', 'noopener,noreferrer');
};

export const ShareButton: React.FC<ShareButtonProps> = ({
  title,
  url,
  text,
  mediaUrl,
  compact = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const caption = text?.trim() || title;
  const sharePayload = { title, text: caption, url };

  const showFeedback = useCallback((message: string) => {
    setFeedback(message);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2500);
  }, []);

  const closeMenu = useCallback(() => setOpen(false), []);

  const openMenu = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const rawRight = rect ? viewportW - rect.right : 16;
    const right = Math.min(Math.max(12, rawRight), Math.max(12, viewportW - MENU_WIDTH - 12));

    let top = rect ? rect.bottom + 8 : 16;
    if (rect && viewportH - rect.bottom < MENU_HEIGHT && rect.top > MENU_HEIGHT) {
      top = Math.max(12, rect.top - MENU_HEIGHT - 8);
    }

    setPosition({ top, right });
    setOpen(true);
  }, []);

  // Close when clicking anywhere outside the button or its (portalled) menu.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onViewportChange = () => setOpen(false);

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onViewportChange);
    // Window-level only (no capture): a page scroll should dismiss the menu,
    // but scrolls inside the page must never close it by surprise.
    window.addEventListener('scroll', onViewportChange);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange);
    };
  }, [open]);

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    []
  );

  const handleShare = async () => {
    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
      canShare?: (data: ShareData) => boolean;
    };

    // Prefer the OS share sheet when it can carry the photo/video + link —
    // that is the genuine one-click share on phones and supported desktops.
    if (typeof nav.share === 'function') {
      try {
        const file = await buildShareFile(mediaUrl);
        const canAttach = Boolean(file && nav.canShare && nav.canShare({ files: [file] }));
        const touchOnly =
          !file && typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)').matches);

        if (canAttach) {
          await nav.share({ files: [file as File], ...sharePayload });
          return;
        }
        if (touchOnly) {
          await nav.share(sharePayload);
          return;
        }
      } catch (err: any) {
        // The user dismissed the native sheet — do not double-prompt.
        if (err?.name === 'AbortError') return;
        // Anything else (unsupported payload, blocked share) → use our menu.
      }
    }
    if (open) closeMenu();
    else openMenu();
  };

  const copyToClipboard = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showFeedback(message);
    } catch {
      // Clipboard blocked → fall back to a temporary textarea.
      try {
        const area = document.createElement('textarea');
        area.value = value;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
        showFeedback(message);
      } catch {
        showFeedback('Copy failed — select the link manually');
      }
    }
  };

  const copyImage = async () => {
    if (!mediaUrl || typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      await copyToClipboard(url, 'Link copied');
      return;
    }
    try {
      const res = await fetch(mediaUrl, { mode: 'cors' });
      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) {
        await copyToClipboard(mediaUrl, 'Media link copied');
        return;
      }
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      showFeedback('Image copied');
    } catch {
      await copyToClipboard(url, 'Link copied');
    }
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedCaption = encodeURIComponent(caption);

  const networks = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      bg: 'bg-emerald-500',
      glyph: 'W',
      href: `https://wa.me/?text=${encodeURIComponent(`${caption} ${url}`)}`,
    },
    {
      id: 'facebook',
      name: 'Facebook',
      bg: 'bg-[#1877F2]',
      glyph: 'f',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      id: 'x',
      name: 'X / Twitter',
      bg: 'bg-black',
      glyph: 'X',
      href: `https://twitter.com/intent/tweet?text=${encodedCaption}&url=${encodedUrl}`,
    },
    {
      id: 'telegram',
      name: 'Telegram',
      bg: 'bg-sky-500',
      glyph: 'T',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedCaption}`,
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      bg: 'bg-[#0A66C2]',
      glyph: 'in',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      id: 'email',
      name: 'Email',
      bg: 'bg-slate-600',
      glyph: '@',
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${caption}\n${url}`)}`,
    },
  ];

  const buttonClasses = compact
    ? `p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-purple-50 hover:border-purple-200 hover:text-[#2A0845] transition-all cursor-pointer ${
        open ? 'bg-purple-50 border-purple-200 text-[#2A0845]' : ''
      }`
    : `inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2A0845] text-white text-xs font-bold hover:bg-[#3D105E] transition-all shadow-md shadow-purple-950/15 cursor-pointer ${
        open ? 'bg-[#3D105E]' : ''
      }`;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleShare}
        title={`Share "${title}"`}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${buttonClasses} ${className}`}
      >
        <Share2 className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4 text-[#D4AF37]'} />
        {!compact && <span>Share</span>}
      </button>

      {open &&
        position &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: 'fixed', top: position.top, right: position.right, width: MENU_WIDTH }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 z-[100] animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Share listing</p>
              <button
                type="button"
                onClick={closeMenu}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1">
              {networks.map((network) => (
                <button
                  key={network.id}
                  type="button"
                  role="menuitem"
                  onClick={() => openWindow(network.href)}
                  className="flex flex-col items-center gap-1.5 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span
                    className={`w-9 h-9 rounded-full ${network.bg} text-white flex items-center justify-center text-xs font-extrabold leading-none`}
                  >
                    {network.glyph}
                  </span>
                  <span className="text-[9px] font-semibold text-slate-600 text-center leading-tight">
                    {network.name}
                  </span>
                </button>
              ))}
            </div>

            <div className="h-px bg-slate-100 my-2" />

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => copyToClipboard(url, 'Link copied')}
                className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-bold text-slate-600 hover:bg-slate-100 hover:text-[#2A0845] transition-colors cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5" />
                Copy Link
              </button>
              {mediaUrl && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={copyImage}
                  className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-bold text-slate-600 hover:bg-slate-100 hover:text-[#2A0845] transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Copy Image
                </button>
              )}
            </div>

            {mediaUrl && (
              <p className="mt-2 px-1 text-[10px] text-slate-400 flex items-center gap-1.5">
                <Paperclip className="w-3 h-3 shrink-0" />
                The listing photo/video and link are attached when the app supports it.
              </p>
            )}

            {feedback && (
              <p className="mt-2 px-1 text-[11px] font-bold text-emerald-600 flex items-center gap-1.5 animate-in fade-in duration-200">
                <Check className="w-3.5 h-3.5" />
                {feedback}
              </p>
            )}
          </div>,
          document.body
        )}
    </>
  );
};

export default ShareButton;
