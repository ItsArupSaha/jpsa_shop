'use client';

import * as React from 'react';
import {
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Eye,
  Loader2,
  MousePointerClick,
  Percent,
  RefreshCw,
  ShoppingBag,
  Smartphone,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { getAnalyticsSummaries, getItems, getSales } from '@/lib/actions';
import type { AnalyticsDailySummary, Item, Sale } from '@/lib/types';
import { formatBengaliPrice, toBengaliNumber } from '@/lib/store-config';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [summaries, setSummaries] = React.useState<AnalyticsDailySummary[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [timeRange, setTimeRange] = React.useState<'7' | '30' | 'all'>('30');

  const loadData = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const days = timeRange === '7' ? 7 : timeRange === '30' ? 30 : 90;
      const [analyticsData, itemsData, salesData] = await Promise.all([
        getAnalyticsSummaries(user.uid, days),
        getItems(user.uid),
        getSales(user.uid),
      ]);
      setSummaries(analyticsData);
      setItems(itemsData);
      setSales(salesData);
    } catch (e) {
      console.error('Failed to load analytics data:', e);
    } finally {
      setLoading(false);
    }
  }, [user, timeRange]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate Metrics
  const metrics = React.useMemo(() => {
    let totalVisitors = 0;
    let totalPageViews = 0;
    let totalBookViews = 0;
    let totalAddToCart = 0;
    let totalOrders = 0;
    let totalOrderValue = 0;
    const bookClicksMap: Record<string, number> = {};
    const packageClicksMap: Record<string, number> = {};
    let mobileCount = 0;
    let desktopCount = 0;

    for (const s of summaries) {
      totalVisitors += s.totalVisitors || 0;
      totalPageViews += s.totalPageViews || 0;
      totalBookViews += s.totalBookViews || 0;
      totalAddToCart += s.totalAddToCart || 0;
      totalOrders += s.totalOrders || 0;
      totalOrderValue += s.totalOrderValue || 0;

      if (s.bookClicks) {
        for (const [bId, count] of Object.entries(s.bookClicks)) {
          bookClicksMap[bId] = (bookClicksMap[bId] || 0) + Number(count || 0);
        }
      }
      if (s.packageClicks) {
        for (const [pName, count] of Object.entries(s.packageClicks)) {
          packageClicksMap[pName] = (packageClicksMap[pName] || 0) + Number(count || 0);
        }
      }
      if (s.devices) {
        mobileCount += s.devices.mobile || 0;
        desktopCount += s.devices.desktop || 0;
      }
    }

    // Count online sales recorded in sales database
    const onlineSales = sales.filter((s) => s.orderSource === 'online');
    const onlineOrdersCount = onlineSales.length;
    const onlineSalesAmount = onlineSales.reduce((sum, s) => sum + (s.total || 0), 0);

    // Calculate individual book sales count from online sales
    const bookSalesMap: Record<string, number> = {};
    for (const sale of onlineSales) {
      for (const sItem of sale.items || []) {
        bookSalesMap[sItem.itemId] = (bookSalesMap[sItem.itemId] || 0) + Number(sItem.quantity || 1);
      }
    }

    const conversionRate = totalVisitors > 0
      ? ((onlineOrdersCount / totalVisitors) * 100).toFixed(1)
      : '0.0';

    return {
      totalVisitors,
      totalPageViews,
      totalBookViews,
      totalAddToCart,
      onlineOrdersCount,
      onlineSalesAmount,
      bookClicksMap,
      packageClicksMap,
      bookSalesMap,
      conversionRate,
      mobileCount,
      desktopCount,
    };
  }, [summaries, sales]);

  // Ranked Books by Views/Clicks
  const rankedBooks = React.useMemo(() => {
    return items.map((item) => {
      const views = metrics.bookClicksMap[item.id] || 0;
      const sold = metrics.bookSalesMap[item.id] || 0;
      const conv = views > 0 ? ((sold / views) * 100).toFixed(0) : '0';
      return {
        id: item.id,
        title: item.title,
        author: item.author,
        price: item.sellingPrice,
        views,
        sold,
        conv,
      };
    }).sort((a, b) => b.views - a.views || b.sold - a.sold);
  }, [items, metrics]);

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalDevices = metrics.mobileCount + metrics.desktopCount || 1;
  const mobilePercent = Math.round((metrics.mobileCount / totalDevices) * 100);

  return (
    <div className="space-y-6 font-bengali">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="font-headline text-2xl font-bold tracking-tight text-[#2C1810] flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span>ওয়েবসাইট ভিজিটর ও সেলস অ্যানালিটিক্স</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            ল্যান্ডিং পেজের ভিজিটরদের আচরণ, বইয়ের ক্লিক, কার্ট কনভার্সন ও বিক্রয় পরিসংখ্যান
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time range selector */}
          <div className="flex items-center bg-muted p-1 rounded-xl text-xs">
            <button
              onClick={() => setTimeRange('7')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                timeRange === '7' ? 'bg-background shadow-xs font-bold text-primary' : 'text-muted-foreground'
              }`}
            >
              বিগত ৭ দিন
            </button>
            <button
              onClick={() => setTimeRange('30')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                timeRange === '30' ? 'bg-background shadow-xs font-bold text-primary' : 'text-muted-foreground'
              }`}
            >
              বিগত ৩০ দিন
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                timeRange === 'all' ? 'bg-background shadow-xs font-bold text-primary' : 'text-muted-foreground'
              }`}
            >
              সব সময়
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={loadData} className="h-8">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            <span>রিফ্রেশ</span>
          </Button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total Visitors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">মোট ভিজিটর (Unique)</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{toBengaliNumber(metrics.totalVisitors)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              মোট পেজ ভিউ: {toBengaliNumber(metrics.totalPageViews)} বার
            </p>
          </CardContent>
        </Card>

        {/* Book Clicks / Views */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">বইয়ে ক্লিক ও আগ্রহ</CardTitle>
            <MousePointerClick className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{toBengaliNumber(metrics.totalBookViews)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              কার্টে যোগ হয়েছে: {toBengaliNumber(metrics.totalAddToCart)} বার
            </p>
          </CardContent>
        </Card>

        {/* Online Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">সফল অনলাইন অর্ডার</CardTitle>
            <ShoppingBag className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{toBengaliNumber(metrics.onlineOrdersCount)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              মোট মূল্য: {formatBengaliPrice(metrics.onlineSalesAmount)}
            </p>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">কনভার্সন রেট (%)</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{toBengaliNumber(metrics.conversionRate)}%</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              ভিজিটর থেকে অর্ডারে রূপান্তর
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visitor Journey Funnel & Device Breakdown */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Funnel Card */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-headline">গ্রাহক কনভার্সন ফানেল (Customer Journey)</CardTitle>
            <CardDescription className="text-xs">
              ওয়েবসাইটে প্রবেশের পর গ্রাহকরা কোন ধাপে কতজন অগ্রসর হচ্ছেন
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1: Visitors */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" /> ১. ওয়েবসাইটে আগমন (Landing Page)
                </span>
                <span className="font-bold">{toBengaliNumber(metrics.totalVisitors)} জন (১০০%)</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>

            {/* Step 2: Book Clicks */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> ২. বইয়ের বিবরণ বা ক্লিক
                </span>
                <span className="font-bold">
                  {toBengaliNumber(metrics.totalBookViews)} বার (
                  {metrics.totalVisitors > 0
                    ? toBengaliNumber(Math.min(100, Math.round((metrics.totalBookViews / metrics.totalVisitors) * 100)))
                    : 0}%)
                </span>
              </div>
              <Progress
                value={metrics.totalVisitors > 0 ? Math.min(100, (metrics.totalBookViews / metrics.totalVisitors) * 100) : 0}
                className="h-2"
              />
            </div>

            {/* Step 3: Add to Cart */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-orange-500" /> ৩. কার্টে বই যোগ করা হয়েছে
                </span>
                <span className="font-bold">
                  {toBengaliNumber(metrics.totalAddToCart)} বার (
                  {metrics.totalVisitors > 0
                    ? toBengaliNumber(Math.min(100, Math.round((metrics.totalAddToCart / metrics.totalVisitors) * 100)))
                    : 0}%)
                </span>
              </div>
              <Progress
                value={metrics.totalVisitors > 0 ? Math.min(100, (metrics.totalAddToCart / metrics.totalVisitors) * 100) : 0}
                className="h-2"
              />
            </div>

            {/* Step 4: Purchase */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" /> ৪. চূড়ান্ত অর্ডার সম্পন্ন (Purchase)
                </span>
                <span className="font-bold text-emerald-700">
                  {toBengaliNumber(metrics.onlineOrdersCount)} টি ({toBengaliNumber(metrics.conversionRate)}%)
                </span>
              </div>
              <Progress
                value={metrics.totalVisitors > 0 ? Math.min(100, Number(metrics.conversionRate) * 5) : 0}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Device & Behavior Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-headline">ডিভাইস ও ব্রাউজিং তথ্য</CardTitle>
            <CardDescription className="text-xs">ভিজিটররা কোন মাধ্যমে আসছেন</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/50 border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <Smartphone className="h-4 w-4 text-primary" /> মোবাইল ফোন
                </span>
                <span className="font-bold">{toBengaliNumber(mobilePercent)}%</span>
              </div>
              <Progress value={mobilePercent} className="h-2" />
            </div>

            <div className="p-4 rounded-xl bg-muted/50 border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <Users className="h-4 w-4 text-amber-700" /> কম্পিউটার / ডেস্কটপ
                </span>
                <span className="font-bold">{toBengaliNumber(100 - mobilePercent)}%</span>
              </div>
              <Progress value={100 - mobilePercent} className="h-2" />
            </div>

            <div className="text-[11px] text-muted-foreground p-3 rounded-xl bg-amber-50/60 border border-amber-200/50">
              💡 <strong>পরামর্শ:</strong> ভিজিটরদের সিংহভাগই মোবাইল ব্যবহারকারী। মোবাইলে চেকআউট সহজ রাখলে অর্ডারের সংখ্যা আরও বৃদ্ধি পাবে।
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Book Performance Table: Most Viewed vs. Most Sold */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-headline">বইভিত্তিক আগ্রহ ও বিক্রয় বিশ্লেষণ</CardTitle>
              <CardDescription className="text-xs">
                কোন বইয়ে বেশি ক্লিক পড়ছে এবং কোন বইটি বেশি বিক্রি হচ্ছে
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold">গ্রন্থের নাম</TableHead>
                  <TableHead className="text-right font-bold">মূল্য</TableHead>
                  <TableHead className="text-center font-bold">ক্লিক / ভিউ</TableHead>
                  <TableHead className="text-center font-bold">অনলাইন বিক্রয়</TableHead>
                  <TableHead className="text-right font-bold">কনভার্সন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankedBooks.slice(0, 15).map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs">{b.title}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {b.author && b.author !== 'Unknown' ? b.author : 'শ্রীল জয়পতাকা স্বামী সাহিত্য'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-xs">
                      {formatBengaliPrice(b.price)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono text-xs">
                        {toBengaliNumber(b.views)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={b.sold > 0 ? 'default' : 'secondary'}
                        className="font-mono text-xs"
                      >
                        {toBengaliNumber(b.sold)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {toBengaliNumber(b.conv)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
