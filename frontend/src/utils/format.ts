const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const formatDateTime = (iso: string) => dateTimeFormatter.format(new Date(iso));

export const formatDate = (iso: string) => dateFormatter.format(new Date(iso));

export const formatRelative = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
};

export const formatPercent = (score: number) => `${Math.round(score * 100)}%`;

export const ENVIRONMENT_LABELS = {
  development: 'Development',
  staging: 'Staging',
  production: 'Production',
} as const;

export const MEMORY_TYPE_LABELS = {
  incident_resolution: 'Incident resolution',
  runbook_note: 'Runbook note',
  postmortem: 'Postmortem',
} as const;
