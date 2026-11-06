'use client';

import * as React from 'react';
import Image from 'next/image';
import { ArrowDown, BookOpen, Gift, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  customHeroImage?: string;
}

export function HeroSection({ customHeroImage }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FAF7F2] via-[#FFFDF9] to-[#FAF7F2] py-8 md:py-16 border-b border-[#EFEAE2]">
      <div className="container mx-auto px-4 relative z-10">
        
        {/* Free Shipping Alert Pill Banner */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FCE8EF] border border-[#8B0032]/20 text-[#8B0032] font-bengali text-xs md:text-sm font-bold shadow-xs">
            <Truck className="h-4 w-4 text-[#8B0032]" />
            <span>সারা দেশে সকল বইয়ের অর্ডারে হোম ডেলিভারি সম্পূর্ণ ফ্রি! (Free Courier Shipping)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-7 space-y-4 md:space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#3B1442]/10 text-[#3B1442] font-sans text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-[#F5B041]" />
              <span>Victory Flag Publications • JPS Archives</span>
            </div>

            <h1 className="font-headline font-bold text-3xl sm:text-4xl md:text-5xl text-[#1E2229] leading-tight">
              Spiritual Books Collection{' '}
              <span className="block mt-1 text-[#8B0032] font-serifBengali text-2xl sm:text-3xl md:text-4xl">
                শ্রীল জয়পতাকা স্বামী অপ্রাকৃত গ্রন্থাবলী
              </span>
            </h1>

            <p className="font-bengali text-stone-600 text-sm md:text-base leading-relaxed max-w-2xl mx-auto lg:mx-0">
              আন্তর্জাতিক কৃষ্ণভাবনামৃত সংঘ (ইস্কন)-এর প্রবীণ দীক্ষাগুরু শ্রীল জয়পতাকা স্বামী গুরুমহারাজের
              মুখনিঃসৃত অমৃতবাণী, অপ্রাকৃত গ্রন্থ ও শ্রীল প্রভুপাদের অমূল্য শিক্ষামৃত এখন সরাসরি ঘরে বসেই সংগ্রহ করুন।
            </p>

            {/* Value Propositions Badges */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-2 max-w-lg mx-auto lg:mx-0 font-bengali">
              <div className="flex flex-col items-center lg:items-start p-3 rounded-xl bg-white border border-[#EFEAE2] shadow-xs">
                <Truck className="h-5 w-5 text-[#8B0032] mb-1" />
                <span className="text-xs font-bold text-[#1E2229]">১০০% ফ্রি ডেলিভারি</span>
                <span className="text-[10px] text-stone-500">সারা বাংলাদেশে</span>
              </div>
              <div className="flex flex-col items-center lg:items-start p-3 rounded-xl bg-white border border-[#EFEAE2] shadow-xs">
                <ShieldCheck className="h-5 w-5 text-[#3B1442] mb-1" />
                <span className="text-xs font-bold text-[#1E2229]">প্রামাণ্য সংস্করণ</span>
                <span className="text-[10px] text-stone-500">মূল অনুবাদ ও ভাষ্য</span>
              </div>
              <div className="flex flex-col items-center lg:items-start p-3 rounded-xl bg-white border border-[#EFEAE2] shadow-xs">
                <Gift className="h-5 w-5 text-[#D97706] mb-1" />
                <span className="text-xs font-bold text-[#1E2229]">মহাপ্রসাদী উপহার</span>
                <span className="text-[10px] text-stone-500">প্যাকেজের সাথে</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <Button
                asChild
                size="lg"
                className="bg-[#8B0032] hover:bg-[#6E0028] text-white rounded-xl px-7 py-5 text-sm md:text-base font-bold shadow-md transition-all active:scale-95"
              >
                <a href="#books" className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  <span>সকল বই দেখুন</span>
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-2 border-[#3B1442] text-[#3B1442] hover:bg-[#3B1442] hover:text-white rounded-xl px-6 py-5 text-sm md:text-base font-bold shadow-xs transition-all active:scale-95"
              >
                <a href="#packages" className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  <span>বিশেষ প্যাকেজসমূহ</span>
                </a>
              </Button>
            </div>
          </div>

          {/* Right Column: Custom Picture Ready Frame */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-[380px] aspect-[4/5] rounded-2xl p-2.5 bg-gradient-to-br from-[#631038] via-[#3B1442] to-[#0D2447] shadow-xl">
              <div className="w-full h-full rounded-xl overflow-hidden bg-white relative flex flex-col items-center justify-center p-6 text-center shadow-inner">
                {customHeroImage ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={customHeroImage}
                      alt="শ্রীল জয়পতাকা স্বামী মহারাজ"
                      fill
                      sizes="(max-width: 768px) 100vw, 380px"
                      className="object-cover rounded-lg"
                      priority
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-between h-full py-4 text-[#1E2229]">
                    <div className="h-14 w-14 rounded-full bg-[#FCE8EF] border border-[#8B0032]/30 flex items-center justify-center shadow-xs">
                      <BookOpen className="h-7 w-7 text-[#8B0032]" />
                    </div>

                    <div className="space-y-2 my-auto">
                      <div className="w-12 h-0.5 bg-[#8B0032] mx-auto mb-2" />
                      <h3 className="font-headline font-bold text-2xl text-[#1E2229]">
                        Victory Flag Publications
                      </h3>
                      <p className="font-bengali text-xs text-stone-600 max-w-xs leading-relaxed">
                        “চৈতন্য মহাপ্রভুর অপ্রাকৃত প্রেমধর্ম ও পারমার্থিক জ্ঞান বিতরণে নিবেদিত।”
                      </p>
                      <div className="w-12 h-0.5 bg-[#8B0032] mx-auto mt-2" />
                    </div>

                    <div className="bg-[#FAF7F2] px-3.5 py-1.5 rounded-lg border border-[#EFEAE2] text-[11px] font-sans text-[#3B1442] font-semibold">
                      JPS Archives Bangladesh
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
