import { useEffect, useState } from 'react';
import { useAuth, roleLabel } from '@/auth/AuthContext';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive,
  requireCheckbox,
  checkboxLabel = 'I have reviewed this record and understand this cannot be undone.',
  reasonLabel = 'Reason (required)',
  reasonPlaceholder = 'Document why this action is being taken…',
  defaultReason = '',
  metaRows,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  requireCheckbox?: boolean;
  checkboxLabel?: string;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  defaultReason?: string;
  /** Extra audit rows shown under the acting-admin strip (e.g. Recommended by). */
  metaRows?: { label: string; value: string }[];
  onConfirm: (reason: string) => void;
}) {
  const { session } = useAuth();
  const [reason, setReason] = useState(defaultReason);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (open) {
      setReason(defaultReason);
      setChecked(false);
    }
  }, [open, defaultReason]);

  const canSubmit = reason.trim().length >= 3 && (!requireCheckbox || checked);

  function submit() {
    if (!canSubmit) return;
    onConfirm(reason.trim());
    setReason('');
    setChecked(false);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setReason('');
          setChecked(false);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-normal text-espresso">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-[12.5px] leading-relaxed text-body">{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="rounded border border-border-soft bg-panel-elevated px-3 py-2.5 text-[11.5px] text-muted">
            <div>
              Acting admin{' '}
              <span className="font-semibold text-espresso">
                {session?.name ?? 'Staff'}
                {session ? ` · ${roleLabel(session.role)}` : null}
              </span>
            </div>
            {metaRows?.map((row) => (
              <div key={row.label} className="mt-1">
                {row.label} <span className="font-semibold text-espresso">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-reason" className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
              {reasonLabel}
            </Label>
            <Textarea
              id="confirm-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              className="min-h-20 bg-card text-[12.5px]"
            />
          </div>
          {requireCheckbox ? (
            <label className="flex items-start gap-2 text-[12px] leading-snug text-body">
              <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} className="mt-0.5" />
              <span>{checkboxLabel}</span>
            </label>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            disabled={!canSubmit}
            onClick={submit}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
