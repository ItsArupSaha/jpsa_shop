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
      <div className="container mx-auto px-4 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FCE8EF] border border-[#8B0032]/20 text-[#8B0032] text-xs font-bold font-bengali shadow-xs">
            <Flame className="h-3.5 w-3.5 text-[#F5B041] fill-[#F5B041]" />
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

        {/* Featured Books with Circling Border Animation */}
        {featuredBooks.length > 0 && (
          <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-10">
            {featuredBooks.map((book) => (
              <div key={book.id} className="relative group pt-3">
                {/* Ribbon Badge on top */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 bg-gradient-to-r from-[#5B0E33] via-[#8B0032] to-[#3B1442] text-white text-[11px] font-bold px-4 py-1 rounded-full shadow-[0_4px_14px_rgba(99,16,56,0.4)] flex items-center gap-1.5 border border-[#F5B041] whitespace-nowrap">
                  <Sparkles className="h-3.5 w-3.5 text-[#F5B041] fill-[#F5B041]" />
                  <span className="font-bengali font-bold text-white">বিশেষ আকর্ষণ</span>
                </div>

                {/* Card with Circling Border Color */}
                <div className="relative rounded-3xl p-1.5 sm:p-2 overflow-hidden shadow-md transition-transform duration-300 group-hover:-translate-y-1">
                  {/* Rotating Conic Gradient Beam */}
                  <div
                    className="absolute -inset-[100%] animate-[spin_5s_linear_infinite]"
                    style={{
                      background: 'conic-gradient(from 0deg, #F5B041 0deg, #8B0032 120deg, #3B1442 240deg, #F5B041 360deg)',
                    }}
                  />

                  {/* Inner Card Surface */}
                  <div className="relative bg-white rounded-[18px] sm:rounded-2xl overflow-hidden h-full p-1">
                    <BookCard book={book} />
                  </div>
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
