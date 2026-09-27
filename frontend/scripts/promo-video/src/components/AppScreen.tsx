import React, { useId, useMemo } from 'react';
import { C, Screens } from '../assets';

/** Prefix every selector so multiple screens (phone + tablet CSS) can coexist on one page. */
export function scopeCss(css: string, scope: string) {
  return css.replace(/([^{}]+)\{([^{}]*)\}/g, (_m, sel: string, body: string) => {
    const scoped = sel
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => `${scope} ${s}`)
      .join(',');
    return `${scoped}{${body}}`;
  });
}

/**
 * Renders one of the shared HTML mockups at logical size. `css` holds per-frame overrides
 * (written unscoped), `children` are overlays positioned in the same logical coordinates.
 */
export const AppScreen: React.FC<{
  html: string;
  kind: 'phone' | 't10';
  width: number;
  height: number;
  css?: string;
  dark?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ html, kind, width, height, css = '', dark, style, children }) => {
  const scope = `s${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const base = useMemo(
    () =>
      `.${scope}{position:absolute;inset:0;overflow:hidden;font-family:Inter,sans-serif;color:${C.espresso};background:${dark ? C.liveDark : C.ivory};-webkit-font-smoothing:antialiased}` +
      `.${scope} *{box-sizing:border-box;margin:0;padding:0}` +
      scopeCss(Screens.appCss({ kind, hidden: 0 }), `.${scope}`),
    [scope, kind, dark],
  );
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width, height, ...style }}>
      <style>{base + scopeCss(css, `.${scope}`)}</style>
      <div className={scope} dangerouslySetInnerHTML={{ __html: html }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>{children}</div>
    </div>
  );
};
