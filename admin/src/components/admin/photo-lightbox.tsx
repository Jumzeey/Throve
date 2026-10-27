import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Full-screen photo viewer: big image, previous/next (buttons, arrow keys, thumbnails),
 * a counter, and a link to open the original file.
 */
export function PhotoLightbox({
  photos,
  index,
  title,
  onIndexChange,
  onClose,
}: {
  photos: string[];
  /** null = closed. */
  index: number | null;
  title?: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const open = index != null && photos.length > 0;
  const current = open ? Math.min(Math.max(index, 0), photos.length - 1) : 0;
  const [loaded, setLoaded] = useState(false);

  useEffect(() => setLoaded(false), [current, open]);

  const go = useCallback(
    (delta: number) => {
      if (!photos.length) return;
      onIndexChange((current + delta + photos.length) % photos.length);
    },
    [current, onIndexChange, photos.length],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') go(1);
      else if (event.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, open]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="h-[92vh] max-w-[min(1100px,calc(100%-2rem))] gap-0 overflow-hidden border-none bg-[#1b1113] p-0 text-[#fff7f0] sm:max-w-[min(1100px,calc(100%-2rem))]"
      >
        <DialogTitle className="sr-only">{title ?? 'Photo'}</DialogTitle>
        <DialogDescription className="sr-only">
          Photo {current + 1} of {photos.length}. Use the arrow keys to move between photos.
        </DialogDescription>

        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-[12.5px]">
            <div className="min-w-0 truncate">
              {title ? <span className="font-semibold">{title}</span> : null}
              <span className="ml-2 text-[#fff7f0]/60 tabular-nums">
                {current + 1} / {photos.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <a
                href={photos[current]}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 text-[12px] text-[#fff7f0]/80 hover:bg-white/10 hover:text-[#fff7f0]"
              >
                <ExternalLink className="size-3.5" /> Open original
              </a>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-[4px] p-1.5 text-[#fff7f0]/80 hover:bg-white/10 hover:text-[#fff7f0]"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-14">
            {!loaded ? <div className="absolute size-8 animate-pulse rounded-full bg-white/15" /> : null}
            {open ? (
              <img
                key={photos[current]}
                src={photos[current]}
                alt={`${title ?? 'Photo'} ${current + 1}`}
                onLoad={() => setLoaded(true)}
                className={cn(
                  'max-h-full max-w-full object-contain transition-opacity duration-200',
                  loaded ? 'opacity-100' : 'opacity-0',
                )}
              />
            ) : null}
            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous photo"
                  className="absolute left-3 rounded-full bg-white/10 p-2 hover:bg-white/20"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next photo"
                  className="absolute right-3 rounded-full bg-white/10 p-2 hover:bg-white/20"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            ) : null}
          </div>

          {photos.length > 1 ? (
            <div className="flex justify-center gap-2 overflow-x-auto px-4 py-3">
              {photos.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  onClick={() => onIndexChange(i)}
                  aria-label={`Photo ${i + 1}`}
                  className={cn(
                    'size-14 shrink-0 overflow-hidden rounded-[4px] border-2',
                    i === current ? 'border-[#b68235]' : 'border-transparent opacity-60 hover:opacity-100',
                  )}
                >
                  <img src={url} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
