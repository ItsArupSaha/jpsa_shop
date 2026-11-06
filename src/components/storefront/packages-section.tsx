'use client';

import * as React from 'react';
import { Gift, Sparkles, CheckCircle2, ShoppingBag, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Item, PackageTemplate } from '@/lib/types';
import { useCart } from './cart-context';
import { formatTakaPrice } from '@/lib/store-config';
import { trackVisitorEvent } from '@/lib/db/analytics';

interface PackagesSectionProps {
  packages: PackageTemplate[];
  allItems: Item[];
}

export function PackagesSection({ packages, allItems }: PackagesSectionProps) {
  const { addPackageToCart } = useCart();

  if (!packages || packages.length === 0) {
    return null;
  }

  const handleAddPackage = (pkg: PackageTemplate) => {
    trackVisitorEvent({ eventType: 'package_click', packageName: pkg.name }).catch(console.error);
    addPackageToCart(pkg, allItems);
  };

  return (
    <div id="packages" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FCE8EF] border border-[#8B0032]/20 text-[#8B0032] text-xs font-bold font-bengali mb-1.5">
            <Gift className="h-3.5 w-3.5 text-[#8B0032]" />
            <span>উৎসব ও বিশেষ প্যাকেজ সম্ভার</span>
          </div>
          <h3 className="font-headline font-bold text-2xl md:text-3xl text-[#1E2229]">
            Book Bundles & Packages (গ্রন্থ সংকলন)
          </h3>
          <p className="font-bengali text-xs sm:text-sm text-stone-600">
            একসাথে আকর্ষণীয় গ্রন্থের সংকলন এবং বিশেষ আশীর্বাদস্বরূপ অপ্রাকৃত উপহার সামগ্রী
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shrink-0">
          <Truck className="h-4 w-4" />
          <span>প্যাকেজেও ডেলিভারি ফ্রি!</span>
        </div>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {packages.map((pkg) => {
          let packagePrice = 0;
          const containedItems = pkg.items.map((pi) => {
            const full = allItems.find((i) => i.id === pi.itemId);
            if (full) {
              packagePrice += (full.sellingPrice || 0) * (pi.quantity || 1);
            }
            return {
              title: full?.title || 'গ্রন্থ',
              quantity: pi.quantity || 1,
            };
          });

          return (
            <div
              key={pkg.id}
              className="rounded-2xl bg-white border border-[#EFEAE2] hover:border-[#8B0032]/40 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between relative overflow-hidden"
            >
              {/* Top Accent line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#631038] via-[#8B0032] to-[#0D2447]" />

              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-headline font-bold text-xl text-[#1E2229]">
                    {pkg.name}
                  </h4>
                  <Badge className="bg-[#FAF7F2] text-[#4A154B] border-[#EFEAE2] font-sans font-bold text-[11px] shrink-0">
                    Bundle
                  </Badge>
                </div>

                {pkg.description && (
                  <p className="font-bengali text-xs text-stone-600 mb-3 leading-relaxed">
                    {pkg.description}
                  </p>
                )}

                {/* Included Books */}
                <div className="space-y-1.5 mb-3 bg-[#FAF7F2] p-3 rounded-xl border border-[#EFEAE2] font-bengali text-xs">
                  <span className="font-bold text-[#1E2229] block text-[11px]">
                    অন্তর্ভুক্ত গ্রন্থসমূহ ({containedItems.length}টি):
                  </span>
                  <ul className="space-y-1 text-stone-600">
                    {containedItems.slice(0, 5).map((ci, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-[#8B0032] shrink-0" />
                        <span className="truncate">{ci.title}</span>
                        {ci.quantity > 1 && (
                          <span className="text-[10px] text-stone-800 font-bold">
                            ({ci.quantity}টি)
                          </span>
                        )}
                      </li>
                    ))}
                    {containedItems.length > 5 && (
                      <li className="text-[11px] text-[#8B0032] font-semibold pl-4">
                        + আরও {containedItems.length - 5}টি গ্রন্থ
                      </li>
                    )}
                  </ul>
                </div>

                {/* Included Gifts */}
                {pkg.gifts && pkg.gifts.length > 0 && (
                  <div className="mb-4 bg-[#FCE8EF]/50 p-2.5 rounded-xl border border-[#8B0032]/20 font-bengali text-xs">
                    <div className="flex items-center gap-1 font-bold text-[#8B0032] mb-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>বিশেষ উপহার সামগ্রী:</span>
                    </div>
                    <ul className="space-y-0.5 text-stone-700 text-[11px]">
                      {pkg.gifts.map((gift, gIdx) => (
                        <li key={gIdx} className="flex items-center gap-1">
                          <span className="text-[#8B0032]">•</span>
                          <span>{gift}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Price & CTA */}
              <div className="pt-3 border-t border-[#EFEAE2] flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-stone-500 font-sans block">প্যাকেজ মূল্য</span>
                  <span className="font-headline font-bold text-xl text-[#8B0032]">
                    {formatTakaPrice(packagePrice)}
                  </span>
                </div>
                <Button
                  onClick={() => handleAddPackage(pkg)}
                  className="bg-[#4A154B] hover:bg-[#38103A] text-white font-sans text-xs font-bold rounded-xl px-4 py-2 flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>অর্ডার করুন</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
