import { Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/admin/page-header';
import { Sidebar } from './Sidebar';
import { ShellChromeProvider, useShellChrome } from './shell-chrome';

function ShellMain() {
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
      />
      <div className="min-h-0 flex-1 overflow-auto">
        {bleed ? (
          <Outlet />
        ) : (
          <div className="px-[30px] py-6">
            <Outlet />
          </div>
        )}
      </div>
    </main>
  );
}

/** Universal chrome: flush sidebar + shared header. Pages pass title/subtitle via usePageChrome. */
export function AppShell() {
  return (
    <ShellChromeProvider>
      <div className="fixed inset-0 flex overflow-hidden bg-sidebar">
        <Sidebar />
        <ShellMain />
      </div>
    </ShellChromeProvider>
  );
}
