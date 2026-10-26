import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  createBanner,
  deleteBanner,
  fetchBanners,
  reorderBanners,
  updateBanner,
  uploadBannerImage,
  type BannerTargetType,
  type BannerTheme,
  type HomeBanner,
  type HomeBannerInput,
} from '@/api/banners';
import { EmptyState } from '@/components/admin/empty-state';
import { ListSkeleton } from '@/components/admin/loading-skeleton';
import { Panel } from '@/components/admin/panel';
import { StatusBadge, type StatusTone } from '@/components/admin/status-badge';
import { usePageChrome } from '@/components/layout/shell-chrome';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';

const TARGETS: { value: BannerTargetType; label: string; hint?: string }[] = [
  { value: 'category_browse', label: 'Shop all (category browse)' },
  { value: 'department', label: 'A department', hint: 'Women, Men or Kids' },
  { value: 'listing', label: 'A listing', hint: 'Listing ID' },
  { value: 'live', label: 'A live', hint: 'Live session ID' },
  { value: 'seller', label: 'A seller profile', hint: 'Username, without @' },
  { value: 'search', label: 'Search results', hint: 'Search term, e.g. ankara' },
  { value: 'url', label: 'Outside link', hint: 'https://…' },
];

const THEMES: { value: BannerTheme; label: string; bg: string; fg: string; ctaBg: string; ctaFg: string }[] = [
  { value: 'plum', label: 'Plum', bg: '#5a1f45', fg: '#fff7f0', ctaBg: '#fff7f0', ctaFg: '#5a1f45' },
  { value: 'espresso', label: 'Espresso', bg: '#2b211f', fg: '#fff7f0', ctaBg: '#fff7f0', ctaFg: '#2b211f' },
  { value: 'gold', label: 'Gold', bg: '#b68235', fg: '#fff7f0', ctaBg: '#fff7f0', ctaFg: '#7a5420' },
  { value: 'sand', label: 'Sand', bg: '#f3ede6', fg: '#2b211f', ctaBg: '#5a1f45', ctaFg: '#fff7f0' },
];

const EMPTY: HomeBannerInput = {
  title: '',
  subtitle: null,
  ctaLabel: 'Shop now',
  targetType: 'category_browse',
  targetValue: null,
  imageUrl: null,
  theme: 'plum',
  active: true,
  startsAt: null,
  endsAt: null,
};

const STATUS_TONE: Record<HomeBanner['status'], StatusTone> = {
  Live: 'clear',
  Scheduled: 'gold',
  Ended: 'neutral',
  Off: 'neutral',
};

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

/** ISO -> value for <input type="datetime-local"> in the browser's time zone. */
function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function targetSummary(b: Pick<HomeBanner, 'targetType' | 'targetValue'>) {
  const label = TARGETS.find((t) => t.value === b.targetType)?.label ?? b.targetType;
  return b.targetValue ? `${label}: ${b.targetValue}` : label;
}

function scheduleSummary(b: Pick<HomeBanner, 'startsAt' | 'endsAt'>) {
  const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  if (b.startsAt && b.endsAt) return `${fmt(b.startsAt)} → ${fmt(b.endsAt)}`;
  if (b.startsAt) return `From ${fmt(b.startsAt)}`;
  if (b.endsAt) return `Until ${fmt(b.endsAt)}`;
  return 'Always on';
}

/** Phone-width preview that mirrors the app's Home carousel slide. */
function BannerPreview({ banner }: { banner: HomeBannerInput }) {
  const theme = THEMES.find((t) => t.value === banner.theme) ?? THEMES[0];
  return (
    <div
      className="relative flex min-h-[170px] w-full max-w-[340px] flex-col justify-center gap-2.5 overflow-hidden rounded-[8px] px-5 py-6"
      style={{ backgroundColor: theme.bg }}
    >
      {banner.imageUrl ? (
        <>
          <img src={banner.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
        </>
      ) : null}
      <div
        className="relative max-w-[200px] font-display text-[23px] leading-[1.15]"
        style={{ color: banner.imageUrl ? '#fff7f0' : theme.fg }}
      >
        {banner.title || 'Banner title'}
      </div>
      {banner.subtitle ? (
        <div className="relative max-w-[190px] text-[11px] leading-snug opacity-85" style={{ color: banner.imageUrl ? '#fff7f0' : theme.fg }}>
          {banner.subtitle}
        </div>
      ) : null}
      {banner.ctaLabel ? (
        <span
          className="relative mt-1 self-start rounded-full px-4 py-2 text-[11.5px] font-semibold"
          style={{ backgroundColor: theme.ctaBg, color: theme.ctaFg }}
        >
          {banner.ctaLabel}
        </span>
      ) : null}
    </div>
  );
}

function BannerEditor({
  open,
  initial,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  initial: HomeBanner | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (message: string) => void;
}) {
  const [draft, setDraft] = useState<HomeBannerInput>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDraft(
      initial
        ? {
            title: initial.title,
            subtitle: initial.subtitle,
            ctaLabel: initial.ctaLabel,
            targetType: initial.targetType,
            targetValue: initial.targetValue,
            imageUrl: initial.imageUrl,
            theme: initial.theme,
            active: initial.active,
            startsAt: initial.startsAt,
            endsAt: initial.endsAt,
          }
        : EMPTY,
    );
  }, [open, initial]);

  const target = TARGETS.find((t) => t.value === draft.targetType);
  const set = (patch: Partial<HomeBannerInput>) => setDraft((current) => ({ ...current, ...patch }));

  async function pickImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadBannerImage(file);
      set({ imageUrl: url });
    } catch (err) {
      setError(errorMessage(err, 'Image upload failed'));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      if (initial) await updateBanner(initial.id, draft);
      else await createBanner(draft);
      onOpenChange(false);
      onSaved(initial ? 'Banner updated' : 'Banner added');
    } catch (err) {
      setError(errorMessage(err, 'Could not save the banner'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl" showCloseButton>
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-normal text-espresso">
            {initial ? 'Edit banner' : 'New banner'}
          </DialogTitle>
          <DialogDescription className="text-[12.5px] text-body">
            Shows in the carousel at the top of the app’s Home tab. Changes reach the app within about a minute.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-3.5">
            <Field label={`Title (${draft.title.length}/40)`}>
              <Input value={draft.title} maxLength={40} onChange={(e) => set({ title: e.target.value })} />
            </Field>
            <Field label={`Subtitle, optional (${(draft.subtitle ?? '').length}/80)`}>
              <Input
                value={draft.subtitle ?? ''}
                maxLength={80}
                onChange={(e) => set({ subtitle: e.target.value || null })}
              />
            </Field>
            <Field label="Button label, optional">
              <Input
                value={draft.ctaLabel ?? ''}
                maxLength={20}
                placeholder="Shop now"
                onChange={(e) => set({ ctaLabel: e.target.value || null })}
              />
            </Field>
            <Field label="When tapped, go to">
              <Select
                value={draft.targetType}
                onValueChange={(value) => set({ targetType: value as BannerTargetType, targetValue: null })}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGETS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {draft.targetType === 'department' ? (
              <Field label="Department">
                <Select value={draft.targetValue ?? undefined} onValueChange={(value) => set({ targetValue: value })}>
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder="Choose a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Women', 'Men', 'Kids'].map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : draft.targetType !== 'category_browse' ? (
              <Field label={target?.hint ?? 'Destination'}>
                <Input
                  value={draft.targetValue ?? ''}
                  placeholder={target?.hint}
                  onChange={(e) => set({ targetValue: e.target.value.trim() || null })}
                />
              </Field>
            ) : null}
            <Field label="Colour">
              <div className="flex flex-wrap gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set({ theme: t.value })}
                    className={`flex items-center gap-2 rounded-[4px] border px-2.5 py-1.5 text-[12px] ${
                      draft.theme === t.value ? 'border-plum font-semibold text-espresso' : 'border-border-soft text-body'
                    }`}
                  >
                    <span className="size-3.5 rounded-full border border-black/10" style={{ backgroundColor: t.bg }} />
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Image, optional (JPG, PNG or WebP, up to 2 MB, wide 2:1)">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] border border-border-soft bg-card px-3 py-1.5 text-[12px] text-espresso">
                  <ImagePlus className="size-3.5" />
                  {uploading ? 'Uploading…' : draft.imageUrl ? 'Replace image' : 'Upload image'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => void pickImage(e.target.files?.[0])}
                  />
                </label>
                {draft.imageUrl ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => set({ imageUrl: null })}>
                    Remove image
                  </Button>
                ) : null}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts, optional">
                <Input
                  type="datetime-local"
                  value={toLocalInput(draft.startsAt)}
                  onChange={(e) => set({ startsAt: fromLocalInput(e.target.value) })}
                />
              </Field>
              <Field label="Ends, optional">
                <Input
                  type="datetime-local"
                  value={toLocalInput(draft.endsAt)}
                  onChange={(e) => set({ endsAt: fromLocalInput(e.target.value) })}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-[12.5px] text-body">
              <Checkbox checked={draft.active} onCheckedChange={(v) => set({ active: v === true })} />
              Show this banner in the app
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">Preview</div>
            <BannerPreview banner={draft} />
            <div className="text-[11px] leading-relaxed text-muted">{targetSummary(draft)}</div>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy || uploading || !draft.title.trim()} onClick={() => void save()}>
            {busy ? 'Saving…' : initial ? 'Save changes' : 'Add banner'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">{label}</Label>
      {children}
    </div>
  );
}

export function BannersPage() {
  const { banner, show } = useToast();
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<HomeBanner | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<HomeBanner | null>(null);
  const [busy, setBusy] = useState(false);

  usePageChrome({
    title: 'Home banners',
    subtitle: 'The carousel at the top of the app’s Home tab. Super admins only.',
    hideSearch: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBanners();
      setBanners(data.banners);
    } catch (err) {
      setError(errorMessage(err, 'Could not load banners'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const liveCount = useMemo(() => banners.filter((b) => b.status === 'Live').length, [banners]);

  async function move(index: number, delta: number) {
    const next = [...banners];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    setBanners(next);
    setBusy(true);
    try {
      const data = await reorderBanners(next.map((b) => b.id));
      setBanners(data.banners);
    } catch (err) {
      setError(errorMessage(err, 'Could not reorder'));
      void load();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(b: HomeBanner) {
    setBusy(true);
    try {
      await updateBanner(b.id, {
        title: b.title,
        subtitle: b.subtitle,
        ctaLabel: b.ctaLabel,
        targetType: b.targetType,
        targetValue: b.targetValue,
        imageUrl: b.imageUrl,
        theme: b.theme,
        active: !b.active,
        startsAt: b.startsAt,
        endsAt: b.endsAt,
      });
      show(b.active ? 'Banner turned off' : 'Banner turned on');
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Could not update the banner'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(b: HomeBanner) {
    setBusy(true);
    try {
      await deleteBanner(b.id);
      setConfirmDelete(null);
      show('Banner deleted');
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Could not delete the banner'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {banner}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Panel
        title="Slides"
        subtitle={`${liveCount} showing in the app now. When none are live, the app shows its built-in “Curated finds” banner.`}
      >
        <div className="mb-3 flex justify-end">
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="size-3.5" /> New banner
          </Button>
        </div>
        {loading ? (
          <ListSkeleton />
        ) : banners.length === 0 ? (
          <EmptyState title="No banners yet" description="Add one to start the Home carousel." />
        ) : (
          <div className="flex flex-col divide-y divide-divider">
            {banners.map((b, index) => (
              <div key={b.id} className="flex flex-wrap items-center gap-4 py-3">
                <div className="w-[150px] shrink-0 overflow-hidden rounded-[6px]">
                  <div className="origin-top-left scale-[0.44]" style={{ width: 340, height: 77 }}>
                    <BannerPreview banner={b} />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-espresso">
                    {b.title}
                    <StatusBadge tone={STATUS_TONE[b.status]}>{b.status}</StatusBadge>
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-muted">{targetSummary(b)}</div>
                  <div className="text-[11.5px] text-muted">{scheduleSummary(b)}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Move up"
                    disabled={busy || index === 0}
                    onClick={() => void move(index, -1)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Move down"
                    disabled={busy || index === banners.length - 1}
                    onClick={() => void move(index, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => void toggle(b)}>
                    {b.active ? 'Turn off' : 'Turn on'}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Edit"
                    onClick={() => {
                      setEditing(b);
                      setEditorOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => setConfirmDelete(b)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <BannerEditor
        open={editorOpen}
        initial={editing}
        onOpenChange={setEditorOpen}
        onSaved={(message) => {
          show(message);
          void load();
        }}
      />

      <Dialog open={Boolean(confirmDelete)} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-normal text-espresso">Delete banner?</DialogTitle>
            <DialogDescription className="text-[12.5px] text-body">
              “{confirmDelete?.title}” will be removed from the app. To hide it for now instead, turn it off.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => confirmDelete && void remove(confirmDelete)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
