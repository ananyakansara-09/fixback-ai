import { Route, Routes } from 'react-router-dom';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { EmptyState } from '@/components/EmptyState';
import Dashboard from '@/pages/Dashboard';
import AnalyzeIncident from '@/pages/AnalyzeIncident';
import IncidentDetails from '@/pages/IncidentDetails';
import IncidentHistory from '@/pages/IncidentHistory';
import MemoryExplorer from '@/pages/MemoryExplorer';
import Settings from '@/pages/Settings';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="analyze" element={<AnalyzeIncident />} />
        <Route path="incidents" element={<IncidentHistory />} />
        <Route path="incidents/:id" element={<IncidentDetails />} />
        <Route path="memory" element={<MemoryExplorer />} />
        <Route path="settings" element={<Settings />} />
        <Route
          path="*"
          element={
            <EmptyState
              title="Page not found"
              description="The page you are looking for does not exist or has moved."
              action={
                <a href="/" className="rounded-lg bg-violet-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-violet-400">
                  Back to overview
                </a>
              }
            />
          }
        />
      </Route>
    </Routes>
  );
}
