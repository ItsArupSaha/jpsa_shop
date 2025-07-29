
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
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useSidebar } from '@/hooks/use-sidebar';

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

export function MainNavHeader() {
    const pathname = usePathname();
    const pageTitle = navItems.find(item => pathname.startsWith(item.href))?.label || 'Dashboard';
    
    return (
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden" />
              <h2 className="font-headline text-2xl">
                {pageTitle}
              </h2>
            </div>
        </header>
    )
}

export default function MainNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  
  return (
    <SidebarContent className="p-4" onClick={() => setOpenMobile(false)}>
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
  );
}
