'use client';

import * as React from 'react';
import { Sparkles, Truck, Flame } from 'lucide-react';
import type { Item, PackageTemplate } from '@/lib/types';
import type { StoreHighlightsConfig } from '@/lib/store-highlights-types';
import { BookCard } from './book-card';
import { PackagesSection } from './packages-section';

interface HighlightsSectionProps {
  config: StoreHighlightsConfig;
  allItems: Item[];
  packages: PackageTemplate[];
}

export function HighlightsSection({ config, allItems, packages }: HighlightsSectionProps) {
  if (!config.showHighlightSection) return null;

  // Selected featured books from config (2 books)
  const featuredBooks = allItems.filter((item) =>
    config.featuredBookIds?.includes(item.id)
  );

  return (
    <section id="highlight" className="py-10 md:py-16 bg-[#FFFDF9] border-b border-[#EFEAE2] relative overflow-hidden">
      {/* Devotional subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#F5B041]/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="container mx-auto px-4 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FCE8EF] border border-[#8B0032]/20 text-[#8B0032] text-xs font-bold font-bengali shadow-xs">
            <Flame className="h-3.5 w-3.5 text-[#F5B041] fill-[#F5B041] animate-bounce" />
            <span>{config.highlightTag || 'বিশেষ আকর্ষণ • Spotlight'}</span>
          </div>

          <h2 className="font-headline font-bold text-2xl md:text-3xl lg:text-4xl text-[#1E2229]">
            {config.highlightTitle}
          </h2>

          <p className="font-bengali text-stone-600 text-xs sm:text-sm leading-relaxed">
            {config.highlightSubtitle}
          </p>

          <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200 mt-1">
            <Truck className="h-3.5 w-3.5 text-emerald-600" />
            <span>১০০% ফ্রি হোম ডেলিভারি — কোনো কুরিয়ার চার্জ নেই!</span>
          </div>
        </div>

        {/* Featured Glowing Books (Featured Duo) */}
        {featuredBooks.length > 0 && (
          <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {featuredBooks.map((book) => (
              <div
                key={book.id}
                className="relative rounded-3xl p-1 bg-gradient-to-br from-[#F5B041] via-[#8B0032] to-[#3B1442] shadow-[0_0_30px_rgba(245,176,65,0.45)] hover:shadow-[0_0_45px_rgba(245,176,65,0.7)] transition-all duration-300 group hover:-translate-y-1"
              >
                {/* Glowing Ribbon Badge */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 bg-gradient-to-r from-[#8B0032] via-[#F5B041] to-[#8B0032] text-white text-[11px] font-bold px-3.5 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-white/30 tracking-tight whitespace-nowrap">
                  <Sparkles className="h-3 w-3 text-white fill-white animate-spin" />
                  <span>Featured • বিশেষ আকর্ষণ</span>
                </div>

                <div className="bg-white rounded-[22px] overflow-hidden h-full flex flex-col justify-between p-1">
                  <BookCard book={book} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Festive Packages (Only shown when config.showPackages is true) */}
        {config.showPackages && packages && packages.length > 0 && (
          <div className="mt-12 pt-8 border-t border-[#EFEAE2]">
            <PackagesSection packages={packages} allItems={allItems} />
          </div>
        )}

      </div>
    </section>
  );
}
