'use client';

import * as React from 'react';
import type { Item } from '@/lib/types';
import { getPublicAvailableStock } from '@/lib/store-config';

export type CartItem = {
  itemId: string;
  title: string;
  author?: string;
  price: number;
  quantity: number;
  maxAvailable: number;
  coverImageUrl?: string;
  isPackage?: boolean;
  packageName?: string;
  gifts?: string[];
};

type CartContextType = {
  items: CartItem[];
  addToCart: (item: Item, quantity?: number) => boolean;
  addPackageToCart: (pkg: { name: string; items: { itemId: string; quantity: number }[]; gifts?: string[] }, allItems: Item[]) => boolean;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
};

const CartContext = React.createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  // Load cart from localStorage on client mount
  React.useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('jpsa_cart');
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load cart from storage:', e);
    }
  }, []);

  // Save cart to localStorage
  React.useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('jpsa_cart', JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart to storage:', e);
    }
  }, [items, isMounted]);

  const addToCart = (item: Item, quantity = 1): boolean => {
    const available = getPublicAvailableStock(item.stock);
    if (available <= 0) return false;

    setItems((prev) => {
      const existing = prev.find((i) => i.itemId === item.id);
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, available);
        return prev.map((i) => (i.itemId === item.id ? { ...i, quantity: newQty, maxAvailable: available } : i));
      }
      return [
        ...prev,
        {
          itemId: item.id,
          title: item.title,
          author: item.author,
          price: item.sellingPrice,
          quantity: Math.min(quantity, available),
          maxAvailable: available,
          coverImageUrl: item.coverImageUrl,
        },
      ];
    });
    setIsCartOpen(true);
    return true;
  };

  const addPackageToCart = (
    pkg: { name: string; items: { itemId: string; quantity: number }[]; gifts?: string[] },
    allItems: Item[]
  ): boolean => {
    let addedCount = 0;
    setItems((prev) => {
      let updated = [...prev];
      for (const pItem of pkg.items) {
        const fullItem = allItems.find((i) => i.id === pItem.itemId);
        if (!fullItem) continue;
        const available = getPublicAvailableStock(fullItem.stock);
        if (available <= 0) continue;

        const existing = updated.find((i) => i.itemId === fullItem.id);
        const reqQty = pItem.quantity || 1;
        if (existing) {
          const newQty = Math.min(existing.quantity + reqQty, available);
          updated = updated.map((i) => (i.itemId === fullItem.id ? { ...i, quantity: newQty, maxAvailable: available } : i));
        } else {
          updated.push({
            itemId: fullItem.id,
            title: fullItem.title,
            author: fullItem.author,
            price: fullItem.sellingPrice,
            quantity: Math.min(reqQty, available),
            maxAvailable: available,
            isPackage: true,
            packageName: pkg.name,
            gifts: pkg.gifts,
          });
        }
        addedCount++;
      }
      return updated;
    });

    if (addedCount > 0) {
      setIsCartOpen(true);
      return true;
    }
    return false;
  };

  const removeFromCart = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.itemId === itemId) {
          const validQty = Math.min(quantity, i.maxAvailable);
          return { ...i, quantity: validQty };
        }
        return i;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const cartSubtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        addPackageToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartSubtotal,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
