/**
 * Book Metadata & Image Mapping for Victory Flag Publications / JPS Archives
 */

export type BookMetadata = {
  bengaliTitle: string;
  author: string;
  image?: string;
  summary: string;
  pages?: number;
  isbn?: string;
  size?: string;
  weight?: string;
  language: string;
  featured?: boolean;
};

export const BOOK_CATALOG_META: Record<string, BookMetadata> = {
  // 1. Ante Narayan Smriti
  '1EJXbx7N6moFqydvO2Ao': {
    bengaliTitle: 'অন্তে নারায়ণ স্মৃতি',
    author: 'শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/অন্তে নারায়ণ স্মৃতি.webp',
    summary: 'জীবনের চরম লক্ষ্য ও অন্তিম মুহূর্তে ভগবানের অপ্রাকৃত দিব্য রূপ ও নাম স্মরণের তাৎপর্য নিয়ে শ্রীল জয়পতাকা স্বামী গুরুমহারাজের বিশেষ প্রামাণ্য শাস্ত্রীয় বিশ্লেষণ।',
    pages: 144,
    isbn: '978-93-9540-10-1',
    size: 'L-21 x W-13 cm',
    weight: '0.22 kg',
    language: 'বাংলা (Bengali)',
    featured: true,
  },
  // 2. Milwaukee to Mayapur
  '1nnHB2n4idVzu1CV1cDR': {
    bengaliTitle: 'মিলওয়াকি টু মায়াপুর (Milwaukee to Mayapur)',
    author: 'শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/Milwaukee to Mayapur.jpg',
    summary: 'শ্রীল জয়পতাকা স্বামী গুরুমহারাজের সুদীর্ঘ পারমার্থিক আত্মজীবনী ও শ্রীল প্রভুপাদের সান্নিধ্যে আসার রোমাঞ্চকর ও অনুপ্রেরণাদায়ী স্মৃতিকথা।',
    pages: 480,
    isbn: '978-93-9540-15-2',
    size: 'L-22 x W-14 cm',
    weight: '0.55 kg',
    language: 'বাংলা (Bengali)',
    featured: true,
  },
  // 3. Vrindavane Bhajan
  '2N9uIP1gIjMTmj2Mmnyd': {
    bengaliTitle: 'বৃন্দাবনে ভজন',
    author: 'শ্রীল ভক্তিবেদান্ত স্বামী প্রভুপাদ / শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/Vrindavane Bhajan.jpg',
    summary: 'শ্রীধাম বৃন্দাবনের শুদ্ধ প্রেমময় ভজন ও ব্রজধামের অপ্রাকৃত মাধুর্য আস্বাদনের গভীর আধ্যাত্মিক দিকনির্দেশনা।',
    pages: 192,
    isbn: '978-93-9540-20-4',
    size: 'L-21 x W-13 cm',
    weight: '0.28 kg',
    language: 'বাংলা (Bengali)',
  },
  // 4. Ananda Dayini Bhakti
  '2yuBoDEEbOOiJmFzGaVD': {
    bengaliTitle: 'আনন্দদায়িনী ভক্তি',
    author: 'শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/আনন্দদায়িনী ভক্তি.webp',
    summary: 'ভক্তিযোগ অনুশীলনের মাধ্যমে হৃদয়ের সকল কলুষ দূর করে নিত্য আনন্দ ও কৃষ্ণপ্রেম লাভের অনুপম পথনির্দেশিকা।',
    pages: 210,
    isbn: '978-93-9540-25-8',
    size: 'L-21 x W-13 cm',
    weight: '0.30 kg',
    language: 'বাংলা (Bengali)',
  },
  // 5. Amrita Barsana
  '5NJAME1RqZTrSBsc8QTE': {
    bengaliTitle: 'অমৃত বর্ষণ',
    author: 'শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/অমৃত বর্ষণ.webp',
    summary: 'শ্রীল জয়পতাকা স্বামী মহারাজের অমৃতময় পারমার্থিক ভাষণ, উপদেশাবলী ও ভক্তদের প্রশ্নের সুগভীর উত্তরের সংকলন।',
    pages: 180,
    isbn: '978-93-9540-30-2',
    size: 'L-21 x W-13 cm',
    weight: '0.26 kg',
    language: 'বাংলা (Bengali)',
  },
  // 6. Divya Darsana
  '7oWcSqMnLhcxOWW5B4Me': {
    bengaliTitle: 'দিব্য দর্শন',
    author: 'শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/Divya darshan.webp',
    summary: 'পারমার্থিক দৃষ্টিকোণ থেকে জীবনের বাস্তবতা ও চৈতন্য মহাপ্রভুর অপ্রাকৃত দর্শনের এক উজ্জ্বল আলোকপাত।',
    pages: 160,
    isbn: '978-93-9540-35-7',
    size: 'L-21 x W-13 cm',
    weight: '0.24 kg',
    language: 'বাংলা (Bengali)',
  },
  // 7. Bhakti Vaccine
  'A4d0YZmTYpfYBhC9Z7AU': {
    bengaliTitle: 'ভক্তি ভ্যাকসিন (Bhakti Vaccine)',
    author: 'শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/Bhakti Vaccine.webp',
    summary: 'মায়িক জগতের মোহ ও পাপের আক্রমণ থেকে ভক্তি জীবনকে সুরক্ষিত রাখার আত্মিক প্রতিরক্ষামূলক শাস্ত্রীয় উপদেশ।',
    pages: 128,
    isbn: '978-93-9540-40-1',
    size: 'L-20 x W-12 cm',
    weight: '0.19 kg',
    language: 'বাংলা (Bengali)',
    featured: true,
  },
  // 8. Sri Krishna Dhamer Abhimukhe
  'CKPZxRAjMFAsQZyN2tQs': {
    bengaliTitle: 'শ্রীকৃষ্ণের ধামের অভিমুখে',
    author: 'শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/Sri Krishner Dhamer Obhimukhe.webp',
    summary: 'পরম ধাম গোলক বৃন্দাবন ও নবদ্বীপ মায়াপুরের মহিমা এবং ভক্তের ধামে গমনের অনুপম যাত্রাপথ।',
    pages: 220,
    isbn: '978-93-9540-45-6',
    size: 'L-21 x W-13 cm',
    weight: '0.32 kg',
    language: 'বাংলা (Bengali)',
  },
  // 9. SP Smaranamrita 3
  'Cx99LndUmx7UsGnxB72p': {
    bengaliTitle: 'শ্রীল প্রভুপাদ স্মরণামৃত ৩য় খণ্ড',
    author: 'রূপ-রঘুনাথ দাসী',
    image: '/book_image/SP Smaranamrita 3.jpg',
    summary: 'ইস্‌কন-এর প্রতিষ্ঠাতা আচার্য কৃষ্ণকৃপামূর্তি শ্রীল এ. সি. ভক্তিবেদান্ত স্বামী প্রভুপাদের সঙ্গসুধা, তাঁর পারমার্থিক ব্যক্তিত্ব ও নিত্য স্মৃতিকথার এক অনুপম সংকলন।',
    pages: 597,
    isbn: '978-93-9540-13-3',
    size: 'L-21 x W-13 cm',
    weight: '0.84 kg',
    language: 'বাংলা (Bengali)',
    featured: true,
  },
  // 10. Bhagavad Sevar Rahasya
  'FxvFu8djuevJiB95rqlU': {
    bengaliTitle: 'ভগবদ্ সেবার রহস্য',
    author: 'শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/Bhagavad Sevar Rahasya.webp',
    summary: 'ভগবানের অপ্রাকৃত অর্চাবিগ্রহ সেবা ও ভক্তিমূলক দৈনন্দিন সাধনার অন্তর্নিহিত নিগূঢ় রহস্যের সহজ শাস্ত্রীয় ব্যাখ্যা।',
    pages: 176,
    isbn: '978-93-9540-50-0',
    size: 'L-21 x W-13 cm',
    weight: '0.25 kg',
    language: 'বাংলা (Bengali)',
  },
  // 11. Divya Sannidhya 1.2
  'Fyf27Pz65DXETHsA2tA8': {
    bengaliTitle: 'দিব্য সান্নিধ্য ১.২ (Divya Sannidhya 1.2)',
    author: 'শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/Divya Sannidhya 1.2.webp',
    summary: 'শ্রীল প্রভুপাদের সাথে শ্রীল জয়পতাকা স্বামী মহারাজের অমূল্য সান্নিধ্য ও প্রচার অভিজ্ঞতার ধারাবাহিক সংকলন।',
    pages: 320,
    isbn: '978-93-9540-55-5',
    size: 'L-21 x W-13 cm',
    weight: '0.45 kg',
    language: 'বাংলা (Bengali)',
  },
  // 12. Jiva Jago
  'NeNz3VCoSgeHrXGpjOyk': {
    bengaliTitle: 'জীব জাগো',
    author: 'শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/Jiv Jago.webp',
    summary: 'মায়ার নিদ্রায় নিমগ্ন জীবকে আত্মোপলব্ধি ও ভগবদ্ভক্তিতে জাগ্রত করার প্রাণস্পর্শী বৈদিক আহ্বান।',
    pages: 150,
    isbn: '978-93-9540-60-9',
    size: 'L-20 x W-12 cm',
    weight: '0.21 kg',
    language: 'বাংলা (Bengali)',
  },
  // 13. SP Smaranamrita 2
  'OLUOSiXffGiqY8tGDkcu': {
    bengaliTitle: 'শ্রীল প্রভুপাদ স্মরণামৃত ২য় খণ্ড',
    author: 'রূপ-রঘুনাথ দাসী',
    image: '/book_image/SP Smaranamrita 2.jpg',
    summary: 'শ্রীল প্রভুপাদের নিত্য সঙ্গ ও শিক্ষার অমূল্য স্মৃতিকথার দ্বিতীয় খণ্ড।',
    pages: 580,
    isbn: '978-93-9540-12-6',
    size: 'L-21 x W-13 cm',
    weight: '0.82 kg',
    language: 'বাংলা (Bengali)',
    featured: true,
  },
  // 14. Athata Brahmma Jiggasha
  'PwZnXL39YRgpfJg6o4S8': {
    bengaliTitle: 'অথাতো ব্রহ্মজিজ্ঞাসা',
    author: 'শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/অথাতো ব্রহ্মজিজ্ঞাসা.webp',
    summary: 'বেদান্ত সূত্রের প্রারম্ভিক সূত্র "অথাতো ব্রহ্মজিজ্ঞাসা" নিয়ে শ্রীল জয়পতাকা স্বামী মহারাজের গভীর দার্শনিক ও পারমার্থিক আলোচনা।',
    pages: 240,
    isbn: '978-93-9540-65-4',
    size: 'L-21 x W-13 cm',
    weight: '0.34 kg',
    language: 'বাংলা (Bengali)',
    featured: true,
  },
  // 15. Divya Sannidhya 1.1
  'UMPOaU1n3eNBP0AQ5hU9': {
    bengaliTitle: 'দিব্য সান্নিধ্য ১.১ (Divya Sannidhya 1.1)',
    author: 'শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/Divya Sannidhya 1.1.webp',
    summary: 'শ্রীল প্রভুপাদের সান্নিধ্যে কাটানো দিনগুলোর অবিস্মরণীয় স্মৃতি ও প্রচারকার্যের রূপরেখা।',
    pages: 310,
    isbn: '978-93-9540-54-8',
    size: 'L-21 x W-13 cm',
    weight: '0.44 kg',
    language: 'বাংলা (Bengali)',
  },
  // 16. Anander Sima Nai
  'X1F4nsWbs56DvIE3YYom': {
    bengaliTitle: 'আনন্দের সীমা নাই',
    author: 'শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/আনন্দের সীমা নাই.webp',
    summary: 'কৃষ্ণভক্তির পরম আনন্দ ও আস্বাদন নিয়ে রচিত অত্যন্ত জনপ্রিয় একটি গ্রন্থ।',
    pages: 160,
    isbn: '978-93-9540-70-8',
    size: 'L-20 x W-12 cm',
    weight: '0.23 kg',
    language: 'বাংলা (Bengali)',
  },
  // 17. SP Smaranamrita 1
  'Z9siO8fbEjvNlwIbwDfw': {
    bengaliTitle: 'শ্রীল প্রভুপাদ স্মরণামৃত ১ম খণ্ড',
    author: 'রূপ-রঘুনাথ দাসী',
    image: '/book_image/SP Smaranamrita 1.webp',
    summary: 'শ্রীল প্রভুপাদের দিব্য সঙ্গ ও জীবনের অনুপ্রেরণাদায়ী স্মৃতিকথার প্রথম খণ্ড।',
    pages: 560,
    isbn: '978-93-9540-11-9',
    size: 'L-21 x W-13 cm',
    weight: '0.80 kg',
    language: 'বাংলা (Bengali)',
    featured: true,
  },
  // 18. Divya Sannidhya 2
  'ZbBefftX92IuJxcuAYNW': {
    bengaliTitle: 'দিব্য সান্নিধ্য ২ (Divya Sannidhya 2)',
    author: 'শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/Divya Sannidhya 2.webp',
    summary: 'শ্রীল প্রভুপাদের শ্রীমুখের বাণী ও বৈশ্বিক প্রচারকার্যে শ্রীল জয়পতাকা স্বামী মহারাজের ভূমিকা।',
    pages: 340,
    isbn: '978-93-9540-56-2',
    size: 'L-21 x W-13 cm',
    weight: '0.48 kg',
    language: 'বাংলা (Bengali)',
  },
  // 19. Gauranga
  'ilPOw2naKFvFYbQDRGn3': {
    bengaliTitle: 'শ্রীমন্মহাপ্রভু গৌরাঙ্গ মহিমা',
    author: 'শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/Gauranga.webp',
    summary: 'শ্রীচৈতন্য মহাপ্রভুর অপ্রাকৃত প্রেমধর্ম ও সংকীর্তন আন্দোলনের দিব্য মহিমা কীর্তন।',
    pages: 280,
    isbn: '978-93-9540-75-3',
    size: 'L-21 x W-13 cm',
    weight: '0.38 kg',
    language: 'বাংলা (Bengali)',
    featured: true,
  },
  // 20. Pariprasnena
  'k249sdRIpWwGfpbSgPY7': {
    bengaliTitle: 'পরিপর্শ্নেন',
    author: 'শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/Pariprashnena.webp',
    summary: 'গীতার নির্দেশানুযায়ী "তদ্বিদ্ধি প্রণিপাতেন পরিপ্রশ্নেন সেবয়া"—ভক্তদের অন্তরের প্রশ্নের সুগভীর দার্শনিক মীমাংসা।',
    pages: 200,
    isbn: '978-93-9540-80-7',
    size: 'L-21 x W-13 cm',
    weight: '0.29 kg',
    language: 'বাংলা (Bengali)',
  },
  // 21. SP Smaranamrita 4
  'kmW50EEyiGISUmQjYpx5': {
    bengaliTitle: 'শ্রীল প্রভুপাদ স্মরণামৃত ৪র্থ খণ্ড',
    author: 'রূপ-রঘুনাথ দাসী',
    image: '/book_image/SP Smaranamrita 4.webp',
    summary: 'শ্রীল প্রভুপাদ স্মরণামৃত ধারাবাহিকের সর্বশেষ ও সমাপ্তি খণ্ড। ভক্তের জন্য এক অনন্য সম্পদ।',
    pages: 610,
    isbn: '978-93-9540-14-0',
    size: 'L-21 x W-13 cm',
    weight: '0.86 kg',
    language: 'বাংলা (Bengali)',
    featured: true,
  },
  // 22. Godrom Kalpatabi
  'qn2Lf82itCocETN2jKeR': {
    bengaliTitle: 'শ্রী গোদ্রুম কল্পটবী',
    author: 'শ্রীল ভক্তিবিনোদ ঠাকুর / শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/Sri Godrum Kalpatabi.png',
    summary: 'শ্রীল ভক্তিবিনোদ ঠাকুর প্রতিষ্ঠিত নামহট্ট প্রচার ও বৈষ্ণব আদর্শের প্রামাণ্য শাস্ত্রীয় সংস্করণ।',
    pages: 160,
    isbn: '978-93-9540-85-2',
    size: 'L-21 x W-13 cm',
    weight: '0.24 kg',
    language: 'বাংলা (Bengali)',
  },
  // 23. Hriday Sparshi
  'uaYXXyt9sNQi9iiM5YbU': {
    bengaliTitle: 'হৃদয়স্পর্শী কথামৃত',
    author: 'শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/Hridaysparshi.webp',
    summary: 'হৃদয়ের গভীর অনুভূতি ও চৈতন্য মহাপ্রভুর প্রতি অপ্রাকৃত প্রেম জাগরণের অত্যন্ত হৃদয়গ্রাহী পারমার্থিক বাণী।',
    pages: 190,
    isbn: '978-93-9540-90-6',
    size: 'L-21 x W-13 cm',
    weight: '0.27 kg',
    language: 'বাংলা (Bengali)',
    featured: true,
  },
  // 24. Prati Nagaradi Gram
  'vGzowPZbIwYaWocNQ5WP': {
    bengaliTitle: 'প্রতি নগরাদি গ্রামে',
    author: 'শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/Prati Nagaradi Grame.png',
    summary: 'চৈতন্য মহাপ্রভুর সংকীর্তন আন্দোলনের বিশ্বব্যাপী প্রসারের জীবন্ত ইতিহাস ও ভবিষ্যৎ দৃষ্টিভঙ্গি।',
    pages: 250,
    isbn: '978-93-9540-95-1',
    size: 'L-21 x W-13 cm',
    weight: '0.36 kg',
    language: 'বাংলা (Bengali)',
  },
  // 25. Kalir Dursopana
  'x12kP6AtTb6oGpd5cHsh': {
    bengaliTitle: 'কলির দুঃস্বপ্ন',
    author: 'শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/কলির দুঃস্বপ্ন.webp',
    summary: 'কলিযুগের অবক্ষয় ও দুর্দশা থেকে আত্মরক্ষা করে হরিনাম সংকীর্তনের মাধ্যমে পরম মুক্তির উপায়।',
    pages: 140,
    isbn: '978-93-9540-99-9',
    size: 'L-20 x W-12 cm',
    weight: '0.20 kg',
    language: 'বাংলা (Bengali)',
  },
  // 26. Amar Putro
  'uOhJM9aSKBlEDJyIdvf9': {
    bengaliTitle: 'আমার পুত্র',
    author: 'শ্রীল জয়পতাকা স্বামী',
    image: '/book_image/amar putro.jpg',
    summary: 'শ্রীল জয়পতাকা স্বামী গুরুমহারাজের বাল্যকাল, মাতৃভক্তি এবং কৃষ্ণভাবনামৃত প্রচারক হিসেবে জীবনের প্রথম অধ্যায়ের হৃদয়গ্রাহী স্মৃতিচারণ।',
    pages: 200,
    isbn: '978-93-9540-88-3',
    size: 'L-21 x W-13 cm',
    weight: '0.28 kg',
    language: 'বাংলা (Bengali)',
  },
};

/**
 * Returns complete book metadata or graceful Bengali defaults
 */
export function getBookMetadata(bookId: string, englishTitle = ''): BookMetadata {
  if (BOOK_CATALOG_META[bookId]) {
    return BOOK_CATALOG_META[bookId];
  }

  // Fallbacks for magazine series or miscellaneous items
  const isMagazine = englishTitle.includes('Sri Guru Prasanga') || englishTitle.includes('SGP');
  const isPic = englishTitle.includes('Stand Pic') || englishTitle.includes('Japa');

  let title = englishTitle;
  if (isMagazine) {
    const match = englishTitle.match(/6\.\d+/);
    title = `শ্রী গুরুপ্রসঙ্গ পত্রিকা (${match ? match[0] : 'মাসিক'})`;
  } else if (isPic) {
    title = `শ্রীল গুরুমহারাজের বাঁধাই করা ছবি (${englishTitle})`;
  } else if (englishTitle === 'Little Abhay') {
    title = 'লিটল অভয় (Little Abhay)';
  } else if (englishTitle === 'Amar Putro') {
    title = 'আমার পুত্র';
  }

  return {
    bengaliTitle: title || 'পারমার্থিক গ্রন্থাবলী',
    author: isMagazine ? 'শ্রীল জয়পতাকা স্বামী সাহিত্য পরিষদ' : 'শ্রীল জয়পতাকা স্বামী',
    image: '', // Keep blank if no image exists in public/book_image
    summary: 'শ্রীল জয়পতাকা স্বামী গুরুমহারাজের শিক্ষা ও প্রচারের অপ্রাকৃত পারমার্থিক সংকলন। ভগবদ-ভক্তি জীবনের নিত্য সঙ্গী।',
    pages: isMagazine ? 64 : 150,
    isbn: '978-93-9540-00-0',
    size: 'L-21 x W-13 cm',
    weight: isMagazine ? '0.12 kg' : '0.25 kg',
    language: 'বাংলা (Bengali)',
  };
}
