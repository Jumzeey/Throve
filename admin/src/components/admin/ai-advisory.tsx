import { Card, CardContent } from '@/components/ui/card';

export function AiAdvisory({
  kind = 'SUMMARY',
  children,
  recommendation,
}: {
  kind?: 'SUMMARY' | 'SIGNAL' | 'RECOMMENDATION' | 'INCIDENT SUMMARY' | 'CASE SUMMARY';
  children: React.ReactNode;
  recommendation?: React.ReactNode;
}) {
  return (
    <Card className="rounded-md border-dashed border-[#d9bfcf] bg-[#f4ecf1] shadow-none">
      <CardContent className="px-4 py-[15px]">
        <div className="mb-2.5 flex items-center gap-2">
          <span className="rounded-[3px] border border-plum-border bg-panel px-1.5 py-0.5 text-[9.5px] font-bold tracking-[0.14em] text-plum uppercase">
            AI {kind}
          </span>
          <span className="text-[10px] text-[#7a5a6b]">Advisory · no action taken</span>
        </div>
        <div className="text-[12.5px] leading-relaxed text-[#3e2b36]">{children}</div>
        {recommendation ? (
          <div className="mt-3 border-t border-[#e3d0db] pt-2.5">
            <div className="text-[11px] font-semibold text-plum">Recommended next action</div>
            <div className="mt-1 text-[12px] leading-relaxed text-[#3e2b36]">{recommendation}</div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-[#7a5a6b] italic">
              A recommendation only. Any restriction, decision or financial outcome requires an authorised human action.
            </p>
          </div>
        ) : (
          <div className="mt-3 border-t border-[#e3d0db] pt-2 text-[10.5px] text-[#7a5a6b]">
            Advisory · no action taken
          </div>
        )}
      </CardContent>
    </Card>
  );
}
