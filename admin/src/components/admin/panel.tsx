import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function Panel({
  children,
  className,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <Card className={`rounded-[5px] border-border-soft bg-card shadow-none ${className ?? ''}`}>
      {title ? (
        <CardHeader className="border-b border-divider px-4 py-3">
          <CardTitle className="font-display text-[18px] font-normal text-espresso">{title}</CardTitle>
          {subtitle ? <CardDescription className="text-[11.5px] text-muted">{subtitle}</CardDescription> : null}
        </CardHeader>
      ) : null}
      <CardContent className={title ? 'p-4' : 'p-4 pt-4'}>{children}</CardContent>
    </Card>
  );
}
