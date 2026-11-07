import { Link, useNavigate } from 'react-router-dom';
import { ENVIRONMENT_LABELS, formatDate } from '@/utils/format';
import { StatusBadge } from '@/components/StatusBadge';
import type { Incident } from '@/types/incident';

export function IncidentTable({ incidents }: { incidents: Incident[] }) {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-edge text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">ID</th>
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Service</th>
            <th className="px-4 py-3 font-medium">Environment</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-edge">
          {incidents.map((incident) => (
            <tr
              key={incident.id}
              onClick={() => navigate(`/incidents/${incident.id}`)}
              className="cursor-pointer transition hover:bg-raised/60"
            >
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">{incident.incident_code || incident.id}</td>
              <td className="max-w-xs px-4 py-3 text-slate-100">
                <span className="line-clamp-1">{incident.title}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-300">{incident.service}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                {ENVIRONMENT_LABELS[incident.environment as keyof typeof ENVIRONMENT_LABELS] || incident.environment}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={incident.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                {formatDate(incident.createdAt || incident.created_at || new Date().toISOString())}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  to={`/incidents/${incident.id}`}
                  onClick={(event) => event.stopPropagation()}
                  className="text-sm font-medium text-violet-300 hover:text-violet-200"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
