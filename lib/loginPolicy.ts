// Shared by the login guard and admin monitoring; keep UI counts aligned with
// the actual protection rules rather than maintaining separate thresholds.
export const LOGIN_FAIL_LIMIT = 40;
export const LOGIN_BURST_LIMIT = 30;

export function activeLoginLockWhere(now: Date) {
  return { OR: [
    { failCount: { gte: LOGIN_FAIL_LIMIT }, failExpiresAt: { gte: now } },
    { burstCount: { gte: LOGIN_BURST_LIMIT }, burstExpiresAt: { gte: now } },
  ] };
}

export function isThrottleLocked(row: {
  failCount: number; failExpiresAt: string | Date | null;
  burstCount: number; burstExpiresAt: string | Date | null;
}, now = Date.now()) {
  return Boolean(
    (row.failCount >= LOGIN_FAIL_LIMIT && row.failExpiresAt && new Date(row.failExpiresAt).getTime() >= now) ||
    (row.burstCount >= LOGIN_BURST_LIMIT && row.burstExpiresAt && new Date(row.burstExpiresAt).getTime() >= now)
  );
}
