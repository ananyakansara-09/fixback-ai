import { NavLink } from 'react-router-dom';
import { BrainCircuit, History, LayoutDashboard, ScanSearch, Settings, Wrench } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { getSettings, getSystemHealth } from '@/services/dashboardService';

export const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/analyze', label: 'Analyze Incident', icon: ScanSearch, end: false },
  { to: '/incidents', label: 'Incident History', icon: History, end: false },
  { to: '/memory', label: 'Engineering Memory', icon: BrainCircuit, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const settings = useAsync(getSettings);
  const health = useAsync(getSystemHealth);
  const healthy = health.data?.status === 'ok';

  return (
    <div className="flex h-full flex-col bg-panel">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/30">
          <Wrench className="h-4 w-4" aria-hidden />
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-slate-50">FixBack AI</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition duration-150 ${
                isActive ? 'bg-violet-500/12 text-white ring-1 ring-violet-400/25' : 'text-slate-400 hover:bg-raised hover:text-slate-100'
              }`
            }
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t border-edge p-3">
        <div className="rounded-lg border border-edge bg-raised/60 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Engineering Team</p>
          <p className="mt-1 text-sm font-medium text-slate-100">{settings.data?.team.name ?? 'Loading...'}</p>
          <p className="text-xs text-slate-500">{settings.data ? `${settings.data.team.members.length} members` : ''}</p>
        </div>

        <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15 text-xs font-semibold text-blue-200">
            {settings.data?.user.initials ?? '--'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-100">{settings.data?.user.name ?? 'Signed in'}</p>
            <p className="truncate text-xs text-slate-500">{settings.data?.user.role ?? ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 text-xs text-slate-400">
          <span className={`h-2 w-2 rounded-full ${health.data ? (healthy ? 'bg-emerald-400' : 'bg-amber-400') : 'bg-slate-600'}`} />
          {health.data ? (healthy ? 'All systems operational' : 'Degraded performance') : 'Checking status...'}
        </div>
      </div>
    </div>
  );
}
