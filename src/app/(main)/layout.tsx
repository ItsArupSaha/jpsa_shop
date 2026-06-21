
'use client';

import {
  ArrowLeftRight,
  ArrowRightLeft,
  Book,
  CreditCard,
  FileText,
  Gift,
  Home,
  LogIn,
  LogOut,
  Package,
  Presentation,
  RotateCcw,
  Scale,
  ShoppingBag,
  ShoppingCart,
  Users,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { getItems } from '@/lib/actions';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/items', icon: Book, label: 'Items' },
  { href: '/expiry-alerts', icon: AlertTriangle, label: 'Expiry Alerts' },
  { href: '/packages', icon: Package, label: 'Packages' },
  { href: '/customers', icon: Users, label: 'Customers' },
  { href: '/sales', icon: ShoppingCart, label: 'Sales' },
  { href: '/sales-returns', icon: RotateCcw, label: 'Sales Returns' },
  { href: '/purchases', icon: ShoppingBag, label: 'Purchases' },
  { href: '/donations', icon: Gift, label: 'Donations' },
  { href: '/expenses', icon: CreditCard, label: 'Expenses' },
  { href: '/transfer', icon: ArrowLeftRight, label: 'Transfer' },
  { href: '/receivables', icon: ArrowRightLeft, label: 'Receivables' },
  { href: '/payables', icon: ArrowRightLeft, label: 'Payables' },
  { href: '/reports', icon: FileText, label: 'Reports' },
  { href: '/balance-sheet', icon: Scale, label: 'Balance Sheet' },
  { href: '/authority-presentation', icon: Presentation, label: 'Authority presentation' },
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
  const { authUser, user } = useAuth();
  const [alertCount, setAlertCount] = React.useState(0);
  const pageTitle = navItems.find(item => pathname.startsWith(item.href))?.label || 'Dashboard';

  React.useEffect(() => {
    if (user) {
      getItems(user.uid).then(items => {
        const now = new Date();
        const oneMonthFromNow = new Date();
        oneMonthFromNow.setDate(now.getDate() + 30);
        const count = items.filter(item => item.expiryDate && new Date(item.expiryDate) <= oneMonthFromNow).length;
        setAlertCount(count);
      }).catch(err => console.error("Failed to fetch alert count for sidebar:", err));
    }
  }, [user, pathname]); // Re-fetch on path name change to update badges when editing/deleting

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar>
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Book className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <h1 className="font-headline text-2xl font-semibold text-primary">{authUser?.companyName || 'Store'}</h1>
                {authUser?.subtitle && <p className="text-xs text-muted-foreground">{authUser.subtitle}</p>}
              </div>
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
                    <Link href={item.href} className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-2">
                        <item.icon />
                        <span>{item.label}</span>
                      </div>
                      {item.href === '/expiry-alerts' && alertCount > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground animate-pulse">
                          {alertCount}
                        </span>
                      )}
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
