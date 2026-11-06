'use server';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  increment,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { STORE_CONFIG } from '../store-config';
import type { AnalyticsDailySummary, VisitorEventPayload } from '../types';

function getTodayString(): string {
  // Asia/Dhaka time zone
  const now = new Date();
  const dhakaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  const yyyy = dhakaTime.getFullYear();
  const mm = String(dhakaTime.getMonth() + 1).padStart(2, '0');
  const dd = String(dhakaTime.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Records an analytics event by incrementing aggregated daily counters in Firestore.
 * Extremely cost-effective: only 1 document write per call (or batch), avoiding bloat.
 */
export async function trackVisitorEvent(payload: VisitorEventPayload): Promise<void> {
  if (!db) return;
  const ownerUid = STORE_CONFIG.ownerUid;
  const todayStr = getTodayString();

  try {
    const dailyDocRef = doc(db, 'users', ownerUid, 'analytics_daily', todayStr);
    const docSnap = await getDoc(dailyDocRef);

    const hourStr = String(new Date().getHours()).padStart(2, '0');

    if (!docSnap.exists()) {
      // Create new daily summary document
      const initialData: Record<string, any> = {
        date: todayStr,
        createdAt: Timestamp.now(),
        totalVisitors: payload.isNewVisitor ? 1 : 0,
        totalPageViews: payload.eventType === 'page_view' ? 1 : 0,
        totalBookViews: payload.eventType === 'book_view' || payload.eventType === 'book_click' ? 1 : 0,
        totalAddToCart: payload.eventType === 'add_to_cart' ? 1 : 0,
        totalOrders: payload.eventType === 'purchase' ? 1 : 0,
        totalOrderValue: payload.orderValue || 0,
        bookClicks: payload.bookId ? { [payload.bookId]: 1 } : {},
        packageClicks: payload.packageName ? { [payload.packageName]: 1 } : {},
        hourlyVisitors: { [hourStr]: 1 },
        devices: {
          mobile: payload.isMobile ? 1 : 0,
          desktop: payload.isMobile ? 0 : 1,
        },
      };
      await setDoc(dailyDocRef, initialData);
    } else {
      // Increment existing document fields atomically
      const updates: Record<string, any> = {};

      if (payload.isNewVisitor) {
        updates.totalVisitors = increment(1);
      }
      if (payload.eventType === 'page_view') {
        updates.totalPageViews = increment(1);
      }
      if (payload.eventType === 'book_view' || payload.eventType === 'book_click') {
        updates.totalBookViews = increment(1);
      }
      if (payload.eventType === 'add_to_cart') {
        updates.totalAddToCart = increment(1);
      }
      if (payload.eventType === 'purchase') {
        updates.totalOrders = increment(1);
        if (payload.orderValue) {
          updates.totalOrderValue = increment(payload.orderValue);
        }
      }
      if (payload.bookId) {
        updates[`bookClicks.${payload.bookId}`] = increment(1);
      }
      if (payload.packageName) {
        updates[`packageClicks.${payload.packageName}`] = increment(1);
      }
      updates[`hourlyVisitors.${hourStr}`] = increment(1);
      if (payload.isMobile) {
        updates['devices.mobile'] = increment(1);
      } else {
        updates['devices.desktop'] = increment(1);
      }

      await updateDoc(dailyDocRef, updates);
    }
  } catch (err) {
    // Analytics failure should never break the visitor experience
    console.error('Analytics tracking error:', err);
  }
}

/**
 * Retrieves daily analytics summaries for the admin analytics dashboard
 */
export async function getAnalyticsSummaries(userId: string, daysLimit = 30): Promise<AnalyticsDailySummary[]> {
  if (!db || !userId) return [];
  try {
    const analyticsCollection = collection(db, 'users', userId, 'analytics_daily');
    const q = query(analyticsCollection, orderBy('date', 'desc'), limit(daysLimit));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        date: data.date || d.id,
        totalVisitors: data.totalVisitors || 0,
        totalPageViews: data.totalPageViews || 0,
        totalBookViews: data.totalBookViews || 0,
        totalAddToCart: data.totalAddToCart || 0,
        totalOrders: data.totalOrders || 0,
        totalOrderValue: data.totalOrderValue || 0,
        bookClicks: data.bookClicks || {},
        packageClicks: data.packageClicks || {},
        hourlyVisitors: data.hourlyVisitors || {},
        devices: data.devices || { mobile: 0, desktop: 0 },
      };
    });
  } catch (err) {
    console.error('Failed to get analytics summaries:', err);
    return [];
  }
}
