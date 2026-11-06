'use client';

import * as React from 'react';
import { Check, Loader2, Save, Sparkles, Store, Eye } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getItems } from '@/lib/actions';
import { getStoreHighlights, updateStoreHighlights } from '@/lib/store-highlights';
import type { StoreHighlightsConfig } from '@/lib/store-highlights-types';
import type { Item } from '@/lib/types';
import { getBookMetadata } from '@/lib/book-catalog-data';

export default function StorefrontSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [items, setItems] = React.useState<Item[]>([]);

  // Config States
  const [showHighlightSection, setShowHighlightSection] = React.useState(true);
  const [showPackages, setShowPackages] = React.useState(true);
  const [highlightTag, setHighlightTag] = React.useState('');
  const [highlightTitle, setHighlightTitle] = React.useState('');
  const [highlightSubtitle, setHighlightSubtitle] = React.useState('');
  const [featuredBookIds, setFeaturedBookIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!user?.uid) return;
    Promise.all([getItems(user.uid), getStoreHighlights(user.uid)])
      .then(([books, config]) => {
        setItems(books);
        setShowHighlightSection(config.showHighlightSection);
        setShowPackages(config.showPackages);
        setHighlightTag(config.highlightTag);
        setHighlightTitle(config.highlightTitle);
        setHighlightSubtitle(config.highlightSubtitle);
        setFeaturedBookIds(config.featuredBookIds || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const toggleBookSelection = (id: string) => {
    setFeaturedBookIds((prev) =>
      prev.includes(id) ? prev.filter((bId) => bId !== id) : [...prev, id]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const payload: Partial<StoreHighlightsConfig> = {
        showHighlightSection,
        showPackages,
        highlightTag,
        highlightTitle,
        highlightSubtitle,
        featuredBookIds,
      };

      const res = await updateStoreHighlights(user.uid, payload);
      if (res.success) {
        toast({
          title: 'সেটিংস সংরক্ষিত হয়েছে!',
          description: 'আপনার ওয়েবসাইটের হাইলাইট ও প্যাকেজ ডিসপ্লে সফলভাবে আপডেট হয়েছে।',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'ব্যর্থ হয়েছে',
          description: res.error || 'সেটিংস আপডেট করা যায়নি।',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'ত্রুটি',
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-bengali max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="font-headline text-2xl font-bold tracking-tight text-[#1E2229] flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span>স্টোরফ্রন্ট ও হাইলাইট সেটিংস (Storefront Control)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            ল্যান্ডিং পেজে কোন বইগুলো হাইলাইট করবেন এবং প্যাকেজগুলো প্রদর্শন করবেন কিনা তা নিয়ন্ত্রণ করুন
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="h-9">
          <Link href="/" target="_blank" className="flex items-center gap-1.5 text-xs">
            <Eye className="h-3.5 w-3.5" />
            <span>লাইভ ওয়েবসাইট দেখুন</span>
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Toggle Switches Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-headline">মূল ডিসপ্লে সুইচ (Display Switches)</CardTitle>
            <CardDescription className="text-xs">
              ল্যান্ডিং পেজের বিশেষ সেকশনগুলো এক ক্লিকে চালু বা বন্ধ করুন
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show Highlight Section Switch */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/40">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-[#1E2229]">
                  হাইলাইট সেকশন প্রদর্শন (Show Highlight Section)
                </Label>
                <p className="text-xs text-muted-foreground">
                  হিরো ব্যানারের পরপরই বিশেষ নির্বাচিত বই ও অফার সেকশনটি চালু রাখবেন কি না।
                </p>
              </div>
              <Switch
                checked={showHighlightSection}
                onCheckedChange={setShowHighlightSection}
              />
            </div>

            {/* Show Packages Switch */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/40">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-[#1E2229]">
                  প্যাকেজ প্রদর্শন করুন (Show Festive Packages)
                </Label>
                <p className="text-xs text-muted-foreground">
                  উৎসব উপলক্ষে বিশেষ বান্ডেল প্যাকেজগুলো ওয়েবসাইটে দেখানো হবে কিনা। বন্ধ রাখলে প্যাকেজ সেকশনটি সম্পূর্ণ লুকিয়ে থাকবে।
                </p>
              </div>
              <Switch
                checked={showPackages}
                onCheckedChange={setShowPackages}
              />
            </div>
          </CardContent>
        </Card>

        {/* Text Customization Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-headline">হাইলাইট শিরোনাম ও ট্যাগ</CardTitle>
            <CardDescription className="text-xs">
              হাইলাইট সেকশনের টেক্সট পরিবর্তন করুন
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs font-semibold">ছোট ব্যাজ ট্যাগ</Label>
              <Input
                value={highlightTag}
                onChange={(e) => setHighlightTag(e.target.value)}
                placeholder="উদা: বিশেষ আকর্ষণ / শুভ সূচনা"
                className="mt-1 text-xs h-9 rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">মূল শিরোনাম</Label>
              <Input
                value={highlightTitle}
                onChange={(e) => setHighlightTitle(e.target.value)}
                placeholder="উদা: নির্বাচিত অমূল্য গ্রন্থাবলী ও উৎসব প্যাকেজ"
                className="mt-1 text-xs h-9 rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">সাব-শিরোনাম</Label>
              <Input
                value={highlightSubtitle}
                onChange={(e) => setHighlightSubtitle(e.target.value)}
                placeholder="উদা: শ্রীল জয়পতাকা স্বামী গুরুমহারাজের মুখনিঃসৃত অমৃতবাণী"
                className="mt-1 text-xs h-9 rounded-xl"
              />
            </div>
          </CardContent>
        </Card>

        {/* Select Featured Books Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-headline">
                  হাইলাইট করার জন্য বই নির্বাচন করুন ({featuredBookIds.length}টি নির্বাচিত)
                </CardTitle>
                <CardDescription className="text-xs">
                  যে যে বইগুলোতে টিক চিহ্ন দেবেন সেগুলো হিরো সেকশনের পরেই বিশেষ আকর্ষণে প্রাধান্য পাবে
                </CardDescription>
              </div>
              <div className="text-xs text-muted-foreground">
                মোট বই: {items.length}টি
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto p-1">
              {items.map((item) => {
                const meta = getBookMetadata(item.id, item.title);
                const isSelected = featuredBookIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleBookSelection(item.id)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center gap-2.5 transition-colors select-none ${
                      isSelected
                        ? 'border-primary bg-primary/5 font-bold text-primary'
                        : 'border-border bg-card text-stone-700 hover:bg-muted/50'
                    }`}
                  >
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleBookSelection(item.id)}
                      />
                    </div>
                    <div className="truncate flex-1">
                      <span className="block truncate">{meta.bengaliTitle}</span>
                      <span className="text-[10px] text-muted-foreground font-normal block">
                        {meta.author} • ৳ {item.sellingPrice}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6 py-2.5 text-xs font-bold shadow-md flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>সংরক্ষণ হচ্ছে...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>পরিবর্তন সংরক্ষণ করুন (Save Settings)</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
