
'use client';

import {
  ArrowLeftRight,
  Book,
  CreditCard,
  FileText,
  Gift,
  HandCoins,
  Home,
  LogIn,
  LogOut,
  Package,
  Presentation,
  ReceiptText,
  RotateCcw,
  Scale,
  ShoppingBag,
  ShoppingCart,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', icon: Home, label: 'Dashboard' },
    ],
  },
  {
    label: 'Selling',
    items: [
      { href: '/sales', icon: ShoppingCart, label: 'Sales' },
      { href: '/sales-returns', icon: RotateCcw, label: 'Sales Returns' },
      { href: '/packages', icon: Package, label: 'Packages' },
      { href: '/customers', icon: Users, label: 'Customers' },
      { href: '/receivables', icon: HandCoins, label: 'Receivables' },
    ],
  },
  {
    label: 'Buying',
    items: [
      { href: '/purchases', icon: ShoppingBag, label: 'Purchases' },
      { href: '/payables', icon: ReceiptText, label: 'Payables' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { href: '/items', icon: Book, label: 'Items' },
    ],
  },
  {
    label: 'Money',
    items: [
      { href: '/expenses', icon: CreditCard, label: 'Expenses' },
      { href: '/donations', icon: Gift, label: 'Donations' },
      { href: '/transfer', icon: ArrowLeftRight, label: 'Transfer' },
      { href: '/balance-sheet', icon: Scale, label: 'Balance Sheet' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { href: '/reports', icon: FileText, label: 'Monthly Report' },
      { href: '/authority-presentation', icon: Presentation, label: 'Authority Presentation' },
    ],
  },
];

const allNavItems = navGroups.flatMap((group) => group.items);

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
  // Exact match first so /sales-returns is not titled "Sales".
  const pageTitle =
    allNavItems.find((item) => pathname === item.href)?.label ||
    allNavItems.find((item) => pathname.startsWith(item.href + '/'))?.label ||
    'Dashboard';

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar>
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Book className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="font-headline text-xl font-semibold text-primary truncate">{authUser?.companyName || 'Store'}</h1>
                {authUser?.subtitle && <p className="text-xs text-muted-foreground truncate">{authUser.subtitle}</p>}
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-2">
            {navGroups.map((group) => (
              <SidebarGroup key={group.label} className="pb-0">
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
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
              </SidebarGroup>
            ))}
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
