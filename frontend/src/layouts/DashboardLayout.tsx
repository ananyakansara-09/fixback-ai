import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '@/components/Header';
import { NAV_ITEMS, Sidebar } from '@/components/Sidebar';

const getPageTitle = (pathname: string) => {
  if (pathname.startsWith('/incidents/')) return 'AI Diagnosis';
  const match = NAV_ITEMS.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)));
  return match?.label ?? 'FixBack AI';
};

export function DashboardLayout() {
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-edge lg:block">
        <Sidebar />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} aria-label="Close navigation" />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-edge shadow-card animate-fade-up">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <Header title={getPageTitle(pathname)} onMenuClick={() => setDrawerOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
