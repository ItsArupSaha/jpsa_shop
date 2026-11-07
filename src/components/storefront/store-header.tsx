'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShoppingBag,
  Menu,
  X,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from './cart-context';

interface StoreHeaderProps {
  onSearchChange?: (q: string) => void;
  searchQuery?: string;
}

export function StoreHeader({ onSearchChange, searchQuery }: StoreHeaderProps) {
  const { cartCount, setIsCartOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 w-full shadow-md font-sans">
      {/* Main Navbar - Exact Plum-to-Navy Gradient */}
      <div className="bg-gradient-to-r from-[#631038] via-[#3B1442] to-[#0D2447] text-white">
        <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          
          {/* Brand: JPS Archives BD Branch (Clicking works as Home) */}
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 group transition-transform active:scale-95"
            title="JPS Archives BD Branch - Home"
          >
            <div className="relative h-11 w-11 overflow-hidden border border-[#F5B041]/80 shadow-md group-hover:border-[#F5B041] transition-all bg-white/10 flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="JPS Archives BD Branch Logo"
                fill
                sizes="44px"
                className="object-contain p-0.5"
                priority
              />
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
                className="py-2 text-white hover:text-[#F5B041]"
              >
                Contact
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
