type EventParams = Record<string, string | number | boolean>;

export function trackEvent(eventName: string, params?: EventParams) {
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as any).gtag('event', eventName, params);
  }
}

export function trackSearch(method: 'gps' | 'text', query?: string) {
  trackEvent('search', { method, ...(query ? { query } : {}) });
}

export function trackStudioView(studioId: string, studioName: string) {
  trackEvent('studio_view', { studio_id: studioId, studio_name: studioName });
}

export function trackContactClick(
  type: 'naver' | 'kakao' | 'phone',
  studioId: string
) {
  trackEvent('contact_click', { type, studio_id: studioId });
}

export function trackFilterApply(filterType: string, value: string) {
  trackEvent('filter_apply', { filter_type: filterType, value });
}
