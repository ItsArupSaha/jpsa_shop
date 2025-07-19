
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Book,
  Home,
  CreditCard,
  ArrowRightLeft,
  FileText,
  ShoppingCart,
  Users,
  ShoppingBag,
  Scale,
  Gift,
} from 'lucide-react';

import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  SidebarProvider,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/books', icon: Book, label: 'Books' },
  { href: '/customers', icon: Users, label: 'Customers' },
  { href: '/sales', icon: ShoppingCart, label: 'Sales' },
  { href: '/purchases', icon: ShoppingBag, label: 'Purchases' },
  { href: '/donations', icon: Gift, label: 'Donations' },
  { href: '/expenses', icon: CreditCard, label: 'Expenses' },
  { href: '/receivables', icon: ArrowRightLeft, label: 'Receivables' },
  { href: '/payables', icon: ArrowRightLeft, label: 'Payables' },
  { href: '/reports', icon: FileText, label: 'Reports' },
  { href: '/balance-sheet', icon: Scale, label: 'Balance Sheet' },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageTitle = navItems.find(item => pathname.startsWith(item.href))?.label || 'Dashboard';
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar>
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                 <Book className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="font-headline text-2xl font-semibold text-primary">Bookstore</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-4">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
           <SidebarFooter className="p-4 border-t">
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
        </Sidebar>
        <SidebarInset className="max-w-full flex-1 overflow-y-auto">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden" />
              <h2 className="font-headline text-2xl">
                {pageTitle}
              </h2>
            </div>
          </header>
          <main className="p-4 sm:p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
