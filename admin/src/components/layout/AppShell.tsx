import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PageHeader } from '@/components/admin/page-header';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Sidebar, SidebarNav } from './Sidebar';
import { ShellChromeProvider, useShellChrome } from './shell-chrome';

function ShellMain({ onOpenNav }: { onOpenNav: () => void }) {
  const { chrome } = useShellChrome();

  const title = chrome?.title ?? 'Admin';
  const subtitle = chrome?.subtitle;
  const showSearch = !chrome?.hideSearch && (!!chrome?.onSearchChange || !!chrome?.searchPlaceholder);
  const bleed = !!chrome?.bleed;

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-ground">
      <PageHeader
        variant="shell"
        title={title}
        subtitle={subtitle}
        search={showSearch ? (chrome?.search ?? '') : undefined}
        onSearchChange={showSearch ? chrome?.onSearchChange : undefined}
        searchPlaceholder={chrome?.searchPlaceholder ?? 'Search…'}
        onMenuClick={onOpenNav}
      />
      <div className="min-h-0 flex-1 overflow-auto">
        {bleed ? (
          <Outlet />
        ) : (
          <div className="px-4 py-4 md:px-[30px] md:py-6">
            <Outlet />
          </div>
        )}
      </div>
    </main>
  );
}

/** Universal chrome: flush sidebar + shared header. Pages pass title/subtitle via usePageChrome. */
export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <ShellChromeProvider>
      <div className="fixed inset-0 flex overflow-hidden bg-sidebar">
        <Sidebar />
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent
            side="left"
            showCloseButton
            className="w-[280px] max-w-[85vw] gap-0 border-r-0 bg-sidebar p-0 text-panel sm:max-w-[280px]"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarNav onNavigate={() => setNavOpen(false)} />
          </SheetContent>
        </Sheet>
        <ShellMain onOpenNav={() => setNavOpen(true)} />
      </div>
    </ShellChromeProvider>
  );
}
