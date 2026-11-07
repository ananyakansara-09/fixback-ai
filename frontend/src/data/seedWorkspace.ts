import type { ActivityEvent, SettingsPayload } from '@/types/dashboard';
import { hoursAgo } from '@/utils/time';

export const seedActivity: ActivityEvent[] = [
  {
    id: 'ACT-1024',
    type: 'incident_submitted',
    title: 'Incident submitted',
    description: 'INC-1052 reported from payment-api in production',
    incidentId: 'INC-1052',
    at: hoursAgo(2.5),
  },
  {
    id: 'ACT-1023',
    type: 'memory_recalled',
    title: 'Historical memory recalled',
    description: 'MEM-0101 matched INC-1052 with a 92% similarity score',
    incidentId: 'INC-1052',
    at: hoursAgo(2.4),
  },
  {
    id: 'ACT-1022',
    type: 'analysis_completed',
    title: 'AI analysis completed',
    description: 'Hypotheses generated for INC-1052, awaiting engineer review',
    incidentId: 'INC-1052',
    at: hoursAgo(2.4),
  },
  {
    id: 'ACT-1021',
    type: 'incident_submitted',
    title: 'Incident submitted',
    description: 'INC-1051 reported from auth-service in production',
    incidentId: 'INC-1051',
    at: hoursAgo(0.6),
  },
  {
    id: 'ACT-1020',
    type: 'memory_recalled',
    title: 'Historical memory recalled',
    description: 'MEM-0105 matched INC-1048 with an 84% similarity score',
    incidentId: 'INC-1048',
    at: hoursAgo(8.8),
  },
  {
    id: 'ACT-1019',
    type: 'root_cause_confirmed',
    title: 'Root cause confirmed',
    description: 'Engineer verified the root cause of INC-1050',
    incidentId: 'INC-1050',
    at: hoursAgo(24 + 1),
  },
  {
    id: 'ACT-1018',
    type: 'memory_retained',
    title: 'Memory retained',
    description: 'MEM-0103 saved to engineering memory from INC-1050',
    incidentId: 'INC-1050',
    at: hoursAgo(24 + 1),
  },
  {
    id: 'ACT-1017',
    type: 'root_cause_confirmed',
    title: 'Root cause confirmed',
    description: 'Engineer verified the root cause of INC-1049',
    incidentId: 'INC-1049',
    at: hoursAgo(24 * 2 + 2),
  },
  {
    id: 'ACT-1016',
    type: 'memory_retained',
    title: 'Memory retained',
    description: 'MEM-0104 saved to engineering memory from INC-1049',
    incidentId: 'INC-1049',
    at: hoursAgo(24 * 2 + 2),
  },
  {
    id: 'ACT-1015',
    type: 'memory_recalled',
    title: 'Historical memory recalled',
    description: 'MEM-0108 surfaced for a partner TLS query',
    incidentId: 'INC-1045',
    at: hoursAgo(24 * 9 + 1),
  },
];

export const seedSettings: SettingsPayload = {
  team: {
    name: 'Platform Reliability',
    slug: 'platform-reliability',
    plan: 'Team',
    members: [
      { id: 'u_01', name: 'Maya Chen', role: 'Staff SRE', initials: 'MC' },
      { id: 'u_02', name: 'Daniel Okafor', role: 'Backend Engineer', initials: 'DO' },
      { id: 'u_03', name: 'Priya Raman', role: 'Payments Engineer', initials: 'PR' },
      { id: 'u_04', name: 'Lucas Ferreira', role: 'Platform Engineer', initials: 'LF' },
      { id: 'u_05', name: 'Hana Sato', role: 'Security Engineer', initials: 'HS' },
    ],
  },
  user: {
    name: 'Maya Chen',
    role: 'Staff SRE',
    email: 'maya.chen@northwind.dev',
    initials: 'MC',
  },
  app: {
    version: '1.4.0',
    environment: 'Production',
    apiBaseUrl: 'http://localhost:8000/api',
    memoryNamespace: 'northwind-platform',
    model: 'llama-3.3-70b-versatile',
  },
};
