'use client';

import * as React from 'react';

interface YearContextType {
    selectedYear: number;
    setSelectedYear: (year: number) => void;
    isCurrentYear: boolean;
    currentYear: number;
}

const YearContext = React.createContext<YearContextType | undefined>(undefined);

export function YearProvider({ children }: { children: React.ReactNode }) {
    const currentYear = React.useMemo(() => new Date().getFullYear(), []);
    const [selectedYear, setSelectedYear] = React.useState<number>(currentYear);

    const isCurrentYear = selectedYear === currentYear;

    return (
        <YearContext.Provider value={{ selectedYear, setSelectedYear, isCurrentYear, currentYear }}>
            {children}
        </YearContext.Provider>
    );
}

export function useYear() {
    const context = React.useContext(YearContext);
    if (context === undefined) {
        throw new Error('useYear must be used within a YearProvider');
    }
    return context;
}

