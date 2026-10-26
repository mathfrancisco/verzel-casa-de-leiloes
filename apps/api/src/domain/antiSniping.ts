const TWO_MINUTES = 120_000;

/** RN-09: a valid bid at most two minutes before closing gives everybody two more minutes. */
export function antiSniping(endsAt: Date, now: Date): Date | null {
  return endsAt.getTime() - now.getTime() <= TWO_MINUTES
    ? new Date(now.getTime() + TWO_MINUTES)
    : null;
}
