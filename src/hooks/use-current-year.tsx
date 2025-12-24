'use client';

import * as React from 'react';

/**
 * Hook to check if we're in the current year
 * Useful for disabling modifications when viewing previous years
 */
export function useIsCurrentYear(selectedYear?: number): boolean {
    const currentYear = React.useMemo(() => new Date().getFullYear(), []);
    return selectedYear === undefined || selectedYear === currentYear;
}

