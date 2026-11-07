'use client';

import * as React from 'react';
import Image from 'next/image';
import { ArrowDown, BookOpen, Gift, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  customHeroImage?: string;
  showPackages?: boolean;
}

export function HeroSection({ customHeroImage, showPackages = false }: HeroSectionProps) {
  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', `#${targetId}`);
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FAF7F2] via-[#FFFDF9] to-[#FAF7F2] pt-3 sm:pt-4 md:pt-6 pb-8 md:pb-12 border-b border-[#EFEAE2]">
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-7 space-y-4 md:space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#3B1442]/10 text-[#3B1442] font-sans text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-[#F5B041]" />
              <span>Victory Flag Publications • JPS Archives</span>
            </div>

            <h1 className="font-headline tracking-tight">
              <span className="block font-bold text-2xl sm:text-3xl md:text-4xl lg:text-[42px] text-[#1E2229] leading-tight">
                শ্রীল জয়পতাকা স্বামী মহারাজের
              </span>
              <span className="inline-block font-serifBengali font-bold text-3xl sm:text-4xl md:text-5xl lg:text-[50px] text-[#8B0032] mt-1 sm:mt-2 leading-snug pr-4 pb-1">
                অপ্রাকৃত গ্রন্থাবলী
              </span>
              {/* Clean noticeable accent line */}
              <span className="block h-1 sm:h-1.5 w-24 sm:w-32 rounded-full bg-gradient-to-r from-[#8B0032] via-[#F5B041] to-[#8B0032] animate-pulse mx-auto lg:mx-0 mt-1.5" />
            </h1>

            <p className="font-bengali text-stone-600 text-sm md:text-base leading-relaxed max-w-2xl mx-auto lg:mx-0">
              আন্তর্জাতিক কৃষ্ণভাবনামৃত সংঘ (ইস্‌কন)-এর অন্যতম দীক্ষাগুরু এবং GBC শ্রীল জয়পতাকা স্বামী মহারাজের
              মুখনিঃসৃত অমৃতবাণী, অপ্রাকৃত গ্রন্থ ও শ্রীল প্রভুপাদের অমূল্য শিক্ষামৃত এখন সরাসরি ঘরে বসেই সংগ্রহ করুন।
            </p>

            {/* Value Propositions Badges */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-2 max-w-lg mx-auto lg:mx-0 font-bengali">
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
                <a
                  href="#books"
                  onClick={(e) => handleScrollTo(e, 'books')}
                  className="flex items-center gap-2"
                >
                  <BookOpen className="h-5 w-5" />
                  <span>সকল বই দেখুন</span>
                </a>
              </Button>
              {showPackages ? (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-2 border-[#3B1442] text-[#3B1442] hover:bg-[#3B1442] hover:text-white rounded-xl px-6 py-5 text-sm md:text-base font-bold shadow-xs transition-all active:scale-95"
                >
                  <a
                    href="#packages"
                    onClick={(e) => handleScrollTo(e, 'packages')}
                    className="flex items-center gap-2"
                  >
                    <Gift className="h-5 w-5" />
                    <span>বিশেষ প্যাকেজসমূহ</span>
                  </a>
                </Button>
              ) : (
                <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300/80 text-emerald-950 font-bengali shadow-xs">
                  <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs sm:text-sm font-bold text-emerald-950 leading-tight">
                      হোম ডেলিভারি সম্পূর্ণ ফ্রি!
                    </span>
                    <span className="text-[11px] font-medium text-emerald-700">
                      সারা দেশে কোনো ডেলিভারি চার্জ নেই
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Dedicated To Srila Prabhupada Picture Frame with Circling Animated Border */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-[390px] rounded-3xl p-2 overflow-hidden shadow-xl transition-transform duration-300 hover:-translate-y-1">
              
              {/* Rotating Conic Gradient Beam (Circling Color Border) */}
              <div
                className="absolute -inset-[100%] animate-[spin_5s_linear_infinite]"
                style={{
                  background: 'conic-gradient(from 0deg, #F5B041 0deg, #8B0032 120deg, #3B1442 240deg, #F5B041 360deg)',
                }}
              />

              {/* Inner Ivory Card */}
              <div className="relative w-full rounded-2xl bg-[#FFFDF9] border border-[#EFEAE2] p-4 sm:p-5 flex flex-col items-center text-center shadow-inner">
                
                {/* Dedication Header (Picture moved up) */}
                <div className="space-y-0.5 mb-2.5">
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.25em] font-sans font-bold text-[#8B0032] flex items-center justify-center gap-2">
                    <span className="w-5 h-[1px] bg-[#8B0032]/40" />
                    Dedicated To
                    <span className="w-5 h-[1px] bg-[#8B0032]/40" />
                  </span>
                  <p className="font-serif italic text-xs text-stone-600 font-medium">
                    His Divine Grace
                  </p>
                </div>

                {/* Srila Prabhupada Picture from public/SP.png */}
                <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden border border-[#EFEAE2] shadow-md bg-[#FAF7F2] group">
                  <Image
                    src={customHeroImage || '/SP.png'}
                    alt="His Divine Grace A.C. Bhaktivedanta Swami Prabhupada"
                    fill
                    sizes="(max-width: 768px) 100vw, 380px"
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    priority
                  />
                </div>

                {/* Below picture texts */}
                <div className="mt-3 text-center space-y-1">
                  <h3 className="font-serif font-bold text-sm sm:text-base text-[#1E2229] leading-tight tracking-wide">
                    A.C. Bhaktivedanta Swami Prabhupada
                  </h3>
                  
                  <div className="pt-0.5 space-y-0.5 font-bengali">
                    <p className="text-xs font-semibold text-[#8B0032] leading-snug">
                      আন্তর্জাতিক কৃষ্ণভাবনামৃত সংঘ (ইস্কন)
                    </p>
                    <p className="text-[11px] sm:text-xs text-stone-600 leading-relaxed font-medium">
                      প্রতিষ্ঠাতা-আচার্যঃ কৃষ্ণকৃপাশ্রীমূর্তি শ্রীল অভয়চরণারবিন্দ ভক্তিবেদান্ত স্বামী প্রভুপাদ।
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
