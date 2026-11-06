export type StoreHighlightsConfig = {
  showHighlightSection: boolean;
  highlightTag: string;
  highlightTitle: string;
  highlightSubtitle: string;
  showPackages: boolean;
  featuredBookIds: string[];
  bannerText: string;
};

export const DEFAULT_HIGHLIGHTS: StoreHighlightsConfig = {
  showHighlightSection: true,
  highlightTag: 'বিশেষ আকর্ষণ • Spotlight',
  highlightTitle: 'নির্বাচিত বিশেষ গ্রন্থাবলী',
  highlightSubtitle: 'শ্রীল জয়পতাকা স্বামী গুরুমহারাজের মুখনিঃসৃত অমৃতবাণী — সারা বাংলাদেশে ১০০% ফ্রি হোম ডেলিভারি!',
  showPackages: false, // Turn packages OFF as requested
  featuredBookIds: [
    'Cx99LndUmx7UsGnxB72p', // শ্রীল প্রভুপাদ স্মরণামৃত ৩য় খণ্ড
    'PwZnXL39YRgpfJg6o4S8', // অথাতো ব্রহ্মজিজ্ঞাসা
  ],
  bannerText: '🚚 সারা বাংলাদেশে সকল অর্ডারে হোম ডেলিভারি সম্পূর্ণ ফ্রি (Free Shipping)!',
};
