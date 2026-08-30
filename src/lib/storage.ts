/**
 * Safe LocalStorage utility that gracefully handles QuotaExceededError and prevents uncaught crashes.
 */

export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    console.warn(`[safeSetItem] Error writing key "${key}" to localStorage:`, error?.name || error);

    // If quota exceeded, attempt cleanup of large items or retry with sanitized data
    if (error?.name === "QuotaExceededError" || error?.name === "NS_ERROR_DOM_QUOTA_REACHED" || error?.code === 22) {
      try {
        // If the key is cached_machines, sanitize by stripping large base64 data URIs
        if (key === "cached_machines") {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              const lightweight = parsed.map((m: any) => ({
                ...m,
                imageUrl: (m.imageUrl && m.imageUrl.startsWith("data:")) ? "" : m.imageUrl,
                imageUrls: Array.isArray(m.imageUrls) 
                  ? m.imageUrls.map((u: any) => (typeof u === "string" && u.startsWith("data:")) ? "" : u).filter(Boolean)
                  : []
              }));
              localStorage.setItem(key, JSON.stringify(lightweight));
              return true;
            }
          } catch {}
        }

        // Try removing old non-critical caches
        localStorage.removeItem("cached_machines");
        localStorage.removeItem("cached_free_workout_logs");
        
        // Retry setting item once after clearing caches
        localStorage.setItem(key, value);
        return true;
      } catch (innerError) {
        console.warn(`[safeSetItem] Failed to write "${key}" even after cache cleanup. Skipping local cache.`);
        return false;
      }
    }
    return false;
  }
}

export function safeGetItem(key: string): string | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`[safeGetItem] Error reading key "${key}" from localStorage:`, error);
    return null;
  }
}

export function safeRemoveItem(key: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
  } catch {}
}
