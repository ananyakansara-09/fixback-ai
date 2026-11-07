import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, Plus, Search } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { listIncidents } from '@/services/incidentService';
import { getSettings } from '@/services/dashboardService';
import { formatRelative } from '@/utils/format';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const incidents = useAsync(listIncidents);
  const settings = useAsync(getSettings);
  const pending = incidents.data?.filter((item) => item.status === 'awaiting_confirmation') ?? [];

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    navigate(`/incidents?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-edge bg-canvas/85 px-4 backdrop-blur md:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-md p-2 text-slate-400 hover:bg-raised hover:text-slate-100 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      <h1 className="truncate text-lg font-semibold text-slate-50">{title}</h1>

      <form onSubmit={submitSearch} className="ml-auto hidden w-full max-w-xs md:block">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search incidents or services"
            className="w-full rounded-lg border border-edge bg-panel py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
        </label>
      </form>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="relative rounded-lg border border-edge bg-panel p-2 text-slate-300 transition hover:border-slate-500 hover:text-white"
          aria-label="Notifications"
          aria-expanded={menuOpen}
        >
          <Bell className="h-4 w-4" aria-hidden />
          {pending.length > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-violet-400 ring-2 ring-canvas" />}
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-edge bg-panel shadow-card">
            <p className="border-b border-edge px-4 py-3 text-sm font-medium text-slate-100">Needs your confirmation</p>
            {pending.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No incidents are waiting for review.</p>
            ) : (
              <ul className="max-h-80 overflow-y-auto">
                {pending.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`/incidents/${item.id}`}
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-3 transition hover:bg-raised"
                    >
                      <p className="truncate text-sm text-slate-100">{item.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.id} · {formatRelative(item.createdAt)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <Link
        to="/analyze"
        className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-violet-500 px-3.5 py-2 text-sm font-medium text-white shadow-glow transition hover:bg-violet-400 active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">New Incident</span>
      </Link>

      <Link
        to="/settings"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/15 text-xs font-semibold text-blue-200 ring-1 ring-blue-400/30 transition hover:ring-blue-300/60"
        aria-label="Account settings"
      >
        {settings.data?.user.initials ?? '--'}
      </Link>
    </header>
  );
}
