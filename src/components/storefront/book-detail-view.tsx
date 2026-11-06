'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Check,
  CheckCircle2,
  Copy,
  Facebook,
  Heart,
  MessageCircle,
  Minus,
  Plus,
  RotateCcw,
  Send,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { Item } from '@/lib/types';
import type { BookMetadata } from '@/lib/book-catalog-data';
import { useCart } from './cart-context';
import { formatTakaPrice, getStockStatus } from '@/lib/store-config';
import { BookCard } from './book-card';
import { trackVisitorEvent } from '@/lib/db/analytics';

interface BookDetailViewProps {
  book: Item;
  meta: BookMetadata;
  relatedBooks: Item[];
}

export function BookDetailView({ book, meta, relatedBooks }: BookDetailViewProps) {
  const { addToCart, setIsCartOpen } = useCart();
  const { toast } = useToast();

  const coverImage = book.coverImageUrl || meta.image || '';
  const [quantity, setQuantity] = React.useState(1);
  const [deliveryCode, setDeliveryCode] = React.useState('');
  const [deliveryStatus, setDeliveryStatus] = React.useState<string | null>(null);
  const [isWishlisted, setIsWishlisted] = React.useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false);

  // Review Form
  const [reviewerName, setReviewerName] = React.useState('');
  const [reviewerRating, setReviewerRating] = React.useState(5);
  const [reviewerComment, setReviewerComment] = React.useState('');
  const [reviewsList, setReviewsList] = React.useState<
    { name: string; rating: number; comment: string; date: string }[]
  >([]);

  const stockInfo = getStockStatus(book.stock);

  const handleAddToCart = () => {
    if (!stockInfo.isAvailable) return;
    trackVisitorEvent({ eventType: 'add_to_cart', bookId: book.id }).catch(console.error);
    addToCart(
      {
        ...book,
        title: meta.bengaliTitle || book.title,
        coverImageUrl: coverImage || undefined,
      },
      quantity
    );
    toast({
      title: 'কার্টে যোগ করা হয়েছে!',
      description: `"${meta.bengaliTitle}" আপনার কার্টে যুক্ত হয়েছে।`,
    });
  };

  const handleBuyNow = () => {
    if (!stockInfo.isAvailable) return;
    trackVisitorEvent({ eventType: 'add_to_cart', bookId: book.id }).catch(console.error);
    addToCart(
      {
        ...book,
        title: meta.bengaliTitle || book.title,
        coverImageUrl: coverImage || undefined,
      },
      quantity
    );
    setIsCartOpen(true);
  };

  const handleCheckDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryCode.trim()) return;
    setDeliveryStatus('সারা বাংলাদেশে হোম ডেলিভারি সম্পূর্ণ ফ্রি! (৩-৫ কার্যদিবসের মধ্যে পৌঁছাবে)');
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'লিংক কপি করা হয়েছে!',
        description: 'বইয়ের লিংকটি আপনার ক্লিপবোর্ডে কপি হয়েছে।',
      });
    }
  };

  const handleShareSocial = (platform: 'fb' | 'wa' | 'tg') => {
    if (typeof window === 'undefined') return;
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`শ্রীল জয়পতাকা স্বামী অপ্রাকৃত গ্রন্থ: ${meta.bengaliTitle}`);

    if (platform === 'wa') {
      window.open(`https://api.whatsapp.com/send?text=${text}%20${url}`, '_blank');
    } else if (platform === 'fb') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    } else if (platform === 'tg') {
      window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
    }
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim() || !reviewerComment.trim()) return;

    setReviewsList((prev) => [
      ...prev,
      {
        name: reviewerName.trim(),
        rating: reviewerRating,
        comment: reviewerComment.trim(),
        date: 'আজ',
      },
    ]);

    setReviewerName('');
    setReviewerComment('');
    setReviewDialogOpen(false);
    toast({
      title: 'ধন্যবাদ!',
      description: 'আপনার মূল্যবান মন্তব্য ও রিভিউ গৃহীত হয়েছে।',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* 2-Column Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-16">
        
        {/* Left Column: Big Book Image & Social Share */}
        <div className="lg:col-span-5 flex flex-col items-center">
          {/* Main Book Cover Card */}
          <div className="w-full max-w-[380px] rounded-2xl bg-white p-4 border border-[#EFEAE2] shadow-md relative">
            <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden shadow-inner bg-[#FAF7F2] border border-[#EFEAE2] flex items-center justify-center">
              {coverImage ? (
                <Image
                  src={coverImage}
                  alt={meta.bengaliTitle}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 380px"
                  className="object-cover rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center select-none">
                  <div className="w-16 h-16 rounded-full bg-stone-200/70 flex items-center justify-center mb-3 text-stone-400">
                    <BookOpen className="h-8 w-8 stroke-[1.5]" />
                  </div>
                  <span className="font-headline font-bold text-base text-stone-700 max-w-[220px]">
                    {meta.bengaliTitle}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Share this book box */}
          <div className="w-full max-w-[380px] mt-4 p-3 bg-white rounded-xl border border-[#EFEAE2] shadow-xs text-center space-y-2">
            <span className="text-xs font-semibold text-stone-600 font-sans flex items-center justify-center gap-1.5">
              <Share2 className="h-3.5 w-3.5 text-[#8B0032]" />
              <span>Share this book (শেয়ার করুন)</span>
            </span>

            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                onClick={() => handleShareSocial('wa')}
                className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors"
                title="Share on WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleShareSocial('fb')}
                className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                title="Share on Facebook"
              >
                <Facebook className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleShareSocial('tg')}
                className="h-8 w-8 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 flex items-center justify-center transition-colors"
                title="Share on Telegram"
              >
                <Send className="h-4 w-4" />
              </button>
              <button
                onClick={handleCopyLink}
                className="h-8 w-8 rounded-full bg-stone-100 text-stone-700 hover:bg-stone-200 flex items-center justify-center transition-colors"
                title="Copy Link"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Title, Rating, Price, Cart Controls, Summary, Product Details */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Title & Author */}
          <div className="space-y-1">
            <h1 className="font-headline font-bold text-2xl sm:text-3xl md:text-4xl text-[#1E2229] leading-tight">
              {meta.bengaliTitle}
            </h1>
            <p className="font-bengali text-sm text-stone-600 font-medium">
              Author: <span className="text-[#8B0032] font-semibold">{meta.author}</span>
            </p>
            
            {/* Stars */}
            <div className="flex items-center gap-1 pt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-4 w-4 fill-[#F5B041] text-[#F5B041]" />
              ))}
              <span className="text-xs text-stone-500 font-sans ml-1">
                ({reviewsList.length > 0 ? reviewsList.length : '5.0'})
              </span>
            </div>
          </div>

          {/* Price & Free Shipping Tag */}
          <div className="p-4 bg-white rounded-2xl border border-[#EFEAE2] flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-headline font-bold text-3xl text-[#8B0032]">
                  {formatTakaPrice(book.sellingPrice)}
                </span>
                <span className="text-xs text-stone-500 font-sans">
                  (Inclusive of all taxes)
                </span>
              </div>
              <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                <Truck className="h-3.5 w-3.5" />
                <span>সারা বাংলাদেশে সম্পূর্ণ ফ্রি হোম ডেলিভারি!</span>
              </p>
            </div>

            {/* Stock status pill */}
            <span className={`text-xs font-bengali px-3 py-1 rounded-full border ${stockInfo.badgeClass}`}>
              {stockInfo.text}
            </span>
          </div>

          {/* Language badge */}
          <div className="flex items-center gap-2 text-xs font-sans text-stone-700">
            <span className="font-semibold text-stone-500">Language:</span>
            <span className="bg-white border border-[#EFEAE2] px-3 py-1 rounded-md font-medium">
              {meta.language}
            </span>
          </div>

          {/* Quantity Selector & Check Delivery */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Quantity */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-stone-600 font-sans">Quantity:</span>
              <div className="flex items-center border border-[#EFEAE2] rounded-xl bg-white overflow-hidden shadow-xs">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-stone-700 hover:bg-stone-100 disabled:opacity-40 transition-colors"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="px-3 text-sm font-bold text-stone-900 font-sans">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={quantity >= stockInfo.available}
                  onClick={() => setQuantity((q) => Math.min(stockInfo.available, q + 1))}
                  className="px-3 py-2 text-stone-700 hover:bg-stone-100 disabled:opacity-40 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Check delivery availability */}
            <form onSubmit={handleCheckDelivery} className="flex gap-1.5">
              <Input
                value={deliveryCode}
                onChange={(e) => setDeliveryCode(e.target.value)}
                placeholder="জেলা বা পোস্ট কোড..."
                className="bg-white border-[#EFEAE2] text-xs h-9 rounded-xl font-bengali"
              />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="bg-[#4A154B] text-white hover:bg-[#38103A] hover:text-white border-0 text-xs font-sans rounded-xl h-9 shrink-0"
              >
                Check
              </Button>
            </form>
          </div>

          {deliveryStatus && (
            <p className="text-xs font-bold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-bengali flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{deliveryStatus}</span>
            </p>
          )}

          {/* Action Buttons: Add to Cart (Plum) & Buy Now (Crimson/Wine) */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              disabled={!stockInfo.isAvailable}
              onClick={handleAddToCart}
              className="flex-1 bg-[#4A154B] hover:bg-[#38103A] text-white rounded-xl py-6 font-sans font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Add to Cart</span>
            </Button>

            <Button
              type="button"
              disabled={!stockInfo.isAvailable}
              onClick={handleBuyNow}
              className="flex-1 bg-[#8B0032] hover:bg-[#6E0028] text-white rounded-xl py-6 font-sans font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span>Buy Now</span>
            </Button>

            {/* Wishlist Heart button */}
            <button
              onClick={() => {
                setIsWishlisted(!isWishlisted);
                toast({
                  title: isWishlisted ? 'তালিকা থেকে সরানো হয়েছে' : 'পছন্দের তালিকায় সংরক্ষিত',
                });
              }}
              className={`p-3 rounded-xl border transition-colors ${
                isWishlisted
                  ? 'bg-rose-50 border-rose-300 text-rose-600'
                  : 'bg-white border-[#EFEAE2] text-stone-400 hover:text-rose-600'
              }`}
              title="Add to wishlist"
            >
              <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-rose-600' : ''}`} />
            </button>
          </div>

          {/* Summary Section */}
          <div className="pt-4 border-t border-[#EFEAE2] space-y-2">
            <h3 className="font-headline font-bold text-lg text-[#1E2229]">
              Summary (বইয়ের সারসংক্ষেপ)
            </h3>
            <p className="font-bengali text-stone-700 text-sm leading-relaxed bg-white p-4 rounded-2xl border border-[#EFEAE2]">
              {meta.summary}
            </p>
          </div>

          {/* Product Details Section */}
          <div className="pt-2 space-y-2">
            <h3 className="font-headline font-bold text-lg text-[#1E2229]">
              Product Details (গ্রন্থের বিবরণ)
            </h3>
            <div className="bg-white p-4 rounded-2xl border border-[#EFEAE2] font-sans text-xs space-y-2">
              <div className="grid grid-cols-2 gap-2 border-b border-[#EFEAE2] pb-1.5">
                <span className="text-stone-500">ISBN Code:</span>
                <span className="font-semibold text-stone-900">{meta.isbn || '978-93-9540-10-1'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 border-b border-[#EFEAE2] pb-1.5">
                <span className="text-stone-500">Book Size:</span>
                <span className="font-semibold text-stone-900">{meta.size || 'L-21 x W-13 cm'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 border-b border-[#EFEAE2] pb-1.5">
                <span className="text-stone-500">No of pages:</span>
                <span className="font-semibold text-stone-900">{meta.pages || 250}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-stone-500">Weight:</span>
                <span className="font-semibold text-stone-900">{meta.weight || '0.35 kg'}</span>
              </div>
            </div>
          </div>

          {/* 4 Value Proposition Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 font-sans text-xs">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-[#EFEAE2]">
              <Truck className="h-4 w-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-stone-900 block text-[11px]">Free Shipping</span>
                <span className="text-[10px] text-stone-500">সারা বাংলাদেশে</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-[#EFEAE2]">
              <RotateCcw className="h-4 w-4 text-blue-600 shrink-0" />
              <div>
                <span className="font-bold text-stone-900 block text-[11px]">Easy Returns</span>
                <span className="text-[10px] text-stone-500">সহজ রিটার্ন</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-[#EFEAE2]">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-stone-900 block text-[11px]">Secure Payment</span>
                <span className="text-[10px] text-stone-500">নিরাপদ পেমেন্ট</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-[#EFEAE2]">
              <BookOpen className="h-4 w-4 text-[#8B0032] shrink-0" />
              <div>
                <span className="font-bold text-stone-900 block text-[11px]">Authentic Books</span>
                <span className="text-[10px] text-stone-500">প্রামাণ্য গ্রন্থ</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Customer Reviews Section */}
      <div className="mt-12 pt-8 border-t border-[#EFEAE2]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline font-bold text-2xl text-[#1E2229]">
            Customer Reviews (পাঠক ও ভক্তদের মতামত)
          </h2>
          <Button
            onClick={() => setReviewDialogOpen(true)}
            variant="outline"
            className="border-[#4A154B] text-[#4A154B] hover:bg-[#4A154B] hover:text-white rounded-xl text-xs font-sans font-bold"
          >
            একটি রিভিউ বা মন্তব্য লিখুন
          </Button>
        </div>

        {reviewsList.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-[#EFEAE2] text-center space-y-2">
            <Star className="h-8 w-8 text-stone-300 mx-auto" />
            <h4 className="font-headline font-bold text-base text-stone-800">No reviews yet</h4>
            <p className="text-xs text-stone-500 font-sans">
              Be the first to review this item (এই গ্রন্থটি পাঠ করে আপনার প্রথম অনুভূতি জানান)
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviewsList.map((rev, idx) => (
              <div key={idx} className="p-4 bg-white rounded-2xl border border-[#EFEAE2] space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-stone-900 font-bengali">{rev.name}</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3 w-3 ${
                          s <= rev.rating ? 'fill-[#F5B041] text-[#F5B041]' : 'text-stone-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-stone-700 font-bengali leading-relaxed">{rev.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related Books Section */}
      {relatedBooks.length > 0 && (
        <div className="mt-16 pt-8 border-t border-[#EFEAE2]">
          <h2 className="font-headline font-bold text-2xl text-[#1E2229] mb-6">
            Related Books (সম্পর্কিত অন্যান্য গ্রন্থ)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {relatedBooks.map((rBook) => (
              <BookCard key={rBook.id} book={rBook} />
            ))}
          </div>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-md bg-white border-[#EFEAE2] font-bengali">
          <DialogHeader>
            <DialogTitle className="font-headline font-bold text-xl text-[#1E2229]">
              মতামত ও রিভিউ প্রদান করুন
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              "{meta.bengaliTitle}" গ্রন্থটি পাঠ করে আপনার আধ্যাত্মিক উপলব্ধি শেয়ার করুন।
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddReview} className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">আপনার পূর্ণ নাম</label>
              <Input
                required
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="উদা: অদ্বৈত দাস"
                className="text-xs h-9 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">রেটিং নির্বাচন করুন</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewerRating(star)}
                    className="p-1 text-[#F5B041]"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= reviewerRating ? 'fill-[#F5B041]' : 'text-stone-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">আপনার অনুভূতি / মন্তব্য</label>
              <Textarea
                required
                rows={3}
                value={reviewerComment}
                onChange={(e) => setReviewerComment(e.target.value)}
                placeholder="বইটি সম্পর্কে আপনার মতামত লিখুন..."
                className="text-xs rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReviewDialogOpen(false)}
                className="text-xs rounded-xl"
              >
                বাতিল
              </Button>
              <Button
                type="submit"
                className="bg-[#8B0032] hover:bg-[#6E0028] text-white text-xs font-bold rounded-xl"
              >
                সাবমিট করুন
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
