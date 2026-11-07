import { getCategories, getItems, getPackages } from '@/lib/actions';
import { STORE_CONFIG } from '@/lib/store-config';
import { getStoreHighlights } from '@/lib/store-highlights';
import { CartProvider } from '@/components/storefront/cart-context';
import { StoreHeader } from '@/components/storefront/store-header';
import { HeroSection } from '@/components/storefront/hero-section';
import { HighlightsSection } from '@/components/storefront/highlights-section';
import { BookCatalog } from '@/components/storefront/book-catalog';
import { CartDrawer } from '@/components/storefront/cart-drawer';
import { StoreFooter } from '@/components/storefront/store-footer';
import { AnalyticsTracker } from '@/components/storefront/analytics-tracker';

export const revalidate = 60;

export default async function StorefrontPage() {
  const ownerUid = STORE_CONFIG.ownerUid;

  // Parallel data fetching
  const [items, categories, packages, highlightsConfig] = await Promise.all([
    getItems(ownerUid).catch(() => []),
    getCategories(ownerUid).catch(() => []),
    getPackages(ownerUid).catch(() => []),
    getStoreHighlights(ownerUid).catch(() => null),
  ]);

  return (
    <CartProvider>
      <AnalyticsTracker />
      <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#1E2229] selection:bg-[#FCE8EF] selection:text-[#8B0032]">
        
        {/* Victory Flag Plum-Navy Navbar */}
        <StoreHeader />

        <main className="flex-1">
          {/* Hero Section with Picture Frame & Conditional Package CTA */}
          <HeroSection
            showPackages={Boolean(highlightsConfig?.showPackages && packages && packages.length > 0)}
          />

          {/* 100% Flexible Highlight Section (After Hero) */}
          {highlightsConfig && (
            <HighlightsSection
              config={highlightsConfig}
              allItems={items}
              packages={packages}
            />
          )}

          {/* Complete Bengali Book Catalog with Mobile Friendly Grid */}
          <BookCatalog initialItems={items} categories={categories} />
        </main>

        {/* Sliding Shopping Cart & Free Shipping Checkout Drawer */}
        <CartDrawer />

        {/* Victory Flag Dark Slate Footer */}
        <StoreFooter />
      </div>
    </CartProvider>
  );
}
