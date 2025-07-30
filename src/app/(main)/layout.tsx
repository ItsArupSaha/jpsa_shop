
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  LogOut,
  LogIn,
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
import { useAuth } from '@/hooks/use-auth';

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

function ProfileButton() {
    const { user, signOut } = useAuth();
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    const handleSignIn = () => {
        router.push('/login');
    };

    if (user) {
        return (
            <div className="flex w-full items-center gap-3">
                <Avatar>
                    <AvatarImage src={user.photoURL || `https://placehold.co/40x40.png`} alt={user.displayName || 'User'} data-ai-hint="person" />
                    <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col truncate flex-1">
                    <span className="font-semibold text-sm truncate" title={user.displayName || 'User'}>{user.displayName || 'User'}</span>
                    <span className="text-xs text-muted-foreground truncate" title={user.email || ''}>{user.email}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign Out">
                    <LogOut />
                </Button>
            </div>
        );
    }

    return (
        <Button onClick={handleSignIn} className="w-full">
            <LogIn className="mr-2 h-4 w-4" /> Sign In
        </Button>
    )
}


export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { authUser } = useAuth();
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
              <h1 className="font-headline text-2xl font-semibold text-primary">{authUser?.companyName || 'Bookstore'}</h1>
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
           <SidebarFooter className="p-4 border-t flex flex-col gap-4">
             <ProfileButton />
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
