
'use client';

import * as React from 'react';
import { Sidebar } from '@/components/ui/sidebar';

export default function ClientSidebar({ children }: { children: React.ReactNode }) {
  return (
    <Sidebar side="left" collapsible="icon">
      {children}
    </Sidebar>
  );
}
