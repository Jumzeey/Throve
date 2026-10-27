import { useEffect, useState } from 'react';
import type { ListingEditChanges } from '@/api/listings';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';

// Mirrors backend/src/lib/listing-catalog.ts.
const CATEGORIES: Record<string, string[]> = {
  Women: ['Clothing', 'Shoes', 'Bags', 'Accessories', 'Beauty'],
  Men: ['Clothing', 'Shoes', 'Bags', 'Accessories', 'Grooming'],
  Kids: ['Clothing', 'Shoes', 'Bags', 'Accessories'],
};
const CONDITIONS = ['New with tags', 'New without tags', 'Very good', 'Good', 'Satisfactory'];

export type SuggestEditSource = {
  title: string;
  description: string;
  brand: string;
  department: string;
  category: string;
  size: string;
  colour: string;
  condition: string;
  price: number;
};

type Draft = Omit<SuggestEditSource, 'price'> & { price: string };

function toDraft(source: SuggestEditSource): Draft {
  return { ...source, price: String(source.price || '') };
}

/** Super admin suggests changed listing details; the seller accepts, declines or edits. */
export function SuggestEditDialog({
  open,
  source,
  onOpenChange,
  onSubmit,
  busy,
}: {
  open: boolean;
  source: SuggestEditSource | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (changes: ListingEditChanges, note: string) => void;
  busy?: boolean;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open && source) {
      setDraft(toDraft(source));
      setNote('');
    }
  }, [open, source]);

  if (!draft || !source) return null;
  const set = (patch: Partial<Draft>) => setDraft((current) => (current ? { ...current, ...patch } : current));

  const changes: ListingEditChanges = {};
  (['title', 'description', 'brand', 'department', 'category', 'size', 'colour', 'condition'] as const).forEach(
    (field) => {
      if (draft[field].trim() !== (source[field] ?? '').trim()) changes[field] = draft[field].trim();
    },
  );
  const price = Number(draft.price.replace(/[^\d]/g, ''));
  if (price > 0 && price !== source.price) changes.price = price;
  const changedCount = Object.keys(changes).length;
  const categories = CATEGORIES[draft.department] ?? [];
  const categoryValid = categories.includes(draft.category);

  const field = (label: string, key: keyof Draft, opts?: { multiline?: boolean; max?: number }) => {
    const changed = key === 'price' ? 'price' in changes : key in changes;
    return (
      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
          {label}
          {changed ? <span className="ml-1.5 normal-case tracking-normal text-plum">· changed</span> : null}
        </Label>
        {opts?.multiline ? (
          <Textarea
            value={draft[key]}
            maxLength={opts.max}
            onChange={(e) => set({ [key]: e.target.value } as Partial<Draft>)}
            className="min-h-20 bg-card text-[12.5px]"
          />
        ) : (
          <Input
            value={draft[key]}
            maxLength={opts?.max}
            inputMode={key === 'price' ? 'numeric' : undefined}
            onChange={(e) => set({ [key]: e.target.value } as Partial<Draft>)}
            className="bg-card text-[12.5px]"
          />
        )}
        {changed ? (
          <span className="text-[11px] text-muted">
            Seller’s version: {key === 'price' ? `₦${source.price.toLocaleString()}` : source[key] || '—'}
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-normal text-espresso">Suggest an edit</DialogTitle>
          <DialogDescription className="text-[12.5px] text-body">
            Change any details below. The seller gets a push notification and can accept your changes, decline them
            with a note, or edit the listing themselves. It then comes back here for final approval.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3.5 md:grid-cols-2">
          <div className="md:col-span-2">{field('Title', 'title', { max: 80 })}</div>
          <div className="md:col-span-2">{field('Description', 'description', { multiline: true, max: 1000 })}</div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
              Department{'department' in changes ? <span className="ml-1.5 normal-case tracking-normal text-plum">· changed</span> : null}
            </Label>
            <Select
              value={draft.department}
              onValueChange={(value) =>
                set({
                  department: value,
                  category: (CATEGORIES[value] ?? []).includes(draft.category) ? draft.category : '',
                })
              }
            >
              <SelectTrigger className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(CATEGORIES).map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
              Category{'category' in changes ? <span className="ml-1.5 normal-case tracking-normal text-plum">· changed</span> : null}
            </Label>
            <Select value={draft.category || undefined} onValueChange={(value) => set({ category: value })}>
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
              Condition{'condition' in changes ? <span className="ml-1.5 normal-case tracking-normal text-plum">· changed</span> : null}
            </Label>
            <Select value={draft.condition} onValueChange={(value) => set({ condition: value })}>
              <SelectTrigger className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {field('Price (₦)', 'price')}
          {field('Brand', 'brand', { max: 60 })}
          {field('Size', 'size', { max: 30 })}
          {field('Colour', 'colour', { max: 40 })}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
              Note to the seller (optional)
            </Label>
            <Textarea
              value={note}
              maxLength={500}
              placeholder="e.g. Buyers search for “male” — this helps your listing get found."
              onChange={(e) => setNote(e.target.value)}
              className="min-h-16 bg-card text-[12.5px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || changedCount === 0 || !categoryValid || !draft.title.trim()}
            onClick={() => onSubmit(changes, note.trim())}
          >
            {busy ? 'Sending…' : changedCount ? `Send ${changedCount} change${changedCount > 1 ? 's' : ''} to seller` : 'Change something first'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
