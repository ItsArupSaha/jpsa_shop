import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import { AppWithAuthProvider } from './auth-wrapper';

export const metadata: Metadata = {
  title: 'Victory Flag Publications | শ্রীল জয়পতাকা স্বামী অপ্রাকৃত সাহিত্য সম্ভার',
  description: 'শ্রীল জয়পতাকা স্বামী গুরুমহারাজের পারমার্থিক গ্রন্থাবলী, ভগবদ-ভক্তি ও বেদান্ত সাহিত্য সম্ভার সরাসরি সংগ্রহ করুন। সারা বাংলাদেশে সম্পূর্ণ ফ্রি ডেলিভারি।',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Alegreya:wght@400;600;700&family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Serif+Bengali:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-[#FAF7F2] text-[#1E2229]">
        <AuthProvider>
          <AppWithAuthProvider>
            {children}
          </AppWithAuthProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
