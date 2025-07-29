
import * as React from 'react';
import { Book } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ResetDatabaseButton } from '@/components/reset-database-button';
import MainNav, { MainNavHeader } from '@/components/main-nav';
import DynamicSidebar from '@/components/dynamic-sidebar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <DynamicSidebar>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Book className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-headline text-2xl font-semibold text-primary">Bookstore</h1>
        </DynamicSidebar>

        <main className="flex-1">
          <MainNavHeader />
          <div className="p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
