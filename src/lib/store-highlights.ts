'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { STORE_CONFIG } from './store-config';
import { DEFAULT_HIGHLIGHTS, type StoreHighlightsConfig } from './store-highlights-types';

export async function getStoreHighlights(userId = STORE_CONFIG.ownerUid): Promise<StoreHighlightsConfig> {
  if (!db || !userId) return DEFAULT_HIGHLIGHTS;
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'storefront');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_HIGHLIGHTS, ...snap.data() } as StoreHighlightsConfig;
    }
  } catch (e) {
    console.error('Failed to get storefront highlights:', e);
  }
  return DEFAULT_HIGHLIGHTS;
}

export async function updateStoreHighlights(
  userId: string,
  data: Partial<StoreHighlightsConfig>
): Promise<{ success: boolean; error?: string }> {
  if (!db || !userId) return { success: false, error: 'Database not connected' };
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'storefront');
    await setDoc(docRef, data, { merge: true });
    return { success: true };
  } catch (e) {
    console.error('Failed to update highlights:', e);
    return { success: false, error: (e as Error).message };
  }
}
