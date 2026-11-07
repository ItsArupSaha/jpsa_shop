'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Book, Check, Eye, Plus, ShoppingCart, Sparkles, Star, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Item } from '@/lib/types';
import { useCart } from './cart-context';
import { formatTakaPrice, getStockStatus } from '@/lib/store-config';
import { getBookMetadata } from '@/lib/book-catalog-data';
import { trackVisitorEvent } from '@/lib/db/analytics';

interface BookCardProps {
  book: Item;
}

export function BookCard({ book }: BookCardProps) {
  const { addToCart, setIsCartOpen } = useCart();
  const [justAdded, setJustAdded] = React.useState(false);

  const meta = getBookMetadata(book.id, book.title);
  const stockInfo = getStockStatus(book.stock);
  const coverImage = book.coverImageUrl || meta.image || '';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!stockInfo.isAvailable) return;

    trackVisitorEvent({ eventType: 'add_to_cart', bookId: book.id }).catch(console.error);
    const added = addToCart(
      {
        ...book,
        title: meta.bengaliTitle || book.title,
        coverImageUrl: coverImage || undefined,
      },
      1
    );
    if (added) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1500);
    }
  };

  return (
    <div className="group rounded-2xl bg-white border border-[#EFEAE2] hover:border-[#8B0032]/40 shadow-xs hover:shadow-[0_12px_28px_rgba(59,20,66,0.1)] hover:-translate-y-1 transition-all duration-300 ease-out p-2.5 sm:p-4 flex flex-col justify-between relative overflow-hidden">
      
      {/* Top Floating Badges (Stock on Top Right) */}
      <div className="flex items-center justify-end mb-2">
        {/* Stock Badge (5-preservation safety rule) */}
        <span className={`text-[10px] font-bengali px-2 py-0.5 rounded-full border ${stockInfo.badgeClass}`}>
          {stockInfo.text}
        </span>
      </div>

      {/* Book Cover Image Container (Unrounded, Edge-to-Edge, Zero Padding, Smooth Zoom) */}
      <Link
        href={`/book/${book.id}`}
        onClick={() => trackVisitorEvent({ eventType: 'book_view', bookId: book.id }).catch(console.error)}
        className="block relative aspect-[2/3] w-full overflow-hidden bg-[#FAF7F2] border border-[#EFEAE2] group-hover:border-[#8B0032]/30 mb-3 group/cover shadow-xs transition-colors duration-300"
      >
        {coverImage ? (
          <Image
            src={coverImage}
            alt={meta.bengaliTitle}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px"
            className="object-contain transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-gradient-to-b from-[#FAF7F2] to-[#F5EFE6] select-none transition-transform duration-500 ease-out group-hover:scale-105">
            <div className="w-10 h-10 rounded-full bg-stone-200/70 flex items-center justify-center mb-2 text-stone-400">
              <Book className="h-5 w-5 stroke-[1.5]" />
            </div>
            <span className="font-headline font-bold text-xs text-stone-600 line-clamp-2 px-1">
              {meta.bengaliTitle}
            </span>
          </div>
        )}

        {/* Hover Quick Overlay (Smooth fade + slide-up pill, crisp image preserved) */}
        <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out flex items-center justify-center z-10 pointer-events-none">
          <span className="bg-white/95 text-[#3B1442] font-bengali text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border border-stone-200 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 ease-out">
            <Eye className="h-3.5 w-3.5 text-[#8B0032]" /> বিস্তারিত দেখুন
          </span>
        </div>
      </Link>

      {/* Book Titles & Author */}
      <div className="space-y-1 mb-3 flex-1">
        <Link
          href={`/book/${book.id}`}
          className="font-headline font-bold text-xs sm:text-sm md:text-base text-[#1E2229] group-hover:text-[#8B0032] transition-colors line-clamp-2 leading-snug"
        >
          {meta.bengaliTitle}
        </Link>
        <p className="font-bengali text-[11px] sm:text-xs text-stone-500 truncate">
          By {meta.author}
        </p>

        {/* Star Rating Display */}
        <div className="flex items-center gap-0.5 pt-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className="h-3 w-3 fill-[#F5B041] text-[#F5B041]" />
          ))}
        </div>
      </div>

      {/* Price & Action Buttons */}
      <div className="pt-2.5 border-t border-[#EFEAE2] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-headline font-bold text-base sm:text-lg text-[#8B0032]">
            {formatTakaPrice(book.sellingPrice)}
          </span>
          <span className="text-[10px] font-bengali font-bold bg-[#FCE8EF] text-[#8B0032] px-2 py-0.5 rounded-full flex items-center gap-1">
            <Truck className="h-2.5 w-2.5" /> ফ্রি ডেলিভারি
          </span>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-2 gap-1.5 font-bengali text-xs">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-[#4A154B] text-[#4A154B] hover:bg-[#4A154B] hover:text-white h-8 sm:h-9 rounded-xl font-bold text-[11px] sm:text-xs"
          >
            <Link href={`/book/${book.id}`}>
              বিস্তারিত
            </Link>
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={!stockInfo.isAvailable}
            onClick={handleAddToCart}
            className="bg-[#8B0032] hover:bg-[#6E0028] text-white h-8 sm:h-9 rounded-xl font-bold text-[11px] sm:text-xs shadow-xs"
          >
            {justAdded ? (
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-white" /> যোগ হয়েছে
              </span>
            ) : (
              <span>কার্টে রাখুন</span>
            )}
          </Button>
        </div>
      </div>

    </div>
  );
}
