export type TimelineEvent = {
  id: string;
  at: string;
  title: string;
  detail?: string;
  tone?: 'default' | 'warn' | 'danger' | 'ok';
};

const DOT: Record<NonNullable<TimelineEvent['tone']>, string> = {
  default: 'bg-muted-2',
  warn: 'bg-hold',
  danger: 'bg-risk',
  ok: 'bg-clear',
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative flex flex-col gap-0 border-l border-border-soft pl-4">
      {events.map((event) => (
        <li key={event.id} className="relative pb-4 last:pb-0">
          <span
            className={`absolute top-1.5 -left-[1.3rem] size-2 rounded-full ring-2 ring-card ${DOT[event.tone ?? 'default']}`}
          />
          <div className="text-[10.5px] tabular-nums text-muted-2">{event.at}</div>
          <div className="mt-0.5 text-[12.5px] font-semibold text-espresso">{event.title}</div>
          {event.detail ? <div className="mt-0.5 text-[11.5px] leading-snug text-body">{event.detail}</div> : null}
        </li>
      ))}
    </ol>
  );
}
