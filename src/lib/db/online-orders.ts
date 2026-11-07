'use server';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  Timestamp,
  where,
  addDoc,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '../firebase';
import { STORE_CONFIG, getPublicAvailableStock } from '../store-config';
import type { Customer, Item, Metadata, OnlineOrderInput, Sale, SaleItem } from '../types';
import { trackVisitorEvent } from './analytics';
import { sendTelegramOrderAlert, type TelegramOrderItem } from '../telegram';
import { getBookMetadata } from '../book-catalog-data';

export async function placeOnlineOrder(
  data: OnlineOrderInput
): Promise<{ success: boolean; error?: string; saleId?: string; total?: number }> {
  if (!db) {
    return { success: false, error: 'ডাটাবেস কানেকশন পাওয়া যায়নি।' };
  }

  const userId = STORE_CONFIG.ownerUid;
  if (!data.items || data.items.length === 0) {
    return { success: false, error: 'কার্টে কোনো বই নেই।' };
  }
  if (!data.customerName?.trim() || !data.customerPhone?.trim() || !data.shippingAddress?.trim()) {
    return { success: false, error: 'অনুগ্রহ করে নাম, মোবাইল নম্বর এবং পূর্ণ ঠিকানা প্রদান করুন।' };
  }

  try {
    const userRef = doc(db, 'users', userId);
    const customersCollection = collection(userRef, 'customers');

    // 1. Look up existing customer by phone or create new
    let customerId = '';
    const phoneClean = data.customerPhone.trim();
    const customerQuery = query(customersCollection, where('phone', '==', phoneClean));
    const customerSnap = await getDocs(customerQuery);

    if (!customerSnap.empty) {
      customerId = customerSnap.docs[0].id;
    } else {
      const newCustomerRef = await addDoc(customersCollection, {
        name: data.customerName.trim(),
        phone: phoneClean,
        address: `${data.shippingAddress.trim()}${data.district ? `, ${data.district}` : ''}`,
        openingBalance: 0,
        dueBalance: 0,
        createdAt: Timestamp.now(),
      });
      customerId = newCustomerRef.id;
    }

    // 2. Execute atomic transaction to check stock (with 5-preservation safety rule), decrement stock, and record sale
    const result = await runTransaction(db, async (transaction) => {
      const metadataRef = doc(userRef, 'metadata', 'counters');
      const itemsCollection = collection(userRef, 'items');
      const salesCollection = collection(userRef, 'sales');
      const transactionsCollection = collection(userRef, 'transactions');
      const customerRef = doc(customersCollection, customerId);

      const itemRefs = data.items.map((item) => doc(itemsCollection, item.itemId));

      const [metadataDoc, customerDoc, ...itemDocs] = await Promise.all([
        transaction.get(metadataRef),
        transaction.get(customerRef),
        ...itemRefs.map((ref) => transaction.get(ref)),
      ]);

      const lastSaleNumber = (metadataDoc.data() as Metadata)?.lastSaleNumber || 0;
      const newSaleNumber = lastSaleNumber + 1;
      const saleId = `SALE-${String(newSaleNumber).padStart(4, '0')}`;

      let calculatedSubtotal = 0;
      let totalProductionCost = 0;
      const itemsWithPrices: SaleItem[] = [];
      const notificationItems: TelegramOrderItem[] = [];

      for (let i = 0; i < data.items.length; i++) {
        const itemDoc = itemDocs[i];
        const orderItem = data.items[i];

        if (!itemDoc.exists()) {
          throw new Error(`বইটি খুঁজে পাওয়া যায়নি (ID: ${orderItem.itemId})`);
        }

        const itemData = itemDoc.data() as Item;
        const currentStock = Number(itemData.stock) || 0;
        const availableStock = getPublicAvailableStock(currentStock);

        if (availableStock < Number(orderItem.quantity)) {
          throw new Error(
            `"${itemData.title}" বইটির পর্যাপ্ত স্টক নেই। সংরক্ষিত ৫টি কপি বাদে কেবল ${availableStock}টি কপি অবশিষ্ট আছে।`
          );
        }

        const unitPrice = Number(itemData.sellingPrice) || 0;
        const unitCost = Number(itemData.productionPrice) || 0;
        calculatedSubtotal += unitPrice * Number(orderItem.quantity);
        totalProductionCost += unitCost * Number(orderItem.quantity);

        const bengaliTitle = getBookMetadata(orderItem.itemId, itemData.title).bengaliTitle || itemData.title;

        itemsWithPrices.push({
          itemId: orderItem.itemId,
          quantity: orderItem.quantity,
          price: unitPrice,
          cost: unitCost,
        });

        notificationItems.push({
          title: bengaliTitle,
          quantity: Number(orderItem.quantity),
          price: unitPrice,
        });

        // Decrement warehouse stock
        transaction.update(itemDoc.ref, {
          stock: currentStock - Number(orderItem.quantity),
        });
      }

      const deliveryCharge = Number(data.deliveryCharge) || 0;
      const grandTotal = calculatedSubtotal + deliveryCharge;
      const isCod = data.paymentMethod === 'Cash';
      const actualPaymentMethod = isCod ? 'Due' : 'Bank';
      const totalSaleProfit = calculatedSubtotal - totalProductionCost;

      // Prepare sale record
      const newSaleRef = doc(salesCollection);
      const saleData: any = {
        saleId,
        date: Timestamp.now(),
        customerId,
        items: itemsWithPrices,
        subtotal: calculatedSubtotal,
        discountType: 'none',
        discountValue: 0,
        total: grandTotal,
        paymentMethod: actualPaymentMethod,
        amountPaid: isCod ? 0 : grandTotal,
        orderSource: 'online',
        orderStatus: 'pending',
        customerName: data.customerName.trim(),
        customerPhone: phoneClean,
        shippingAddress: data.shippingAddress.trim(),
        deliveryCharge,
        deliveryMethod: isCod ? 'Cash on Delivery' : 'Prepaid (Bank)',
        transactionId: data.transactionId?.trim() || '',
        orderNote: data.orderNote?.trim() || '',
        packageName: data.packageName || '',
        gifts: data.gifts || [],
        productionCost: totalProductionCost,
        createdAt: Timestamp.now(),
      };

      transaction.set(newSaleRef, saleData);

      // If Cash on Delivery, record an open receivable and update customer's due balance
      if (isCod) {
        const currentDue = Number(customerDoc.data()?.dueBalance) || 0;
        transaction.update(customerRef, { dueBalance: currentDue + grandTotal });

        const receivableRef = doc(transactionsCollection);
        transaction.set(receivableRef, {
          description: `Due from online order ${saleId} (${data.customerName.trim()})`,
          amount: grandTotal,
          dueDate: Timestamp.now(),
          status: 'Pending' as const,
          type: 'Receivable' as const,
          customerId,
          saleId,
          totalSaleProfit,
          remainingProfit: totalSaleProfit,
          createdAt: Timestamp.now(),
        });
      }

      // Record transaction ledger entry
      const newTransRef = doc(transactionsCollection);
      transaction.set(newTransRef, {
        date: Timestamp.now(),
        type: 'sale',
        referenceId: newSaleRef.id,
        referenceNumber: saleId,
        customerId,
        amount: grandTotal,
        description: `অনলাইন অর্ডার: ${saleId} (${data.customerName.trim()})${isCod ? ' - Cash on Delivery' : ''}`,
        paymentMethod: actualPaymentMethod,
      });

      // Update counters
      transaction.set(metadataRef, { lastSaleNumber: newSaleNumber }, { merge: true });

      return {
        saleId,
        total: grandTotal,
        notificationItems,
      };
    });

    // Revalidate paths
    revalidatePath('/');
    revalidatePath('/management/sales');
    revalidatePath('/management/dashboard');
    revalidatePath('/management/items');
    revalidatePath('/management/receivables');
    revalidatePath('/management/customers');

    // Track purchase analytics event
    trackVisitorEvent({
      eventType: 'purchase',
      orderValue: result.total,
      packageName: data.packageName,
    }).catch(console.error);

    // Send instant Telegram notification to shop administrators (non-blocking)
    sendTelegramOrderAlert({
      saleId: result.saleId,
      customerName: data.customerName.trim(),
      customerPhone: phoneClean,
      shippingAddress: data.shippingAddress.trim(),
      district: data.district,
      items: result.notificationItems,
      total: result.total,
      paymentMethod: data.paymentMethod,
      transactionId: data.transactionId,
      orderNote: data.orderNote,
      packageName: data.packageName,
    }).catch((err) => console.error('Telegram order alert failed:', err));

    return {
      success: true,
      saleId: result.saleId,
      total: result.total,
    };
  } catch (error: any) {
    console.error('Online order placement failed:', error);
    return {
      success: false,
      error: error.message || 'অর্ডার সম্পন্ন করার সময় ত্রুটি হয়েছে। পুনরায় চেষ্টা করুন।',
    };
  }
}
