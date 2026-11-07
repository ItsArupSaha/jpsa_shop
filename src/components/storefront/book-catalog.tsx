'use client';

import * as React from 'react';
import { BookOpen, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Category, Item } from '@/lib/types';
import { BookCard } from './book-card';
import { getBookMetadata } from '@/lib/book-catalog-data';

interface BookCatalogProps {
  initialItems: Item[];
  categories: Category[];
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export function BookCatalog({
  initialItems,
  categories,
  searchQuery: externalSearchQuery,
  onSearchChange: setExternalSearchQuery,
}: BookCatalogProps) {
  const [internalSearch, setInternalSearch] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [sortBy, setSortBy] = React.useState<'default' | 'price-asc' | 'price-desc'>('default');

  const query = externalSearchQuery !== undefined ? externalSearchQuery : internalSearch;
  const setQuery = setExternalSearchQuery || setInternalSearch;

  // Filter and sort items
  const filteredItems = React.useMemo(() => {
    let list = [...initialItems];

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter((item) => {
        const meta = getBookMetadata(item.id, item.title);
        return (
          item.title?.toLowerCase().includes(q) ||
          meta.bengaliTitle?.toLowerCase().includes(q) ||
          meta.author?.toLowerCase().includes(q) ||
          item.author?.toLowerCase().includes(q) ||
          item.categoryName?.toLowerCase().includes(q)
        );
      });
    }

    if (selectedCategory !== 'all') {
      list = list.filter((item) => item.categoryId === selectedCategory);
    }

    if (sortBy === 'price-asc') {
      list.sort((a, b) => (a.sellingPrice || 0) - (b.sellingPrice || 0));
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => (b.sellingPrice || 0) - (a.sellingPrice || 0));
    }

    return list;
  }, [initialItems, query, selectedCategory, sortBy]);

  return (
    <section id="books" className="py-10 md:py-14 bg-[#FAF7F2] scroll-mt-16 md:scroll-mt-20">
      <div className="container mx-auto px-4">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3B1442]/10 text-[#3B1442] text-xs font-bold font-sans">
            <BookOpen className="h-3.5 w-3.5 text-[#8B0032]" />
            <span>Complete Collection</span>
          </div>
          <h2 className="font-headline font-bold text-2xl md:text-3xl lg:text-4xl text-[#1E2229]">
            সকল পারমার্থিক গ্রন্থ সম্ভার
          </h2>
          <p className="font-bengali text-stone-600 text-xs sm:text-sm">
            পছন্দের গ্রন্থ নির্বাচন করুন — সারা বাংলাদেশে ১০০% ফ্রি হোম ডেলিভারি!
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-3.5 md:p-4 rounded-2xl border border-[#EFEAE2] shadow-xs mb-6 space-y-3 font-sans">
          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="বইয়ের নাম বা লেখক খুঁজুন..."
                className="pl-9 bg-[#FAF7F2] border-[#EFEAE2] text-xs sm:text-sm h-10 rounded-xl font-bengali focus-visible:ring-[#8B0032]"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700"
                >
                  ক্লিয়ার
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-stone-500 hidden md:inline">ক্রমানুসার:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                aria-label="ক্রমানুসার নির্বাচন করুন"
                className="bg-[#FAF7F2] border border-[#EFEAE2] text-xs h-10 px-3 rounded-xl text-stone-800 font-sans focus:outline-none focus:ring-1 focus:ring-[#8B0032]"
              >
                <option value="default">Default Sorting</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Category Tabs */}
          {categories && categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#EFEAE2]">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors font-medium ${
                  selectedCategory === 'all'
                    ? 'bg-[#8B0032] text-white font-bold'
                    : 'bg-[#FAF7F2] text-stone-700 hover:bg-stone-200 border border-[#EFEAE2]'
                }`}
              >
                সব বই ({initialItems.length})
              </button>
              {categories.map((cat) => {
                const count = initialItems.filter((i) => i.categoryId === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-colors font-medium ${
                      selectedCategory === cat.id
                        ? 'bg-[#8B0032] text-white font-bold'
                        : 'bg-[#FAF7F2] text-stone-700 hover:bg-stone-200 border border-[#EFEAE2]'
                    }`}
                  >
                    {cat.name} {count > 0 ? `(${count})` : ''}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between mb-4 font-sans text-xs text-stone-500 px-1">
          <span>
            Showing <strong className="text-stone-800">{filteredItems.length}</strong> books
          </span>
          {selectedCategory !== 'all' && (
            <button
              onClick={() => setSelectedCategory('all')}
              className="text-[#8B0032] hover:underline font-medium"
            >
              সব বই পুনরায় দেখুন
            </button>
          )}
        </div>

        {/* Books Grid: 100% Mobile Friendly (2 columns on mobile, 3 on tablet, 4 on desktop) */}
        {filteredItems.length === 0 ? (
          <div className="py-14 text-center space-y-3 bg-white rounded-2xl border border-[#EFEAE2] p-8">
            <BookOpen className="h-10 w-10 text-stone-300 mx-auto" />
            <h3 className="font-headline font-bold text-lg text-stone-800">
              কোনো বই খুঁজে পাওয়া যায়নি
            </h3>
            <p className="font-bengali text-xs text-stone-500 max-w-sm mx-auto">
              অনুগ্রহ করে অন্য কোনো শব্দ দিয়ে সার্চ করুন অথবা ক্যাটাগরি ফিল্টার রিসেট করুন।
            </p>
            <button
              onClick={() => {
                setQuery('');
                setSelectedCategory('all');
              }}
              className="text-xs bg-[#4A154B] text-white px-4 py-2 rounded-xl font-sans"
            >
              সব বই দেখুন
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {filteredItems.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
