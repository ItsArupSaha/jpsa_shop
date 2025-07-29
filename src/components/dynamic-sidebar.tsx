
'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Sidebar, SidebarHeader, SidebarFooter } from '@/components/ui/sidebar';
import MainNav from '@/components/main-nav';
import { ResetDatabaseButton } from '@/components/reset-database-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSidebar } from '@/components/ui/sidebar';

const SidebarComponent = dynamic(() => import('@/components/client-sidebar'), {
  ssr: false,
  loading: () => (
    <div className="hidden md:block w-64 p-4 border-r">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 11 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
      <div className="absolute bottom-0 w-[calc(100%-2rem)] space-y-4 border-t py-4">
        <Skeleton className="h-9 w-full" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
    </div>
  ),
});

export default function DynamicSidebar({ children }: { children: React.ReactNode }) {
  const { state } = useSidebar();
  
  return (
    <SidebarComponent>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          {children}
        </div>
      </SidebarHeader>

      <MainNav />

      <SidebarFooter className="p-4 border-t flex flex-col gap-4">
        <ResetDatabaseButton />
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src="https://placehold.co/40x40" alt="User" data-ai-hint="person" />
            <AvatarFallback>SO</AvatarFallback>
          </Avatar>
          {state === 'expanded' && (
            <div className="flex flex-col truncate">
              <span className="font-semibold text-sm truncate">Store Owner</span>
              <span className="text-xs text-muted-foreground truncate">admin@example.com</span>
            </div>
          )}
        </div>
      </SidebarFooter>
    </SidebarComponent>
  );
}
