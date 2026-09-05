import type { Offer, OfferStatus } from '@/data/types';

export function effectiveOfferStatus(offer: Offer): OfferStatus {
  if (offer.status === 'pending' && offer.expiresAt <= Date.now()) return 'expired';
  return offer.status;
}

export function formatOfferCountdown(expiresAt: number, now = Date.now()) {
  const ms = expiresAt - now;
  if (ms <= 0) return null;
  const totalMin = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

export function offerFooter(offer: Offer, status: OfferStatus, now = Date.now()): { text: string; warning: boolean } | null {
  if (status === 'pending') {
    const countdown = formatOfferCountdown(offer.expiresAt, now);
    if (countdown) return { text: `Expires in ${countdown}`, warning: true };
    return { text: 'No response within 24 hours', warning: false };
  }
  if (status === 'accepted') {
    return { text: 'Waiting for the buyer to start checkout', warning: false };
  }
  if (status === 'expired') {
    return { text: 'No response within 24 hours', warning: false };
  }
  return null;
}

export function offerChipLabel(status: OfferStatus) {
  return status.toUpperCase();
}
