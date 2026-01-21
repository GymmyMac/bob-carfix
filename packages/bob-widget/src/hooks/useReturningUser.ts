import { useState, useEffect } from 'react';

const STORAGE_KEY = 'bob_last_visit';
const RETURNING_THRESHOLD_DAYS = 30;

/**
 * Hook to detect returning users within a configurable time window.
 * Stores last visit timestamp in localStorage and checks if user
 * has visited within the threshold period.
 */
export function useReturningUser(thresholdDays: number = RETURNING_THRESHOLD_DAYS) {
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [lastVisitDate, setLastVisitDate] = useState<Date | null>(null);

  useEffect(() => {
    try {
      const lastVisit = localStorage.getItem(STORAGE_KEY);
      const now = Date.now();

      if (lastVisit) {
        const lastVisitTimestamp = parseInt(lastVisit, 10);
        const daysSinceVisit = (now - lastVisitTimestamp) / (1000 * 60 * 60 * 24);
        
        if (daysSinceVisit <= thresholdDays) {
          setIsReturningUser(true);
          setLastVisitDate(new Date(lastVisitTimestamp));
          console.log(`[BobWidget] Returning user detected - last visit ${Math.round(daysSinceVisit)} days ago`);
        } else {
          console.log(`[BobWidget] Previous visit was ${Math.round(daysSinceVisit)} days ago - treating as new user`);
        }
      } else {
        console.log('[BobWidget] First time visitor detected');
      }

      // Update last visit timestamp
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch (error) {
      // localStorage might be unavailable in some contexts
      console.warn('[BobWidget] Could not access localStorage for returning user detection:', error);
    }
  }, [thresholdDays]);

  return { 
    isReturningUser, 
    lastVisitDate,
    daysSinceLastVisit: lastVisitDate 
      ? Math.round((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24))
      : null
  };
}
