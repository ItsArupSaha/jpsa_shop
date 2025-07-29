
import * as React from 'react';
import dynamic from 'next/dynamic';
import { Book } from 'lucide-react';

import { Sidebar, SidebarHeader, SidebarInset, SidebarFooter, SidebarProvider } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ResetDatabaseButton } from '@/components/reset-database-button';
import MainNav, { MainNavHeader } from '@/components/main-nav';
import { Skeleton } from '@/components/ui/skeleton';

const ClientSidebar = dynamic(() => import('@/components/client-sidebar'), {
  ssr: false,
  loading: () => (
    <div className="hidden md:block w-64 p-4">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 11 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
      <div className="mt-auto pt-4 space-y-4 border-t">
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

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <ClientSidebar>
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                 <Book className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="font-headline text-2xl font-semibold text-primary">Bookstore</h1>
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
              <div className="flex flex-col truncate">
                <span className="font-semibold text-sm truncate">Store Owner</span>
                <span className="text-xs text-muted-foreground truncate">admin@example.com</span>
              </div>
            </div>
          </SidebarFooter>
        </ClientSidebar>

        <SidebarInset className="max-w-full flex-1 overflow-y-auto">
          <MainNavHeader />
          <main className="p-4 sm:p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
