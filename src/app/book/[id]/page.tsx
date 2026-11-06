import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getItems } from '@/lib/actions';
import { STORE_CONFIG } from '@/lib/store-config';
import { getBookMetadata } from '@/lib/book-catalog-data';
import { CartProvider } from '@/components/storefront/cart-context';
import { StoreHeader } from '@/components/storefront/store-header';
import { CartDrawer } from '@/components/storefront/cart-drawer';
import { StoreFooter } from '@/components/storefront/store-footer';
import { BookDetailView } from '@/components/storefront/book-detail-view';

export const revalidate = 60;

interface BookPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookPage({ params }: BookPageProps) {
  const { id } = await params;
  const ownerUid = STORE_CONFIG.ownerUid;

  const allItems = await getItems(ownerUid).catch(() => []);
  const book = allItems.find((b) => b.id === id);

  if (!book) {
    notFound();
  }

  const meta = getBookMetadata(book.id, book.title);

  // 4 Related books
  const relatedBooks = allItems
    .filter((b) => b.id !== book.id)
    .slice(0, 4);

  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#1E2229]">
        <StoreHeader />

        <main className="flex-1">
          {/* Breadcrumb Navigation */}
          <div className="bg-white border-b border-[#EFEAE2] py-2.5 px-4 font-sans text-xs text-stone-500">
            <div className="container mx-auto flex items-center gap-2">
              <Link href="/" className="hover:text-[#8B0032]">
                Home
              </Link>
              <span>/</span>
              <Link href="/#books" className="hover:text-[#8B0032]">
                Books
              </Link>
              <span>/</span>
              <span className="text-[#1E2229] font-medium truncate max-w-xs md:max-w-md">
                {meta.bengaliTitle}
              </span>
            </div>
          </div>

          {/* Book Detail & Reviews & Related Section */}
          <BookDetailView
            book={book}
            meta={meta}
            relatedBooks={relatedBooks}
          />
        </main>

        <CartDrawer />
        <StoreFooter />
      </div>
    </CartProvider>
  );
}
