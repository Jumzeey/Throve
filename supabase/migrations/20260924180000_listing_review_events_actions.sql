-- Extend listing_review_events actions for staff hide/restore/note/escalate.

alter table public.listing_review_events
  drop constraint if exists listing_review_events_action_check;

alter table public.listing_review_events
  add constraint listing_review_events_action_check
  check (
    action in (
      'submitted',
      'resubmitted',
      'approved',
      'rejected',
      'hidden',
      'restored',
      'note',
      'escalated'
    )
  );
