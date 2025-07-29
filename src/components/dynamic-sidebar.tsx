
'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import type { User } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { SidebarHeader, SidebarFooter } from '@/components/ui/sidebar';
import MainNav from '@/components/main-nav';
import { ResetDatabaseButton } from '@/components/reset-database-button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useSidebar } from '@/hooks/use-sidebar';
import { useAuth } from '@/hooks/use-auth';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';

const ClientSidebar = dynamic(() => import('@/components/client-sidebar'), {
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

export default function DynamicSidebar({ children, user }: { children: React.ReactNode; user: User | null }) {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  
  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <ClientSidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          {children}
        </div>
      </SidebarHeader>

      <MainNav />

      <SidebarFooter className="p-4 border-t flex flex-col gap-4">
        {user && <ResetDatabaseButton userId={user.uid} />}
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || "User"} data-ai-hint="person" />
            <AvatarFallback>{getInitials(user?.displayName || null)}</AvatarFallback>
          </Avatar>
          {state === 'expanded' && user && (
            <div className="flex flex-col truncate">
              <span className="font-semibold text-sm truncate">{user.displayName}</span>
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
            </div>
          )}
           {state === 'expanded' && (
              <Button variant="ghost" size="icon" onClick={signOut} className="ml-auto">
                <LogOut className="h-4 w-4" />
              </Button>
           )}
        </div>
      </SidebarFooter>
    </ClientSidebar>
  );
}
