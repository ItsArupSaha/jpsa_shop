'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowUp,
  Facebook,
  Heart,
  Instagram,
  Lock,
  Mail,
  MapPin,
  Phone,
  Twitter,
  Youtube,
} from 'lucide-react';
import { STORE_CONFIG } from '@/lib/store-config';

export function StoreFooter() {
  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer id="contact" className="bg-[#16191E] text-stone-300 font-sans text-xs pt-12 pb-8 border-t-2 border-[#8B0032] relative">
      <div className="container mx-auto px-4">
        
        {/* Main Footer Multi-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-stone-800">
          
          {/* Col 1: Brand & Socials */}
          <div className="space-y-3 lg:col-span-1">
            <div className="flex items-center gap-2">
              <div className="relative h-10 w-10 rounded-full overflow-hidden border border-[#F5B041]/80 shadow-md bg-white/10 flex items-center justify-center shrink-0">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  fill
                  sizes="40px"
                  className="object-contain p-0.5"
                />
              </div>
              <div>
                <span className="font-headline font-bold text-base text-white block">
                  Victory Flag
                </span>
                <span className="font-headline text-xs font-semibold text-[#F5B041] block -mt-1">
                  Publications
                </span>
              </div>
            </div>
            
            <p className="text-[11px] text-stone-400 leading-relaxed font-sans">
              Spreading spiritual wisdom through the profound teachings of His Holiness Jayapataka Swami.
            </p>

            <div className="flex items-center gap-2.5 pt-2">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="h-7 w-7 rounded-full bg-stone-800 hover:bg-[#8B0032] text-white flex items-center justify-center transition-colors"
              >
                <Facebook className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="h-7 w-7 rounded-full bg-stone-800 hover:bg-[#8B0032] text-white flex items-center justify-center transition-colors"
              >
                <Twitter className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="h-7 w-7 rounded-full bg-stone-800 hover:bg-[#8B0032] text-white flex items-center justify-center transition-colors"
              >
                <Instagram className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="h-7 w-7 rounded-full bg-stone-800 hover:bg-[#8B0032] text-white flex items-center justify-center transition-colors"
              >
                <Youtube className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-2.5">
            <h4 className="font-headline font-bold text-sm text-white">
              Quick Links
            </h4>
            <ul className="space-y-2 text-[11px] text-stone-400">
              <li>
                <a href="#books" className="hover:text-[#F5B041] transition-colors">
                  Our Books
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-[#F5B041] transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Others Links */}
          <div className="space-y-2.5">
            <h4 className="font-headline font-bold text-sm text-white">
              Others Links
            </h4>
            <ul className="space-y-1.5 text-[11px] text-stone-400">
              <li>
                <a
                  href="https://victoryflag.press"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#F5B041] transition-colors"
                >
                  victoryflag.press
                </a>
              </li>
              <li>
                <a
                  href="https://jayapatakaswamiarchives.net/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#F5B041] transition-colors"
                >
                  jayapatakaswamiarchives.net
                </a>
              </li>
              <li>
                <a
                  href="https://jayapatakaswami.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#F5B041] transition-colors"
                >
                  jayapatakaswami.com
                </a>
              </li>
              <li>
                <a
                  href="https://jayapatakaswamibangla.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#F5B041] transition-colors"
                >
                  jayapatakaswamibangla.com
                </a>
              </li>
              <li>
                <a
                  href="https://vyasapuja.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#F5B041] transition-colors"
                >
                  vyasapuja.com
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Policy */}
          <div className="space-y-2.5">
            <h4 className="font-headline font-bold text-sm text-white">
              Policy & Shipping
            </h4>
            <ul className="space-y-1.5 text-[11px] text-stone-400">
              <li><span className="text-emerald-400 font-semibold">Free Shipping on All Orders</span></li>
              <li><span>Easy Returns Policy</span></li>
              <li><span>Secure Cash on Delivery</span></li>
              <li><span>bKash & Bank Transfer</span></li>
              <li><span>Terms & Conditions</span></li>
            </ul>
          </div>

          {/* Col 5: Contact Info */}
          <div className="space-y-2.5">
            <h4 className="font-headline font-bold text-sm text-white">
              Contact Info
            </h4>
            <div className="space-y-2 text-[11px] text-stone-400">
              <p className="flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#F5B041] shrink-0 mt-0.5" />
                <span>{STORE_CONFIG.address}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-[#F5B041] shrink-0" />
                <a href={`tel:${STORE_CONFIG.phone}`} className="hover:text-white font-mono">
                  {STORE_CONFIG.phoneFormatted}
                </a>
              </p>
              <p className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-[#F5B041] shrink-0" />
                <a href={`mailto:${STORE_CONFIG.email}`} className="hover:text-white">
                  {STORE_CONFIG.email}
                </a>
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Credits & Floating Scroll to Top */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-stone-500">
          <p>© {new Date().getFullYear()} JPS Archives Bangladesh. All rights reserved.</p>
          
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-stone-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <Lock className="h-3 w-3" />
              <span>Staff Login</span>
            </Link>
          </div>
        </div>

      </div>

      {/* Floating Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 z-40 h-10 w-10 rounded-full bg-[#4A154B] hover:bg-[#8B0032] text-white shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 border border-white/20"
        title="Scroll to Top"
        aria-label="Scroll to Top"
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </footer>
  );
}
