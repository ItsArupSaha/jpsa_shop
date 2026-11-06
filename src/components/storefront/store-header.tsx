'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Phone,
  ShoppingBag,
  Lock,
  Menu,
  X,
  Truck,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from './cart-context';
import { STORE_CONFIG } from '@/lib/store-config';

interface StoreHeaderProps {
  onSearchChange?: (q: string) => void;
  searchQuery?: string;
}

export function StoreHeader({ onSearchChange, searchQuery }: StoreHeaderProps) {
  const { cartCount, setIsCartOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 w-full shadow-md font-sans">
      {/* Top Thin Bar: Contact + Free Delivery + Staff Login */}
      <div className="bg-[#FAF7F2] text-[#4A154B] text-xs py-1 px-4 border-b border-[#EFEAE2]">
        <div className="container mx-auto flex items-center justify-between gap-2">
          {/* Phone Number in English */}
          <a
            href={`tel:${STORE_CONFIG.phone}`}
            className="hover:text-[#8B0032] transition-colors flex items-center gap-1.5 font-medium text-stone-700"
          >
            <Phone className="h-3 w-3 text-[#8B0032]" />
            <span>{STORE_CONFIG.phoneFormatted}</span>
          </a>

          {/* Strong Hook: Free Delivery across Bangladesh */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 font-bold text-[#8B0032] bg-[#FCE8EF] px-2.5 py-0.5 rounded-full text-[11px]">
              <Truck className="h-3 w-3 text-[#8B0032]" />
              <span>সারা দেশে সম্পূর্ণ ফ্রি হোম ডেলিভারি!</span>
            </span>

            <Link
              href="/login"
              className="text-stone-500 hover:text-[#8B0032] transition-colors flex items-center gap-1 text-[11px] font-medium ml-2"
              title="ম্যানেজমেন্ট লগইন"
            >
              <Lock className="h-3 w-3" />
              <span>Staff Login</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navbar - Exact Plum-to-Navy Gradient */}
      <div className="bg-gradient-to-r from-[#631038] via-[#3B1442] to-[#0D2447] text-white">
        <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          
          {/* Brand: JPS Archives BD Branch (Clicking works as Home) */}
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 group transition-transform active:scale-95"
            title="JPS Archives BD Branch - Home"
          >
            <div className="h-10 w-10 rounded-full bg-white/10 border border-[#F5B041]/70 flex items-center justify-center shadow-inner group-hover:border-[#F5B041] transition-colors">
              <BookOpen className="h-5 w-5 text-[#F5B041]" />
            </div>
            <div className="flex flex-col">
              <span className="font-headline font-bold text-lg sm:text-xl text-white tracking-wide leading-tight">
                JPS Archives
              </span>
              <span className="text-[11px] font-semibold text-[#F5B041] tracking-wider uppercase">
                BD Branch
              </span>
            </div>
          </Link>

          {/* Desktop Search Bar (Centered & Sleek) */}
          <div className="hidden md:flex items-center relative max-w-sm w-full mx-2">
            <Search className="absolute left-3.5 h-3.5 w-3.5 text-white/50 pointer-events-none" />
            <input
              type="text"
              value={searchQuery || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search books, authors..."
              className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 rounded-full pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-white/60 focus:outline-none focus:ring-1 focus:ring-[#F5B041] transition-all"
            />
          </div>

          {/* Desktop Navigation Links & Cart Button */}
          <div className="flex items-center gap-5">
            <nav className="hidden lg:flex items-center gap-5 text-sm font-medium">
              <a
                href="#books"
                className="text-white hover:text-[#F5B041] transition-colors py-1"
              >
                Books
              </a>
              <a
                href="#contact"
                className="text-white hover:text-[#F5B041] transition-colors py-1"
              >
                Contact
              </a>
            </nav>

            {/* Cart Button */}
            <Button
              onClick={() => setIsCartOpen(true)}
              className="bg-[#8B0032] hover:bg-[#6E0028] text-white rounded-full px-3.5 py-1.5 text-xs font-bold shadow-md flex items-center gap-1.5 transition-transform active:scale-95 border border-white/20"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Cart</span>
              <span className="bg-[#F5B041] text-[#3B1442] text-xs font-extrabold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-inner">
                {cartCount}
              </span>
            </Button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/10 bg-[#3B1442] px-4 py-3 space-y-3 font-sans text-sm text-white">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/50" />
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="Search books..."
                className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/60 focus:outline-none focus:ring-1 focus:ring-[#F5B041]"
              />
            </div>
            <nav className="flex flex-col space-y-2 pt-1">
              <a
                href="#books"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 border-b border-white/10 font-bold text-[#F5B041]"
              >
                Books
              </a>
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 border-b border-white/10 text-white hover:text-[#F5B041]"
              >
                Contact & Bank Details
              </a>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-stone-300 hover:text-white flex items-center gap-1.5 text-xs"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Staff Login</span>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
