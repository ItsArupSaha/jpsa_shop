/**
 * Book Metadata & Image Mapping for Victory Flag Publications / JPS Archives
 * Official catalog data synced from victoryflag.press
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
    author: 'শ্রীশ্রীমৎ জয়পতাকা স্বামী',
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
    author: 'স্টিভেন জে. রোজেন (সত্যানারায়ণ দাস)',
    image: '/book_image/Milwaukee to Mayapur.jpg',
    summary: 'শ্রীল জয়পতাকা স্বামী গুরুমহারাজের রোমাঞ্চকর পারমার্থিক আত্মজীবনী। আমেরিকার মিলওয়াকির শৈশব থেকে শ্রীল প্রভুপাদের একনিষ্ঠ সেবক ও ইসকনের অগ্রগণ্য বিশ্বনেতা হয়ে ওঠার অবিস্মরণীয় ঐতিহাসিক রূপরেখা, অটুট নিষ্ঠা ও বৈশ্বিক প্রচারকার্যের অনুকরণীয় ইতিহাস।',
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
    author: 'শ্রীশ্রীমৎ জয়পতাকা স্বামী',
    image: '/book_image/Vrindavane Bhajan.jpg',
    summary: 'পাশ্চাত্য দেশ প্রস্থান পূর্বে, শ্রীল ভক্তিসিদ্ধান্ত সরস্বতী ঠাকুরের নির্দেশ অনুসরণের গুরুত্বের তাৎক্ষণিকতার উপর শ্রীল প্রভুপাদ রচিত কালজয়ী কবিতা ‘বৃন্দাবনে ভজন’। শ্রীল জয়পতাকা স্বামী মহারাজ এই কবিতার অন্তর্নিহিত তত্ত্ব, ব্রজের শুদ্ধ ভজন ভাব ও কৃষ্ণপ্রেমের নিগূঢ় রহস্যের ওপর এক গভীর ও অপূর্ব অমৃতময় ভাষ্য প্রদান করেছেন।',
    pages: 138,
    isbn: '978-93-91940-57-7',
    size: 'L-21 x W-14 cm',
    weight: '0.22 kg',
    language: 'বাংলা (Bengali)',
  },

  // 4. Ananda Dayini Bhakti
  '2yuBoDEEbOOiJmFzGaVD': {
    bengaliTitle: 'আনন্দদায়িনী ভক্তি',
    author: 'শ্রীশ্রীমৎ জয়পতাকা স্বামী',
    image: '/book_image/আনন্দদায়িনী ভক্তি.webp',
    summary: 'কৃষ্ণভাবনামৃত আন্দোলনের মধ্যে চিন্তাশীল ভক্তদের জন্য কালাতীত জ্ঞানের সৌন্দর্য সম্পর্কিত অংশ দ্বারা এই গ্রন্থখানি পুষ্ট হয়েছে। এটি শ্রীকৃষ্ণভক্তি পদ্ধতির প্রতি আমাদের দৃষ্টিভঙ্গি উন্নত করতে ব্যবহারিক অন্তর্দৃষ্টিতে পরিপূর্ণ। শ্রীশ্রীমৎ জয়পতাকা স্বামী মহারাজের আধ্যাত্মিকতার প্রাচীন বৈদিক ধারণার সঙ্গতিপূর্ণ ব্যবহারিক আলোচনা এখানে অন্তর্ভুক্ত হয়েছে।',
    pages: 117,
    isbn: '978-93-91940-44-8',
    size: 'L-22 x W-14 cm',
    weight: '0.15 kg',
    language: 'বাংলা (Bengali)',
  },

  // 5. Amrita Barsana
  '5NJAME1RqZTrSBsc8QTE': {
    bengaliTitle: 'অমৃত-বর্ষণ',
    author: 'শ্রীশ্রীমৎ জয়পতাকা স্বামী',
    image: '/book_image/অমৃত বর্ষণ.webp',
    summary: 'শ্রীল প্রভুপাদের কিছু অমৃতময় তাৎপর্যের শক্তিশালী ব্যাখ্যা এই গ্রন্থে সন্নিবিষ্ট হয়েছে, যা বৈষ্ণবগণের কৃষ্ণভক্তি যাজনের জন্য পরম সহায়ক। জীবনের বিভিন্ন ঘাত-প্রতিঘাত ও বিভ্রান্তিকর পরিস্থিতিতে কীভাবে পারমার্থিক সিদ্ধান্তে অটল থাকতে হয়, তার সরল ও বাস্তবধর্মী দিকনির্দেশনা।',
    pages: 80,
    isbn: '978-81-942181-9-8',
    size: 'L-22 x W-14 cm',
    weight: '0.12 kg',
    language: 'বাংলা (Bengali)',
  },

  // 6. Divya Darsana
  '7oWcSqMnLhcxOWW5B4Me': {
    bengaliTitle: 'দিব্য দর্শন',
    author: 'শ্রীশ্রীমৎ জয়পতাকা স্বামী',
    image: '/book_image/Divya darshan.webp',
    summary: 'এই গ্রন্থখানিতে তথাকথিত বৈজ্ঞানিকদের জড় কল্পনাপ্রসূত চিন্তাভাবনার দ্বারা বিশ্বের যুব ও ছাত্র সমাজের মধ্যে যে বিভ্রান্তিকর মতবাদ প্রচারিত আছে এবং তার ফলে বিশ্ববাসীর যে ক্ষতিসাধন হয়েছে, সেই সকল বিভ্রান্তিকর তথ্যের উপযুক্ত প্রতিবাদ ও তার বিপক্ষে শাস্ত্র প্রমাণ এই গ্রন্থে শ্রীশ্রীমৎ জয়পতাকা স্বামী মহারাজ আলোচনা করেছেন।',
    pages: 130,
    isbn: '978-93-91940-17-0',
    size: 'L-21 x W-13 cm',
    weight: '0.14 kg',
    language: 'বাংলা (Bengali)',
  },

  // 7. Bhakti Vaccine
  'A4d0YZmTYpfYBhC9Z7AU': {
    bengaliTitle: 'ভক্তি ভ্যাকসিন (Bhakti Vaccine)',
    author: 'শ্রীশ্রীমৎ জয়পতাকা স্বামী',
    image: '/book_image/Bhakti Vaccine.webp',
    summary: 'শ্রীমদ্ভাগবতের শ্লোক ও শিক্ষার আলোকে কলিযুগের জাগতিক দুঃখকষ্ট ও মহামারীকালে ভক্তিজীবনকে সুরক্ষিত রাখার আধ্যাত্মিক ভ্যাকসিনের ন্যায় সুরক্ষা দানকারী উপদেশমালা। মায়িক জগতের মোহ ও পাপের আক্রমণ থেকে ভক্তি জীবনকে সুরক্ষিত রাখার আত্মিক প্রতিরক্ষামূলক শাস্ত্রীয় দিশা।',
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
    author: 'শ্রীশ্রীমৎ জয়পতাকা স্বামী',
    image: '/book_image/Sri Krishner Dhamer Obhimukhe.webp',
    summary: 'আমাদের চারপাশে অসংখ্য দার্শনিক ফাঁদ অপেক্ষা করছে, যা আমাদের দর্শন এবং মায়ার দ্বারা প্রভাবিত আমাদের ক্রিয়াকলাপের কাল্পনিক ন্যায্যতা দিয়ে নরকে টেনে নিয়ে যায়। এই গ্রন্থে পরম ধাম শ্রীধাম মায়াপুর ও বৃন্দাবনের অপ্রাকৃত মহিমা এবং সমস্ত পার্থিব মোহ ও বিভ্রান্তি অতিক্রম করে ভগবানের ধামে পৌঁছানোর রাজপথ নির্দেশ করা হয়েছে।',
    pages: 104,
    isbn: '978-81-942181-8-1',
    size: 'L-22 x W-14 cm',
    weight: '0.16 kg',
    language: 'বাংলা (Bengali)',
  },

  // 9. SP Smaranamrita 3
  'Cx99LndUmx7UsGnxB72p': {
    bengaliTitle: 'শ্রীল প্রভুপাদ স্মরণামৃত ৩য় খণ্ড',
    author: 'রূপা-রঘুনাথ বাণী',
    image: '/book_image/SP Smaranamrita 3.jpg',
    summary: 'ইসকনের প্রতিষ্ঠাতা-আচার্য কৃষ্ণকৃপাশ্রীমূর্তি শ্রীল প্রভুপাদ সমগ্র বিশ্বের বিদগ্ধ সমাজ, ধর্মীয় নেতৃবৃন্দ এবং অনুরূপ ব্যক্তিদের দ্বারা ভারতবর্ষের অধ্যাত্ম সংস্কৃতির আধুনিক কালের সর্ব প্রধান অগ্রদূত রূপে সর্বতোভাবে স্বীকৃত। শ্রীল প্রভুপাদের বিভিন্ন বিবৃতি এই গ্রন্থে অন্তর্ভুক্ত করা হয়েছে। যা আসলে তাঁর কয়েকটি ভিডিও সাক্ষাৎকারের বঙ্গানুবাদ।',
    pages: 507,
    isbn: '978-93-91940-13-3',
    size: 'L-21 x W-13 cm',
    weight: '0.64 kg',
    language: 'বাংলা (Bengali)',
    featured: true,
  },

  // 10. Bhagavad Sevar Rahasya
  'FxvFu8djuevJiB95rqlU': {
    bengaliTitle: 'ভগবৎ সেবার রহস্য',
    author: 'শ্রীশ্রীমৎ জয়পতাকা স্বামী',
    image: '/book_image/Bhagavad Sevar Rahasya.webp',
    summary: 'খালি চোখে এই গ্রন্থখানি অন্য যেকোন বইয়ের মতই কালি, কাগজ এবং স্ট্যাপল দ্বারা নির্মিত। কিন্তু জীবনে অন্তত একবার শ্রীশ্রীমৎ জয়পতাকা স্বামী মহারাজের ব্যাখ্যাত ‘ভগবৎ সেবার রহস্য’ গ্রন্থটি পাঠ করলে ভগবানের অপ্রাকৃত অর্চাবিগ্রহ সেবা ও দৈনন্দিন সেবামূলক সাধনার নিগূঢ় রহস্য হৃদয়ে উদ্ভাসিত হবে।',
    pages: 124,
    isbn: '978-81-942181-9-7',
    size: 'L-22 x W-14 cm',
    weight: '0.15 kg',
    language: 'বাংলা (Bengali)',
  },

  // 11. Divya Sannidhya 1.2
  'Fyf27Pz65DXETHsA2tA8': {
    bengaliTitle: 'দিব্য সান্নিধ্য ১.২ (Divya Sannidhya 1.2)',
    author: 'শ্রীশ্রীমৎ জয়পতাকা স্বামী',
    image: '/book_image/Divya Sannidhya 1.2.webp',
    summary: 'শ্রীল প্রভুপাদের সাথে শ্রীল জয়পতাকা স্বামী মহারাজের অমূল্য সান্নিধ্য ও প্রচার অভিজ্ঞতার ধারাবাহিক সংকলন। বিশ্বব্যাপী কৃষ্ণভাবনামৃত প্রচারের ঐতিহাসিক মুহূর্ত ও শিক্ষামৃত।',
    pages: 320,
    isbn: '978-93-9540-55-5',
    size: 'L-21 x W-13 cm',
    weight: '0.45 kg',
    language: 'বাংলা (Bengali)',
  },

  // 12. Jiva Jago
  'NeNz3VCoSgeHrXGpjOyk': {
    bengaliTitle: 'জীব জাগো',
    author: 'শ্রীশ্রীমৎ জয়পতাকা স্বামী',
    image: '/book_image/Jiv Jago.webp',
    summary: 'যদি আমরা নিজেদেরকে এই জগৎ দ্বারা আমাদের উপর আরোপিত সমস্ত প্রকারের দুঃখ থেকে মুক্ত করতে চাই, তাহলে আমাদের ভৌতিক অবস্থা (ভাল অথবা মন্দ) যাই হোক না কেন, আমাদের সর্বপ্রথমে আপন বুদ্ধিকে শুদ্ধ করে আমাদের অস্তিত্বকে শুদ্ধিকরণ করার প্রয়োজন রয়েছে। শ্রীশ্রীমৎ জয়পতাকা স্বামী মহারাজ কর্তৃক বিরচিত নবনির্মিত গ্রন্থ “জীব জাগো” নামক এই গ্রন্থখানি অবশ্যই সকলকে ক্ষমতাবান করবে যারা এটি অর্জনের জন্য সৌভাগ্যবান, যাতে তারা সমস্ত চৌদ্দ ভুবনে প্রাপ্তির যোগ্য একমাত্র বস্তুটি অর্জন করতে পারে।',
    pages: 184,
    isbn: '978-81-942181-8-0',
    size: 'L-21 x W-14 cm',
    weight: '0.25 kg',
    language: 'বাংলা (Bengali)',
  },

  // 13. SP Smaranamrita 2
  'OLUOSiXffGiqY8tGDkcu': {
    bengaliTitle: 'শ্রীল প্রভুপাদ স্মরণামৃত ২য় খণ্ড',
    author: 'রূপা-রঘুনাথ বাণী',
    image: '/book_image/SP Smaranamrita 2.jpg',
    summary: 'ইসকনের প্রতিষ্ঠাতা-আচার্য কৃষ্ণকৃপাশ্রীমূর্তি শ্রীল প্রভুপাদ সমগ্র বিশ্বের বিদগ্ধ সমাজ, ধর্মীয় নেতৃবৃন্দ এবং অনুরূপ ব্যক্তিদের দ্বারা ভারতবর্ষের অধ্যাত্ম সংস্কৃতির আধুনিক কালের সর্ব প্রধান অগ্রদূত রূপে সর্বতোভাবে স্বীকৃত। শ্রীল প্রভুপাদের বিভিন্ন বিবৃতি এই গ্রন্থে অন্তর্ভুক্ত করা হয়েছে। যা আসলে তাঁর কয়েকটি ভিডিও সাক্ষাৎকারের বঙ্গানুবাদ।',
    pages: 464,
    isbn: '978-81-942181-4-2',
    size: 'L-22 x W-14 cm',
    weight: '0.54 kg',
    language: 'বাংলা (Bengali)',
    featured: true,
  },

  // 14. Athata Brahmma Jiggasha
  'PwZnXL39YRgpfJg6o4S8': {
    bengaliTitle: 'অথাতো ব্রহ্মজিজ্ঞাসা',
    author: 'শ্রীশ্রীমৎ জয়পতাকা স্বামী',
    image: '/book_image/অথাতো ব্রহ্মজিজ্ঞাসা.webp',
    summary: 'মানব জীবনের একমাত্র সার্থকতা হলো এই প্রশ্নগুলো উত্থাপন করা: আমি কে? কোথা থেকে এসেছি? আমার জীবনের উদ্দেশ্য কী? পরম সত্য কে? জড় পদার্থ ও চেতনার পার্থক্য কী? শ্রীল জয়পতাকা স্বামী গুরুমহারাজের সাথে বিশ্বজুড়ে অগণিত ভক্ত ও শুভানুধ্যায়ীদের ইন্টারনেট ও পত্র মারফত হওয়া শত শত গভীর দার্শনিক প্রশ্নোত্তর সংকলন।',
    pages: 273,
    isbn: '978-93-91940-44-9',
    size: 'L-22 x W-14 cm',
    weight: '0.43 kg',
    language: 'বাংলা (Bengali)',
    featured: true,
  },

  // 15. Divya Sannidhya 1.1
  'UMPOaU1n3eNBP0AQ5hU9': {
    bengaliTitle: 'দিব্য সান্নিধ্য ১.১ (Divya Sannidhya 1.1)',
    author: 'শ্রীশ্রীমৎ জয়পতাকা স্বামী',
    image: '/book_image/Divya Sannidhya 1.1.webp',
    summary: 'শ্রীল প্রভুপাদের সান্নিধ্যে কাটানো দিনগুলোর অবিস্মরণীয় স্মৃতি, উপদেশ এবং বিশ্বব্যাপী সংকীর্তন আন্দোলনের সূচনা পর্বের প্রামাণ্য রূপরেখা।',
    pages: 310,
    isbn: '978-93-9540-54-8',
    size: 'L-21 x W-13 cm',
    weight: '0.44 kg',
    language: 'বাংলা (Bengali)',
  },

  // 16. Anander Sima Nai
  'X1F4nsWbs56DvIE3YYom': {
    bengaliTitle: 'আনন্দের সীমা নাই',
    author: 'শ্রীশ্রীমৎ জয়পতাকা স্বামী',
    image: '/book_image/আনন্দের সীমা নাই.webp',
    summary: 'যে পথ সুখের অভিমুখে নিয়ে যায় তা হচ্ছে কৃষ্ণভাবনামৃত, আর যে পথ অন্ধকারের দিকে নিয়ে যায় তা হচ্ছে জাগতিক আকাঙ্ক্ষা। এই নশ্বর জগতে চিরন্তন সুখের সন্ধান কীভাবে লাভ করা যায়, তা শ্রীল জয়পতাকা স্বামী মহারাজ এই গ্রন্থে পরম স্নেহে বর্ণনা করেছেন।',
    pages: 146,
    isbn: '978-81-944088-1-9',
    size: 'L-22 x W-14 cm',
    weight: '0.18 kg',
    language: 'বাংলা (Bengali)',
  },

  // 17. SP Smaranamrita 1
  'Z9siO8fbEjvNlwIbwDfw': {
    bengaliTitle: 'শ্রীল প্রভুপাদ স্মরণামৃত ১ম খণ্ড',
    author: 'রূপা-রঘুনাথ বাণী',
    image: '/book_image/SP Smaranamrita 1.webp',
    summary: 'ইসকনের প্রতিষ্ঠাতা-আচার্য কৃষ্ণকৃপাশ্রীমূর্তি শ্রীল প্রভুপাদ সমগ্র বিশ্বের বিদগ্ধ সমাজ, ধর্মীয় নেতৃবৃন্দ এবং অনুরূপ ব্যক্তিদের দ্বারা ভারতবর্ষের অধ্যাত্ম সংস্কৃতির আধুনিক কালের সর্ব প্রধান অগ্রদূত রূপে সর্বতোভাবে স্বীকৃত। শ্রীল প্রভুপাদের বিভিন্ন বিবৃতি এই গ্রন্থে অন্তর্ভুক্ত করা হয়েছে। যা আসলে তাঁর কয়েকটি ভিডিও সাক্ষাৎকারের বঙ্গানুবাদ।',
    pages: 521,
    isbn: '978-93-91940-16-4',
    size: 'L-21 x W-14 cm',
    weight: '0.58 kg',
    language: 'বাংলা (Bengali)',
    featured: true,
  },

  // 18. Divya Sannidhya 2
  'ZbBefftX92IuJxcuAYNW': {
    bengaliTitle: 'দিব্য সান্নিধ্য ২ (Divya Sannidhya 2)',
    author: 'শ্রীশ্রীমৎ জয়পতাকা স্বামী',
    image: '/book_image/Divya Sannidhya 2.webp',
    summary: 'শ্রীল প্রভুপাদের শ্রীমুখের বাণী ও বৈশ্বিক প্রচারকার্যে শ্রীল জয়পতাকা স্বামী মহারাজের ভূমিকা ও প্রচার অভিজ্ঞতার গভীর সংকলন।',
    pages: 340,
    isbn: '978-93-9540-56-2',
    size: 'L-21 x W-13 cm',
    weight: '0.48 kg',
    language: 'বাংলা (Bengali)',
  },

  // 19. Gauranga
  'ilPOw2naKFvFYbQDRGn3': {
    bengaliTitle: 'শ্রীমন্মহাপ্রভু গৌরাঙ্গ মহিমা',
    author: 'শ্রীশ্রীমৎ জয়পতাকা স্বামী',
    image: '/book_image/Gauranga.webp',
    summary: 'প্রামাণ্য গৌড়ীয় বৈষ্ণব গ্রন্থসমূহের আলোকে শ্রীচৈতন্য মহাপ্রভুর অপ্রাকৃত পারমার্থিক লীলাবিলাস এবং বর্তমান যুগে তাঁর সংকীর্তন আন্দোলনের বাস্তব প্রাসঙ্গিকতা ও শিক্ষামালা।',
    pages: 280,
    isbn: '978-93-9540-75-3',
    size: 'L-21 x W-13 cm',
    weight: '0.38 kg',
    language: 'বাংলা (Bengali)',
    featured: true,
  },

  // 20. Pariprasnena
  'k249sdRIpWwGfpbSgPY7': {
    bengaliTitle: 'পরিপ্রশ্নেন',
    author: 'শ্রীশ্রীমৎ জয়পতাকা স্বামী',
    image: '/book_image/Pariprashnena.webp',
    summary: 'জল্পনা-কল্পনা বা বৃথা তর্ক অথবা শাস্ত্রগ্রন্থের মনগড়া ব্যাখ্যার মাধ্যমে কখনোই আধ্যাত্মিক জীবনে অগ্রসর হওয়া যায় না। পরম তত্ত্বকে উপলব্ধি করতে হলে একজন সদগুরুর চরণে শরণাগত হয়ে বিনীতভাবে প্রশ্ন করতে হয়। ভগবতগীতার সেই শ্লোক ‘তদ্বিদ্ধি প্রণিপাতেন পরিপ্রশ্নেন সেবয়া’র আলোকে ভক্তদের শত শত জিজ্ঞাসার গভীর ও শাস্ত্রীয় প্রামাণ্য উত্তর।',
    pages: 360,
    isbn: '978-93-91940-34-8',
    size: 'L-21 x W-14 cm',
    weight: '0.38 kg',
    language: 'বাংলা (Bengali)',
  },

  // 21. SP Smaranamrita 4
  'kmW50EEyiGISUmQjYpx5': {
    bengaliTitle: 'শ্রীল প্রভুপাদ স্মরণামৃত ৪র্থ খণ্ড',
    author: 'রূপা-রঘুনাথ বাণী',
    image: '/book_image/SP Smaranamrita 4.webp',
    summary: 'ইসকনের প্রতিষ্ঠাতা-আচার্য কৃষ্ণকৃপাশ্রীমূর্তি শ্রীল প্রভুপাদ সমগ্র বিশ্বের বিদগ্ধ সমাজ, ধর্মীয় নেতৃবৃন্দ এবং অনুরূপ ব্যক্তিদের দ্বারা ভারতবর্ষের অধ্যাত্ম সংস্কৃতির আধুনিক কালের সর্ব প্রধান অগ্রদূত রূপে সর্বতোভাবে স্বীকৃত। শ্রীল প্রভুপাদের বিভিন্ন বিবৃতি এই গ্রন্থে অন্তর্ভুক্ত করা হয়েছে। যা আসলে তাঁর কয়েকটি ভিডিও সাক্ষাৎকারের বঙ্গানুবাদ।',
    pages: 520,
    isbn: '978-93-91940-13-4',
    size: 'L-21 x W-14 cm',
    weight: '0.58 kg',
    language: 'বাংলা (Bengali)',
    featured: true,
  },

  // 22. Godrom Kalpatabi
  'qn2Lf82itCocETN2jKeR': {
    bengaliTitle: 'শ্রী গোদ্রুম কল্পটবী',
    author: 'শ্রীল ভক্তিবিনোদ ঠাকুর / শ্রীশ্রীমৎ জয়পতাকা স্বামী',
    image: '/book_image/Sri Godrum Kalpatabi.png',
    summary: 'শ্রীল ভক্তিবিনোদ ঠাকুর প্রবর্তিত নামহট্ট আন্দোলন ও প্রচার কৌশলের ওপর শ্রীল জয়পতাকা স্বামী মহারাজের প্রামাণ্য শাস্ত্রীয় ব্যাখ্যা। গৃহী ভক্ত থেকে সর্বস্তরের মানুষের মাঝে চৈতন্য মহাপ্রভুর বাণী ছড়িয়ে দেওয়ার অতুলনীয় রূপরেখা।',
    pages: 160,
    isbn: '978-93-9540-85-2',
    size: 'L-21 x W-13 cm',
    weight: '0.24 kg',
    language: 'বাংলা (Bengali)',
  },

  // 23. Hriday Sparshi
  'uaYXXyt9sNQi9iiM5YbU': {
    bengaliTitle: 'হৃদয়স্পর্শী',
    author: 'শ্রীশ্রীমৎ জয়পতাকা স্বামী',
    image: '/book_image/Hridaysparshi.webp',
    summary: '‘হৃদয়স্পর্শী’ নামক এই গ্রন্থখানি হল শ্রীশ্রীমৎ জয়পতাকা স্বামী মহারাজের গ্রন্থাবলী ও প্রবচন থেকে উদ্ধৃত কথামৃত সংকলন। গুরুমহারাজের মুখনিঃসৃত উপদেশ, বৈষ্ণব সদাচার এবং ভগবদ-প্রেম জাগরণের হৃদয়গ্রাহী বার্তা এতে সংকলিত হয়েছে যা ভক্ত হৃদয়ে নিত্য অনুপ্রেরণা জোগায়।',
    pages: 195,
    isbn: '978-93-91940-12-6',
    size: 'L-21 x W-14 cm',
    weight: '0.24 kg',
    language: 'বাংলা (Bengali)',
    featured: true,
  },

  // 24. Prati Nagaradi Gram
  'vGzowPZbIwYaWocNQ5WP': {
    bengaliTitle: 'প্রতি নগরাদি গ্রামে',
    author: 'শ্রীশ্রীমৎ জয়পতাকা স্বামী',
    image: '/book_image/Prati Nagaradi Grame.png',
    summary: 'শ্রীচৈতন্য মহাপ্রভুর বাণী \'পৃথিবীতে আছে যত নগরাদি গ্রাম, সর্বত্র প্রচার হইবে মোর নাম\' বাস্তবায়নে শ্রীল জয়পতাকা স্বামী মহারাজের ক্লান্তিহীন বিশ্বভ্রমণ, আত্মত্যাগ, প্রচার অভিজ্ঞতা ও ডায়েরির জীবন্ত সংকলন।',
    pages: 250,
    isbn: '978-93-9540-95-1',
    size: 'L-21 x W-13 cm',
    weight: '0.36 kg',
    language: 'বাংলা (Bengali)',
  },

  // 25. Kalir Dursopana
  'x12kP6AtTb6oGpd5cHsh': {
    bengaliTitle: 'কলির দুঃস্বপ্ন',
    author: 'শ্রীশ্রীমৎ জয়পতাকা স্বামী',
    image: '/book_image/কলির দুঃস্বপ্ন.webp',
    summary: 'এটি মূলত একটি পারমার্থিক নাটকের বই। শ্রীশ্রীমৎ জয়পতাকা স্বামী মহারাজ শ্রীমদ্ভাগবতের কাহিনী অবলম্বনে এই নাট্যগ্রন্থটি রচনা করেছেন। শ্রীল প্রভুপাদ বলেছেন, ভক্তদের শ্রীকৃষ্ণের লীলাবিলাস সম্বন্ধিত নাটক উপস্থাপনা করা উচিত—তাহলে এর অমৃতময় শিক্ষা বর্তমান সমাজকে আধ্যাত্মিক অবক্ষয়ের হাত থেকে রক্ষা করবে।',
    pages: 86,
    isbn: '978-81-944088-0-2',
    size: 'L-21 x W-14 cm',
    weight: '0.10 kg',
    language: 'বাংলা (Bengali)',
  },

  // 26. Amar Putro
  'uOhJM9aSKBlEDJyIdvf9': {
    bengaliTitle: 'আমার পুত্র',
    author: 'শ্রীশ্রীমৎ জয়পতাকা স্বামী',
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
    author: isMagazine ? 'শ্রীল জয়পতাকা স্বামী সাহিত্য পরিষদ' : 'শ্রীশ্রীমৎ জয়পতাকা স্বামী',
    image: '', // Keep blank if no image exists in public/book_image
    summary: 'শ্রীল জয়পতাকা স্বামী গুরুমহারাজের শিক্ষা ও প্রচারের অপ্রাকৃত পারমার্থিক সংকলন। ভগবদ-ভক্তি জীবনের নিত্য সঙ্গী।',
    pages: isMagazine ? 64 : 150,
    isbn: '978-93-9540-00-0',
    size: 'L-21 x W-13 cm',
    weight: isMagazine ? '0.12 kg' : '0.25 kg',
    language: 'বাংলা (Bengali)',
  };
}
