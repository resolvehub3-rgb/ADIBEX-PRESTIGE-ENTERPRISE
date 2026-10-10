/**
 * Local site-visit counter.
 *
 * Counts visits from the current browser/device using localStorage so the
 * admin dashboard can show "how many people are visiting the site" without
 * requiring any extra database table. Each browser session is counted once,
 * so a simple page refresh never inflates the number.
 */

export interface SiteVisitStats {
  /** Total number of browser sessions counted on this device. */
  visits: number;
  /** Number of distinct days this device visited the site. */
  days: number;
  /** Number of sessions counted today. */
  today: number;
  /** ISO timestamp of the first recorded visit. */
  firstVisitAt: string | null;
  /** ISO timestamp of the most recent recorded visit. */
  lastVisitAt: string | null;
  /** YYYY-MM-DD (UTC) of the last counted visit, used for the daily rollover. */
  lastDay: string | null;
}

const STORAGE_KEY = 'adibex_site_visit_stats_v1';
const SESSION_KEY = 'adibex_site_visit_session_v1';

export const EMPTY_SITE_VISIT_STATS: SiteVisitStats = {
  visits: 0,
  days: 0,
  today: 0,
  firstVisitAt: null,
  lastVisitAt: null,
  lastDay: null,
};

const dayKey = (date: Date = new Date()): string => date.toISOString().slice(0, 10);

export function getSiteVisitStats(): SiteVisitStats {
  if (typeof window === 'undefined') return { ...EMPTY_SITE_VISIT_STATS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_SITE_VISIT_STATS };
    const parsed = JSON.parse(raw) as Partial<SiteVisitStats>;
    return { ...EMPTY_SITE_VISIT_STATS, ...parsed };
  } catch {
    return { ...EMPTY_SITE_VISIT_STATS };
  }
}

function persist(stats: SiteVisitStats): SiteVisitStats {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Storage unavailable (private mode / quota) — the counter simply stops growing.
  }
  return stats;
}

/**
 * Records one visit for this browser session. Safe to call on every app load:
 * repeat calls within the same session return the existing stats untouched.
 */
export function recordSiteVisit(): SiteVisitStats {
  if (typeof window === 'undefined') return { ...EMPTY_SITE_VISIT_STATS };

  try {
    if (window.sessionStorage.getItem(SESSION_KEY)) {
      return getSiteVisitStats();
    }
    window.sessionStorage.setItem(SESSION_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable → fall through and count the visit anyway.
  }

  const stats = getSiteVisitStats();
  const today = dayKey();
  const isNewDay = stats.lastDay !== today;

  return persist({
    ...stats,
    visits: stats.visits + 1,
    days: isNewDay ? stats.days + 1 : stats.days,
    today: isNewDay ? 1 : stats.today + 1,
    firstVisitAt: stats.firstVisitAt || new Date().toISOString(),
    lastVisitAt: new Date().toISOString(),
    lastDay: today,
  });
}

/** Clears the locally stored visit counter (admin action). */
export function resetSiteVisitStats(): SiteVisitStats {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  }
  return { ...EMPTY_SITE_VISIT_STATS };
}
