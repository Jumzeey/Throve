export function FieldRow({
  label,
  children,
  restricted,
}: {
  label: string;
  children?: React.ReactNode;
  restricted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border-soft/80 py-2 last:border-0">
      <span className="shrink-0 text-[10px] font-semibold tracking-[0.1em] text-muted-2 uppercase">{label}</span>
      <span className="text-right text-[12.5px] text-espresso">
        {restricted ? <RestrictedValue /> : children}
      </span>
    </div>
  );
}

export function RestrictedValue() {
  return (
    <span className="inline-flex items-center rounded-[3px] border border-border-soft bg-panel-elevated px-1.5 py-0.5 text-[10.5px] font-semibold tracking-wide text-muted uppercase">
      Restricted
    </span>
  );
}
