
import * as React from 'react';
import { Book } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { MainNavHeader } from '@/components/main-nav';
import DynamicSidebar from '@/components/dynamic-sidebar';
import { auth } from '@/lib/firebase';
import { redirect } from 'next/navigation';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const user = auth?.currentUser;

  if (!user) {
    redirect('/login');
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <DynamicSidebar user={user}>
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
