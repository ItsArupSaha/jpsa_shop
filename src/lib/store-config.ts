/**
 * JPS Archives & Victory Flag Publications Store Configuration
 * Store Owner: vfpublication@gmail.com
 */

export const STORE_CONFIG = {
  ownerUid: process.env.NEXT_PUBLIC_STORE_OWNER_ID || 'bj6cUuUb67ZfiFNYjZg9WNMfuca2',
  email: 'vfpublication@gmail.com',
  name: 'Victory Flag Publications',
  bengaliName: 'ভিক্টোরি ফ্ল্যাগ পাবলিকেশন্স',
  subName: 'JPS Archives (বাংলাদেশ শাখা)',
  tagline: 'শ্রীল জয়পতাকা স্বামী গুরুমহারাজের অপ্রাকৃত পারমার্থিক সাহিত্য সম্ভার',
  phone: '01902962441',
  phoneFormatted: '+880 1902 962441',
  bkashNumber: '01902962441',
  nagadNumber: '01902962441',
  address: 'ইস্কন যুগলটিলা, পুরাতন মেডিকেল রোড, সিলেট-৩১০০, বাংলাদেশ',
  bankInfo: {
    bankName: 'যমুনা ব্যাংক (Jamuna Bank)',
    accountName: 'JPS ARCHIVES',
    accountNumber: '1001001592669',
    routingNumber: '130193045',
  },
  // 100% Free Courier/Delivery across Bangladesh! Strong hook.
  deliveryCharges: {
    insideSylhet: 0,
    outsideSylhet: 0,
    isFree: true,
  },
  // Preserve 5 copies per book in warehouse for archival safety
  preserveStockPerBook: 5,
};

/**
 * Calculates publicly available stock based on the 5-preservation rule:
 * Available = Math.max(0, actualStock - 5)
 */
export function getPublicAvailableStock(actualStock: number): number {
  const stock = typeof actualStock === 'number' ? actualStock : Number(actualStock) || 0;
  return Math.max(0, stock - STORE_CONFIG.preserveStockPerBook);
}

/**
 * Formats price in Taka: e.g. "৳ 300" (Clear, readable contrast)
 */
export function formatTakaPrice(amount: number): string {
  return `৳ ${Math.round(amount || 0)}`;
}

export function formatBengaliPrice(amount: number): string {
  return formatTakaPrice(amount);
}

export function toBengaliNumber(val: number | string): string {
  if (val === undefined || val === null) return '';
  return String(val);
}

/**
 * Returns human-readable Bengali stock status text & variant
 */
export function getStockStatus(actualStock: number): {
  available: number;
  isAvailable: boolean;
  text: string;
  badgeClass: string;
} {
  const available = getPublicAvailableStock(actualStock);
  if (available <= 0) {
    return {
      available: 0,
      isAvailable: false,
      text: 'স্টক শেষ',
      badgeClass: 'bg-stone-100 text-stone-600 border-stone-300',
    };
  }
  if (available <= 5) {
    return {
      available,
      isAvailable: true,
      text: `মাত্র ${available}টি কপি বাকি`,
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
    };
  }
  if (available <= 10) {
    return {
      available,
      isAvailable: true,
      text: `সীমিত স্টক (${available}টি)`,
      badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
    };
  }
  return {
    available,
    isAvailable: true,
    text: 'মজুদ আছে',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium',
  };
}
