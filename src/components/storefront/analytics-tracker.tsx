'use client';

import * as React from 'react';
import { trackVisitorEvent } from '@/lib/db/analytics';

export function AnalyticsTracker() {
  React.useEffect(() => {
    // Only track once per browser session
    const sessionKey = 'jpsa_session_tracked';
    const isNew = !sessionStorage.getItem(sessionKey);
    if (isNew) {
      sessionStorage.setItem(sessionKey, '1');
    }

    const isMobile = window.innerWidth < 768;

    trackVisitorEvent({
      eventType: 'page_view',
      isNewVisitor: isNew,
      isMobile,
    }).catch(console.error);
  }, []);

  return null;
}
