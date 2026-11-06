'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  CreditCard,
  Banknote,
  Sparkles,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useCart } from './cart-context';
import {
  STORE_CONFIG,
  formatTakaPrice,
} from '@/lib/store-config';
import { placeOnlineOrder } from '@/lib/db/online-orders';

export function CartDrawer() {
  const {
    items,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartSubtotal,
    cartCount,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  const { toast } = useToast();

  const [step, setStep] = React.useState<'cart' | 'checkout' | 'success'>('cart');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [completedOrder, setCompletedOrder] = React.useState<{ saleId: string; total: number } | null>(null);

  // Form Fields
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [district, setDistrict] = React.useState('');
  const [orderNote, setOrderNote] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState<'Cash' | 'Bank'>('Cash');
  const [transactionId, setTransactionId] = React.useState('');

  // 100% Free Shipping Everywhere!
  const deliveryCharge = 0;
  const grandTotal = cartSubtotal + deliveryCharge;

  // Reset steps when sheet opens
  React.useEffect(() => {
    if (isCartOpen && step === 'success') {
      setStep('cart');
      setCompletedOrder(null);
    }
  }, [isCartOpen]);

  const handleProceedToCheckout = () => {
    if (items.length === 0) return;
    setStep('checkout');
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim()) {
      toast({
        variant: 'destructive',
        title: 'অসম্পূর্ণ তথ্য',
        description: 'অনুগ্রহ করে আপনার নাম, মোবাইল নম্বর এবং সম্পূর্ণ ডেলিভারি ঠিকানা পূরণ করুন।',
      });
      return;
    }

    if (paymentMethod === 'Bank' && !transactionId.trim()) {
      toast({
        variant: 'destructive',
        title: 'ট্রানজাকশন আইডি প্রয়োজন',
        description: 'বিকাশ/নগদ পেমেন্টের জন্য অনুগ্রহ করে TrxID প্রদান করুন।',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const orderPayload = {
        customerName: name.trim(),
        customerPhone: phone.trim(),
        shippingAddress: address.trim(),
        district: district.trim(),
        deliveryCharge: 0,
        paymentMethod,
        transactionId: transactionId.trim(),
        orderNote: orderNote.trim(),
        items: items.map((i) => ({ itemId: i.itemId, quantity: i.quantity })),
      };

      const res = await placeOnlineOrder(orderPayload);
      if (res.success && res.saleId) {
        setCompletedOrder({ saleId: res.saleId, total: res.total || grandTotal });
        clearCart();
        setStep('success');
      } else {
        toast({
          variant: 'destructive',
          title: 'অর্ডার ব্যর্থ হয়েছে',
          description: res.error || 'অর্ডার প্রক্রিয়াকরণে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'ত্রুটি',
        description: err.message || 'নেটওয়ার্ক সমস্যা। পুনরায় চেষ্টা করুন।',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-md bg-[#FAF7F2] border-l border-[#EFEAE2] p-0 flex flex-col font-sans text-[#1E2229]">
        
        {/* Header */}
        <SheetHeader className="p-4 border-b border-[#EFEAE2] bg-white">
          <SheetTitle className="font-headline font-bold text-lg text-[#1E2229] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-[#8B0032]" />
              {step === 'cart' && `Shopping Cart (${cartCount})`}
              {step === 'checkout' && 'ডেলিভারি ও পেমেন্ট'}
              {step === 'success' && 'অর্ডার নিশ্চিতকরণ'}
            </span>
          </SheetTitle>
          <SheetDescription className="text-xs text-stone-500 font-sans">
            {step === 'cart' && 'বইয়ের তালিকা ও সংখ্যা যাচাই করে অর্ডার সম্পন্ন করুন।'}
            {step === 'checkout' && 'সঠিক ঠিকানা দিন যাতে বইগুলো নিরাপদে আপনার কাছে পৌঁছাতে পারে।'}
            {step === 'success' && 'আপনার অর্ডারটি সফলভাবে সংরক্ষিত হয়েছে।'}
          </SheetDescription>
        </SheetHeader>

        {/* Free Shipping Banner */}
        <div className="bg-[#FCE8EF] px-4 py-2 border-b border-[#8B0032]/20 flex items-center justify-between text-xs text-[#8B0032] font-bold">
          <div className="flex items-center gap-1.5">
            <Truck className="h-4 w-4" />
            <span>সারা দেশে হোম ডেলিভারি ফ্রি!</span>
          </div>
          <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded-full">৳ 0</span>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* STEP 1: CART ITEMS */}
          {step === 'cart' && (
            <div className="space-y-3">
              {items.length === 0 ? (
                <div className="py-14 text-center space-y-3">
                  <div className="h-16 w-16 rounded-full bg-[#FAF7F2] border border-[#EFEAE2] flex items-center justify-center mx-auto text-[#8B0032]">
                    <ShoppingBag className="h-8 w-8" />
                  </div>
                  <h4 className="font-headline font-bold text-base text-stone-800">আপনার কার্ট খালি</h4>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto">
                    আমাদের গ্রন্থ সম্ভার থেকে আপনার পছন্দের পারমার্থিক বই কার্টে যোগ করুন।
                  </p>
                  <Button
                    onClick={() => setIsCartOpen(false)}
                    className="mt-2 bg-[#4A154B] hover:bg-[#38103A] text-white rounded-xl text-xs font-sans"
                  >
                    বই খুঁজুন (Browse Books)
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <div
                      key={item.itemId}
                      className="p-3 bg-white rounded-xl border border-[#EFEAE2] flex items-center justify-between gap-3 shadow-xs"
                    >
                      {/* Item Thumbnail */}
                      <div className="relative h-14 w-11 rounded-lg overflow-hidden bg-[#FAF7F2] shrink-0 border border-[#EFEAE2] flex items-center justify-center">
                        {item.coverImageUrl ? (
                          <Image
                            src={item.coverImageUrl}
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <BookOpen className="h-5 w-5 text-stone-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-headline font-bold text-xs sm:text-sm text-[#1E2229] truncate">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5 font-sans">
                          <span className="font-semibold text-[#8B0032]">{formatTakaPrice(item.price)}</span>
                          {item.isPackage && (
                            <span className="text-[10px] bg-[#FAF7F2] text-[#4A154B] px-1.5 py-0.2 rounded border">
                              প্যাকেজ
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center border border-[#EFEAE2] rounded-lg bg-[#FAF7F2] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.itemId, item.quantity - 1)}
                            className="p-1 text-stone-700 hover:bg-stone-200 transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2 text-xs font-bold text-stone-900 font-sans">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.itemId, item.quantity + 1)}
                            className="p-1 text-stone-700 hover:bg-stone-200 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <span className="font-bold text-xs text-[#8B0032] min-w-[50px] text-right font-sans">
                          {formatTakaPrice(item.price * item.quantity)}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.itemId)}
                          className="p-1 text-stone-400 hover:text-red-600 transition-colors"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CHECKOUT FORM */}
          {step === 'checkout' && (
            <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-3 font-bengali">
              
              {/* Customer Inputs */}
              <div className="p-3.5 bg-white rounded-xl border border-[#EFEAE2] space-y-2.5 shadow-xs">
                <span className="font-headline font-bold text-xs text-[#1E2229] block border-b border-[#EFEAE2] pb-1">
                  ১. গ্রাহকের নাম ও ঠিকানা
                </span>

                <div>
                  <Label htmlFor="cust-name" className="text-xs text-stone-700 font-medium">
                    আপনার পূর্ণ নাম <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cust-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="উদা: সুবল কৃষ্ণ দাস"
                    className="mt-1 bg-[#FAF7F2] border-[#EFEAE2] text-xs h-9 rounded-xl"
                  />
                </div>

                <div>
                  <Label htmlFor="cust-phone" className="text-xs text-stone-700 font-medium">
                    মোবাইল নম্বর <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cust-phone"
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="mt-1 bg-[#FAF7F2] border-[#EFEAE2] text-xs h-9 rounded-xl font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="cust-district" className="text-xs text-stone-700 font-medium">
                      জেলা / শহর
                    </Label>
                    <Input
                      id="cust-district"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="উদা: সিলেট / ঢাকা"
                      className="mt-1 bg-[#FAF7F2] border-[#EFEAE2] text-xs h-9 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cust-note" className="text-xs text-stone-700 font-medium">
                      বিশেষ নোট (ঐচ্ছিক)
                    </Label>
                    <Input
                      id="cust-note"
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      placeholder="ডেলিভারি নির্দেশনা"
                      className="mt-1 bg-[#FAF7F2] border-[#EFEAE2] text-xs h-9 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="cust-address" className="text-xs text-stone-700 font-medium">
                    পূর্ণ ডেলিভারি ঠিকানা <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="cust-address"
                    required
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="বাড়ি নং, রোড নং, এলাকা, থানা, জেলা..."
                    className="mt-1 bg-[#FAF7F2] border-[#EFEAE2] text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Free Courier Shipping Notice */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-emerald-600" />
                  <span className="font-bold">সারা বাংলাদেশে কুরিয়ার চার্জ:</span>
                </div>
                <span className="font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-300">
                  সম্পূর্ণ ফ্রি (FREE)
                </span>
              </div>

              {/* Payment Methods */}
              <div className="p-3.5 bg-white rounded-xl border border-[#EFEAE2] space-y-2.5 shadow-xs">
                <span className="font-headline font-bold text-xs text-[#1E2229] block border-b border-[#EFEAE2] pb-1">
                  ২. পেমেন্ট পদ্ধতি নির্বাচন করুন
                </span>

                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(val: any) => setPaymentMethod(val)}
                  className="space-y-2 pt-0.5"
                >
                  <label
                    htmlFor="pay-cod"
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      paymentMethod === 'Cash'
                        ? 'border-[#8B0032] bg-[#FCE8EF]/40 font-bold text-[#8B0032]'
                        : 'border-[#EFEAE2] bg-white text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="Cash" id="pay-cod" />
                      <div>
                        <span className="block">ক্যাশ অন ডেলিভারি (COD)</span>
                        <span className="text-[10px] font-normal text-stone-500">
                          বই হাতে পেয়ে কুরিয়ারের কাছে টাকা দিন
                        </span>
                      </div>
                    </div>
                    <Banknote className="h-4 w-4 text-emerald-700" />
                  </label>

                  <label
                    htmlFor="pay-bkash"
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      paymentMethod === 'Bank'
                        ? 'border-[#8B0032] bg-[#FCE8EF]/40 font-bold text-[#8B0032]'
                        : 'border-[#EFEAE2] bg-white text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="Bank" id="pay-bkash" />
                      <div>
                        <span className="block">বিকাশ / নগদ (Send Money)</span>
                        <span className="text-[10px] font-normal text-stone-500">
                          অগ্রিম পাঠিয়ে দ্রুত ডেলিভারি নিশ্চিত করুন
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-[#8B0032]">01902962441</span>
                  </label>
                </RadioGroup>

                {paymentMethod === 'Bank' && (
                  <div className="p-2.5 bg-[#FAF7F2] rounded-xl border border-[#8B0032]/30 space-y-1.5 text-xs">
                    <p className="text-stone-700 leading-relaxed text-[11px]">
                      অনুগ্রহ করে <strong className="text-[#8B0032] font-mono font-bold">01902962441</strong> নম্বরে 
                      সর্বমোট <strong className="text-[#8B0032]">{formatTakaPrice(grandTotal)}</strong> টাকা সেন্ড মানি করুন। 
                      এরপর প্রাপ্ত TrxID নিচে লিখুন:
                    </p>
                    <div>
                      <Input
                        required={paymentMethod === 'Bank'}
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Transaction ID (TrxID) লিখুন..."
                        className="bg-white border-[#8B0032]/40 text-xs h-8 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </form>
          )}

          {/* STEP 3: ORDER SUCCESS */}
          {step === 'success' && completedOrder && (
            <div className="py-6 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-emerald-100 border border-emerald-500 flex items-center justify-center mx-auto text-emerald-600 animate-bounce">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-1">
                <h3 className="font-headline font-bold text-xl text-[#1E2229]">
                  আপনার অর্ডার সফল হয়েছে!
                </h3>
                <p className="text-xs text-stone-600 max-w-sm mx-auto font-bengali">
                  আপনার অর্ডারটি গৃহীত হয়েছে। খুব শীঘ্রই আমাদের প্রতিনিধি কল করে কনফার্ম করবেন।
                </p>
              </div>

              {/* Order Card */}
              <div className="p-3.5 bg-white rounded-xl border border-[#EFEAE2] text-xs space-y-2 max-w-sm mx-auto text-left shadow-xs font-sans">
                <div className="flex justify-between border-b border-[#EFEAE2] pb-1.5">
                  <span className="text-stone-500">Order ID:</span>
                  <span className="font-mono font-bold text-[#8B0032]">{completedOrder.saleId}</span>
                </div>
                <div className="flex justify-between border-b border-[#EFEAE2] pb-1.5">
                  <span className="text-stone-500">Total Amount:</span>
                  <span className="font-bold text-stone-900">{formatTakaPrice(completedOrder.total)}</span>
                </div>
                <div className="flex justify-between border-b border-[#EFEAE2] pb-1.5">
                  <span className="text-stone-500">Shipping:</span>
                  <span className="font-bold text-emerald-700">FREE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Payment:</span>
                  <span className="font-medium text-stone-800">
                    {paymentMethod === 'Cash' ? 'Cash on Delivery' : 'bKash/Nagad'}
                  </span>
                </div>
              </div>

              <Button
                onClick={() => {
                  setIsCartOpen(false);
                  setStep('cart');
                }}
                className="bg-[#4A154B] hover:bg-[#38103A] text-white rounded-xl px-5 py-2 text-xs font-bold"
              >
                আরও বই দেখুন
              </Button>
            </div>
          )}

        </div>

        {/* Footer / Summary Action Bar */}
        {step !== 'success' && items.length > 0 && (
          <div className="p-4 border-t border-[#EFEAE2] bg-white space-y-3 font-sans">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal:</span>
                <span className="font-bold font-mono">{formatTakaPrice(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Delivery Charge:</span>
                <span>FREE (৳ 0)</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-stone-900 pt-1 border-t border-[#EFEAE2]">
                <span>Total:</span>
                <span className="text-base text-[#8B0032] font-mono">
                  {formatTakaPrice(grandTotal)}
                </span>
              </div>
            </div>

            {step === 'cart' ? (
              <Button
                onClick={handleProceedToCheckout}
                className="w-full bg-[#8B0032] hover:bg-[#6E0028] text-white rounded-xl py-5 text-sm font-bold shadow-md flex items-center justify-center gap-1.5"
              >
                <span>Proceed to Checkout</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('cart')}
                  className="border-[#EFEAE2] text-stone-700 rounded-xl text-xs"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  form="checkout-form"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#8B0032] hover:bg-[#6E0028] text-white rounded-xl py-5 text-sm font-bold shadow-md flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>অর্ডার হচ্ছে...</span>
                    </>
                  ) : (
                    <span>অর্ডার নিশ্চিত করুন ({formatTakaPrice(grandTotal)})</span>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

      </SheetContent>
    </Sheet>
  );
}
