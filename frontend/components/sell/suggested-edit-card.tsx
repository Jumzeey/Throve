import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast';
import { Palette, Radius, Typography } from '@/constants/theme';
import { apiFetch, ApiError } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type ProposalField = {
  field: string;
  label: string;
  from: unknown;
  to: unknown;
};

export type ListingEditProposal = {
  id: string;
  status: 'proposed' | 'accepted' | 'rejected' | 'superseded' | 'withdrawn';
  note: string | null;
  sellerNote: string | null;
  createdAt: string;
  fields: ProposalField[];
};

function show(field: string, value: unknown) {
  if (value == null || value === '') return '—';
  if (field === 'price') return formatNaira(Number(value));
  return String(value);
}

/**
 * Throve suggested changes to a listing in review. The seller accepts them, declines with a
 * note, or edits the listing themselves; any of these sends it back for final approval.
 */
export function SuggestedEditCard({
  listingId,
  onEditMyself,
  onResolved,
}: {
  listingId: string;
  onEditMyself: () => void;
  /** Called after accept/decline so the screen can reload the listing. */
  onResolved: () => Promise<unknown> | void;
}) {
  const toast = useToast();
  const [proposal, setProposal] = useState<ListingEditProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ proposal: ListingEditProposal | null }>(`/listings/${listingId}/edit-proposal`);
      setProposal(data.proposal);
    } catch {
      setProposal(null);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function accept() {
    setBusy('accept');
    try {
      await apiFetch(`/listings/${listingId}/edit-proposal/accept`, { method: 'POST' });
      toast.success('Changes accepted', 'Your listing is back with Throve for final approval.');
      await onResolved();
    } catch (err) {
      toast.error("Couldn't accept the changes", err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function decline() {
    if (note.trim().length < 3) return;
    setBusy('decline');
    try {
      await apiFetch(`/listings/${listingId}/edit-proposal/decline`, {
        method: 'POST',
        body: JSON.stringify({ note: note.trim() }),
      });
      setDeclineOpen(false);
      setNote('');
      toast.success('Suggestion declined', 'Throve will review your listing as it is, with your note.');
      await onResolved();
    } catch (err) {
      toast.error("Couldn't send your reply", err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={Palette.plum} />
      </View>
    );
  }
  if (!proposal || proposal.status !== 'proposed') return null;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>SUGGESTED BY THROVE</Text>
      <Text style={styles.title}>We suggested some changes</Text>
      <Text style={styles.body}>
        Accept them, decline with a note, or edit the listing yourself. Either way it goes back for a final check.
      </Text>
      {proposal.note ? <Text style={styles.note}>“{proposal.note}”</Text> : null}

      <View style={styles.diffs}>
        {proposal.fields.map((f) => (
          <View key={f.field} style={styles.diff}>
            <Text style={styles.diffLabel}>{f.label.toUpperCase()}</Text>
            <Text style={styles.diffFrom}>{show(f.field, f.from)}</Text>
            <Text style={styles.diffTo}>{show(f.field, f.to)}</Text>
          </View>
        ))}
      </View>

      <Button label="Accept changes" loading={busy === 'accept'} disabled={busy !== null} onPress={() => void accept()} />
      <View style={styles.row}>
        <Button
          label="Edit myself"
          variant="secondary"
          disabled={busy !== null}
          onPress={onEditMyself}
          style={styles.half}
        />
        <Button
          label="Decline"
          variant="secondary"
          disabled={busy !== null}
          onPress={() => setDeclineOpen(true)}
          style={styles.half}
        />
      </View>

      <Modal visible={declineOpen} transparent animationType="fade" onRequestClose={() => setDeclineOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setDeclineOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>Decline the suggestion</Text>
            <Text style={styles.body}>Tell the Throve team why, so they can review your listing as it is.</Text>
            <TextField
              value={note}
              onChangeText={setNote}
              placeholder="e.g. This style is unisex, so I'd like to keep the original title."
              multiline
              maxLength={500}
              style={styles.input}
            />
            <View style={styles.row}>
              <Button label="Cancel" variant="secondary" onPress={() => setDeclineOpen(false)} style={styles.half} />
              <Button
                label="Send"
                loading={busy === 'decline'}
                disabled={note.trim().length < 3 || busy !== null}
                onPress={() => void decline()}
                style={styles.half}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#C9A9BD',
    borderRadius: Radius.md,
    backgroundColor: '#F8ECEF',
  },
  eyebrow: { fontSize: 10.5, letterSpacing: 0.8, fontFamily: Typography.bodySemiBold, color: Palette.plum },
  title: { fontSize: 19, fontFamily: Typography.display, color: Palette.espresso },
  body: { fontSize: 13, lineHeight: 19, fontFamily: Typography.body, color: Palette.body },
  note: { fontSize: 13, lineHeight: 19, fontFamily: Typography.bodyMedium, color: Palette.espresso },
  diffs: {
    gap: 10,
    padding: 12,
    borderRadius: Radius.sm,
    backgroundColor: Palette.ivoryElevated,
  },
  diff: { gap: 2 },
  diffLabel: { fontSize: 10.5, letterSpacing: 0.6, fontFamily: Typography.bodySemiBold, color: Palette.label },
  diffFrom: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.muted,
    textDecorationLine: 'line-through',
  },
  diffTo: { fontSize: 14, fontFamily: Typography.bodySemiBold, color: Palette.espresso },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: Palette.liveOverlay },
  sheet: { gap: 12, padding: 20, borderRadius: Radius.lg, backgroundColor: Palette.ivory },
  input: { minHeight: 90, textAlignVertical: 'top' },
});
