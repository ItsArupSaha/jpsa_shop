'use server';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '../firebase';
import type { PackageTemplate } from '../types';

function docToPackage(docSnap: any): PackageTemplate {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        name: data.name || '',
        description: data.description || '',
        items: data.items || [],
        createdAt: data.createdAt || new Date().toISOString(),
    };
}

export async function getPackages(userId: string): Promise<PackageTemplate[]> {
    if (!db || !userId) return [];
    try {
        const packagesCollection = collection(db, 'users', userId, 'packages');
        const q = query(packagesCollection, orderBy('name', 'asc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docToPackage);
    } catch (e) {
        console.error("Failed to get packages:", e);
        return [];
    }
}

export async function addPackage(userId: string, data: Omit<PackageTemplate, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string }> {
    if (!db || !userId) return { success: false, error: 'Database not connected' };
    
    try {
        const packagesCollection = collection(db, 'users', userId, 'packages');
        const packageData = {
            ...data,
            createdAt: new Date().toISOString(),
        };
        
        await addDoc(packagesCollection, packageData);
        revalidatePath('/packages');
        return { success: true };
    } catch (e) {
        console.error("Failed to add package:", e);
        return { success: false, error: e instanceof Error ? e.message : 'Unknown error occurred' };
    }
}

export async function updatePackage(userId: string, packageId: string, data: Partial<Omit<PackageTemplate, 'id' | 'createdAt'>>): Promise<{ success: boolean; error?: string }> {
    if (!db || !userId) return { success: false, error: 'Database not connected' };
    
    try {
        const packageRef = doc(db, 'users', userId, 'packages', packageId);
        await updateDoc(packageRef, data);
        revalidatePath('/packages');
        return { success: true };
    } catch (e) {
        console.error("Failed to update package:", e);
        return { success: false, error: e instanceof Error ? e.message : 'Unknown error occurred' };
    }
}

export async function deletePackage(userId: string, packageId: string): Promise<{ success: boolean; error?: string }> {
    if (!db || !userId) return { success: false, error: 'Database not connected' };
    
    try {
        const packageRef = doc(db, 'users', userId, 'packages', packageId);
        await deleteDoc(packageRef);
        revalidatePath('/packages');
        return { success: true };
    } catch (e) {
        console.error("Failed to delete package:", e);
        return { success: false, error: e instanceof Error ? e.message : 'Unknown error occurred' };
    }
}
