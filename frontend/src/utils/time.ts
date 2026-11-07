export const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
