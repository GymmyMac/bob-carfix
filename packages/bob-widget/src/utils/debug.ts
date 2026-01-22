/**
 * Debug utilities for Bob Widget
 * 
 * Enable debug mode by:
 * - Setting localStorage: localStorage.setItem('bob_debug', 'true')
 * - Adding URL param: ?bob_debug=true
 */

const isDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    return (
      window.localStorage?.getItem('bob_debug') === 'true' ||
      new URLSearchParams(window.location.search).has('bob_debug')
    );
  } catch {
    return false;
  }
};

const DEBUG = isDebugEnabled();

/**
 * Log debug messages (only in debug mode)
 */
export const bobLog = (...args: unknown[]): void => {
  if (DEBUG) {
    console.log('[BobWidget]', ...args);
  }
};

/**
 * Log warnings (only in debug mode)
 */
export const bobWarn = (...args: unknown[]): void => {
  if (DEBUG) {
    console.warn('[BobWidget]', ...args);
  }
};

/**
 * Log errors (always logged, not gated by debug mode)
 */
export const bobError = (...args: unknown[]): void => {
  console.error('[BobWidget]', ...args);
};

/**
 * Check if debug mode is enabled
 */
export const isBobDebug = (): boolean => DEBUG;
