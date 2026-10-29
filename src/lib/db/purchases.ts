
'use server';

import {
  Timestamp,
  type CollectionReference,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Transaction,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  startAfter,
  where
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '../firebase';
import type { Item, Metadata, Purchase } from '../types';
import { docToPurchase } from './utils';

// --- Shared purchase helpers ---

const normalizeTitle = (value: unknown) =>
    String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Classifies a Payable-type transaction against a purchase. Purchases open
 * payables as "Purchase PUR-x from ..." (Due) or "Balance for Purchase
 * PUR-x from ..." (Split); payments against them (payPayable) log
 * "Payment for: <original>" traces. Descriptions that match none of these
 * (e.g. customer refund logs) are not purchase-related.
 */
function classifyPurchasePayable(description: string): { purchaseId: string; isTrace: boolean } | null {
    // Purchase numbers are "PUR-" + digits; asset purchases (PUR-A-...) never
    // open payables, so they are excluded from the pattern outright.
    const match = description.match(/^(?:Payment for: )?(?:Balance for )?Purchase (PUR-\d+)/);
    if (!match) return null;
    return { purchaseId: match[1], isTrace: description.startsWith('Payment for: ') };
}

export type PurchaseSettlementSummary = { dueAmount: number; hasSettlement: boolean };

/**
 * Live settlement state per purchase, keyed by purchaseId.
 *
 * dueAmount is the current outstanding balance read straight off the pending
 * payable documents — the same documents the payables page lists — so it
 * always agrees with them regardless of how many partial payments happened.
 *
 * hasSettlement is true once any money has moved against the payable (a
 * settlement trace, a Paid-status payable) or the pending balance no longer
 * matches what the purchase opened with (payments outside the normal flow).
 * That permanently locks the purchase from editing; updatePurchase enforces
 * the same predicate server-side.
 */
export async function getPurchaseSettlementSummaries(userId: string): Promise<Record<string, PurchaseSettlementSummary>> {
    if (!db || !userId) return {};
    const userRef = doc(db, 'users', userId);
    const transactionsCollection = collection(userRef, 'transactions');
    const purchasesCollection = collection(userRef, 'purchases');

    const [payablesSnapshot, purchasesSnapshot] = await Promise.all([
        getDocs(query(transactionsCollection, where('type', '==', 'Payable'))),
        getDocs(purchasesCollection),
    ]);

    const summaries: Record<string, PurchaseSettlementSummary> = {};
    for (const d of payablesSnapshot.docs) {
        const classified = classifyPurchasePayable(String(d.data().description || ''));
        if (!classified) continue;
        const entry = summaries[classified.purchaseId]
            || (summaries[classified.purchaseId] = { dueAmount: 0, hasSettlement: false });
        if (classified.isTrace || d.data().status === 'Paid') {
            entry.hasSettlement = true;
        } else {
            entry.dueAmount += Number(d.data().amount) || 0;
        }
    }

    // Lock the edit when a pending payable no longer matches the balance the
    // purchase opened with. Both sides use the exact arithmetic addPurchase
    // used to create the payable, so they are bit-identical until something
    // outside the normal flow changed the payable.
    purchasesSnapshot.docs.forEach(pd => {
        const data = pd.data();
        const entry = summaries[String(data.purchaseId || '')];
        if (!entry || entry.hasSettlement) return;
        const expectedBalance = (Number(data.totalAmount) || 0)
            - (Number(data.discountAmount) || 0)
            - (data.paymentMethod === 'Split' ? (Number(data.amountPaid) || 0) : 0);
        if (Math.abs(entry.dueAmount - expectedBalance) > 0.005) {
            entry.hasSettlement = true;
        }
    });

    return summaries;
}

/**
 * Resolves every purchase row against the catalog (matching categoryId +
 * normalized title, creating the item when missing) and applies the stock
 * increase with a weighted-average production price. Returns the rows with
 * their linked itemId attached.
 *
 * Item docs are re-read through the transaction after resolution so that
 * writes made earlier in the same transaction (e.g. reversing the previous
 * version of a purchase, or a second row feeding the same item) are visible.
 */
async function resolveAndApplyPurchaseItems(
    transaction: Transaction,
    itemsCollection: CollectionReference<DocumentData>,
    items: { itemId?: string; itemName: string; categoryId: string; categoryName: string; author?: string; quantity: number; cost: number; sellingPrice?: number }[],
    purchaseDate: Date,
) {
    const itemsWithLinks: typeof items = [];
    for (const item of items) {
        const categorySnapshot = await getDocs(
            query(itemsCollection, where('categoryId', '==', item.categoryId))
        );
        const existingDoc = categorySnapshot.docs.find(
            d => normalizeTitle(d.data().title) === normalizeTitle(item.itemName)
        );

        let linkedItemId: string;
        if (existingDoc) {
            linkedItemId = existingDoc.id;
            const freshDoc = await transaction.get(existingDoc.ref);
            const bookData = freshDoc.exists() ? freshDoc.data() : existingDoc.data();
            const currentStock = Number(bookData.stock) || 0;
            const currentTotalValue = currentStock * (Number(bookData.productionPrice) || 0);
            const newTotalValue = Number(item.cost) * Number(item.quantity);
            const newStock = currentStock + Number(item.quantity);
            const newProductionPrice = newStock > 0 ? (currentTotalValue + newTotalValue) / newStock : 0;

            // Optionally keep the higher selling price or recalculate standard markup
            const newSellingPrice = item.sellingPrice && item.sellingPrice > 0
                                    ? item.sellingPrice
                                    : Math.max(bookData.sellingPrice || 0, newProductionPrice * 1.5);

            const updateData: any = {
                stock: newStock,
                productionPrice: newProductionPrice,
                sellingPrice: newSellingPrice
            };
            if (item.author) updateData.author = item.author;

            transaction.update(existingDoc.ref, updateData);
        } else {
            const newItemRef = doc(itemsCollection);
            linkedItemId = newItemRef.id;
            const sellingPrice = item.sellingPrice && item.sellingPrice > 0 ? item.sellingPrice : item.cost * 1.5;

            const newItemData: Omit<Item, 'id'> = {
                title: item.itemName,
                categoryId: item.categoryId,
                categoryName: item.categoryName,
                author: item.author || 'Unknown',
                stock: item.quantity,
                productionPrice: item.cost,
                sellingPrice: sellingPrice,
                createdAt: Timestamp.fromDate(purchaseDate),
            };
            transaction.set(newItemRef, newItemData);
        }
        itemsWithLinks.push({ ...item, itemId: linkedItemId });
    }
    return itemsWithLinks;
}

/**
 * Syncs the payment artifacts a purchase implies: the expense record for the
 * paid portion and the pending payable for the due portion. When reusable
 * snapshots are supplied (edit path), existing documents are updated in
 * place so expense numbers and doc ids stay stable; a reusable document the
 * edited purchase no longer needs is deleted. Without snapshots (add path)
 * this purely creates, exactly like the original addPurchase behavior.
 * Returns the lastExpenseNumber to persist, or null when unchanged.
 */
function writePurchasePaymentArtifacts(
    transaction: Transaction,
    opts: {
        expensesCollection: CollectionReference<DocumentData>;
        transactionsCollection: CollectionReference<DocumentData>;
        purchaseId: string;
        supplier: string;
        finalAmount: number;
        paymentMethod: string;
        amountPaid?: number;
        splitPaymentMethod?: string;
        purchaseDate: Date;
        dueDate: Date;
        startExpenseNumber: number;
        reusableExpenseSnap?: QueryDocumentSnapshot<DocumentData>;
        reusablePayableSnap?: QueryDocumentSnapshot<DocumentData>;
    },
): number | null {
    const { expensesCollection, transactionsCollection, purchaseId, supplier, finalAmount } = opts;
    let lastExpenseNumber = opts.startExpenseNumber;
    let expenseReused = false;
    let payableReused = false;

    const writePaidExpense = (description: string, amount: number, paymentMethod: string) => {
        const reuseData = opts.reusableExpenseSnap ? opts.reusableExpenseSnap.data() : undefined;
        if (opts.reusableExpenseSnap && reuseData?.expenseId) {
            expenseReused = true;
            transaction.update(opts.reusableExpenseSnap.ref, {
                expenseId: String(reuseData.expenseId),
                description,
                amount,
                date: Timestamp.fromDate(opts.purchaseDate),
                paymentMethod,
            });
        } else {
            lastExpenseNumber += 1;
            const expenseId = `EXP-${String(lastExpenseNumber).padStart(4, '0')}`;
            transaction.set(doc(expensesCollection), {
                expenseId,
                description,
                amount,
                date: Timestamp.fromDate(opts.purchaseDate),
                paymentMethod,
            });
        }
    };

    const writePayable = (description: string, amount: number) => {
        const data = {
            description,
            amount,
            dueDate: Timestamp.fromDate(opts.dueDate),
            status: 'Pending' as const,
            type: 'Payable' as const,
        };
        if (opts.reusablePayableSnap) {
            payableReused = true;
            transaction.update(opts.reusablePayableSnap.ref, data);
        } else {
            transaction.set(doc(transactionsCollection), data);
        }
    };

    if (finalAmount > 0) {
        if (opts.paymentMethod === 'Cash' || opts.paymentMethod === 'Bank') {
            writePaidExpense(`Payment for Purchase ${purchaseId}`, finalAmount, opts.paymentMethod);
        } else if (opts.paymentMethod === 'Split') {
            const amountPaid = opts.amountPaid || 0;
            const payableAmount = finalAmount - amountPaid;

            if (amountPaid > 0) {
                writePaidExpense(`Partial payment for Purchase ${purchaseId}`, amountPaid, opts.splitPaymentMethod || 'Cash');
            }
            if (payableAmount > 0) {
                writePayable(`Balance for Purchase ${purchaseId} from ${supplier}`, payableAmount);
            }
        } else if (opts.paymentMethod === 'Due') {
            writePayable(`Purchase ${purchaseId} from ${supplier}`, finalAmount);
        }
    }

    // A payment artifact the edited purchase no longer has simply stops existing.
    if (opts.reusableExpenseSnap && !expenseReused) transaction.delete(opts.reusableExpenseSnap.ref);
    if (opts.reusablePayableSnap && !payableReused) transaction.delete(opts.reusablePayableSnap.ref);

    return lastExpenseNumber > opts.startExpenseNumber ? lastExpenseNumber : null;
}

// --- Purchases Actions ---
export async function getPurchases(userId: string): Promise<Purchase[]> {
    if (!db || !userId) return [];
    const purchasesCollection = collection(db, 'users', userId, 'purchases');
    const snapshot = await getDocs(query(purchasesCollection, orderBy('date', 'desc')));
    return snapshot.docs.map(docToPurchase);
}

export async function getPurchasesPaginated({ userId, pageLimit = 5, lastVisibleId }: { userId: string, pageLimit?: number, lastVisibleId?: string }): Promise<{ purchases: Purchase[], hasMore: boolean }> {
  if (!db || !userId) return { purchases: [], hasMore: false };

  const purchasesCollection = collection(db, 'users', userId, 'purchases');
  let q = query(
      purchasesCollection,
      orderBy('date', 'desc'),
      limit(pageLimit)
  );

  if (lastVisibleId) {
      const lastVisibleDoc = await getDoc(doc(purchasesCollection, lastVisibleId));
      if (lastVisibleDoc.exists()) {
          q = query(q, startAfter(lastVisibleDoc));
      }
  }

  const snapshot = await getDocs(q);
  const purchases = snapshot.docs.map(docToPurchase);
  
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if(lastDoc) {
    const nextQuery = query(purchasesCollection, orderBy('date', 'desc'), startAfter(lastDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { purchases, hasMore };
}

export async function addPurchase(userId: string, data: Omit<Purchase, 'id' | 'date' | 'totalAmount' | 'purchaseId'> & { dueDate: string; date?: string }): Promise<{ success: boolean; error?: string; purchase?: Purchase }> {
  if (!db || !userId) return { success: false, error: 'Database not connected' };

  try {
      const result = await runTransaction(db, async (transaction) => {
          const userRef = doc(db!, 'users', userId);
          const metadataRef = doc(userRef, 'metadata', 'counters');
          const purchasesCollection = collection(userRef, 'purchases');
          const itemsCollection = collection(userRef, 'items');
          const expensesCollection = collection(userRef, 'expenses');
          const transactionsCollection = collection(userRef, 'transactions');

          const purchaseDate = data.date ? new Date(data.date) : new Date();
          if (Number.isNaN(purchaseDate.getTime())) throw new Error('Invalid purchase date.');

          const metadataDoc = await transaction.get(metadataRef);
          let lastPurchaseNumber = 0;
          if (metadataDoc.exists()) {
              lastPurchaseNumber = (metadataDoc.data() as Metadata).lastPurchaseNumber || 0;
          }
          const newPurchaseNumber = lastPurchaseNumber + 1;
          const purchaseId = `PUR-${String(newPurchaseNumber).padStart(4, '0')}`;

          let totalAmount = 0;
          for (const item of data.items) {
              totalAmount += item.cost * item.quantity;
          }
          const discountAmount = data.discountAmount || 0;

          // Resolve every row against the catalog so the purchase remembers which
          // item it fed; rows without a match create a new item.
          const itemsWithLinks = await resolveAndApplyPurchaseItems(transaction, itemsCollection, data.items, purchaseDate);

          const newPurchaseRef = doc(purchasesCollection);
          const purchaseData = {
              ...data,
              items: itemsWithLinks,
              purchaseId,
              date: Timestamp.fromDate(purchaseDate),
              dueDate: Timestamp.fromDate(new Date(data.dueDate)),
              totalAmount: totalAmount,
              discountAmount: discountAmount,
          };
          transaction.set(newPurchaseRef, purchaseData);
          transaction.set(metadataRef, { lastPurchaseNumber: newPurchaseNumber }, { merge: true });

          const finalAmount = totalAmount - discountAmount;
          const newExpenseNumber = writePurchasePaymentArtifacts(transaction, {
              expensesCollection,
              transactionsCollection,
              purchaseId,
              supplier: data.supplier,
              finalAmount,
              paymentMethod: data.paymentMethod,
              amountPaid: data.amountPaid,
              splitPaymentMethod: data.splitPaymentMethod,
              purchaseDate,
              dueDate: new Date(data.dueDate),
              startExpenseNumber: (metadataDoc.data() as Metadata)?.lastExpenseNumber || 0,
          });

          if (newExpenseNumber !== null) {
              transaction.set(metadataRef, { lastExpenseNumber: newExpenseNumber }, { merge: true });
          }

          return { success: true, purchase: { id: newPurchaseRef.id, ...purchaseData, date: purchaseDate.toISOString(), dueDate: data.dueDate } };
      });

      revalidatePath('/purchases');
      revalidatePath('/items');
      revalidatePath('/payables');
      revalidatePath('/expenses');
      revalidatePath('/dashboard');
      return result;
  } catch (e) {
      console.error("Purchase creation failed: ", e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Edits an existing purchase in one transaction by fully reversing the old
 * purchase's effects (stock, weighted-average cost, linked expenses and
 * pending payables) and re-applying them from the submitted form values.
 * The purchase keeps its document id and PUR-xxxx number.
 */
export async function updatePurchase(
  userId: string,
  purchaseDocId: string,
  data: Omit<Purchase, 'id' | 'date' | 'totalAmount' | 'purchaseId'> & { dueDate: string; date?: string }
): Promise<{ success: boolean; error?: string; purchase?: Purchase }> {
  if (!db || !userId) return { success: false, error: 'Database not connected' };

  try {
      const result = await runTransaction(db, async (transaction) => {
          const userRef = doc(db!, 'users', userId);
          const metadataRef = doc(userRef, 'metadata', 'counters');
          const purchasesCollection = collection(userRef, 'purchases');
          const itemsCollection = collection(userRef, 'items');
          const expensesCollection = collection(userRef, 'expenses');
          const transactionsCollection = collection(userRef, 'transactions');

          const purchaseRef = doc(purchasesCollection, purchaseDocId);
          const purchaseDoc = await transaction.get(purchaseRef);
          if (!purchaseDoc.exists()) throw new Error('Purchase not found.');
          const existing = purchaseDoc.data() as Omit<Purchase, 'date' | 'dueDate'> & { date: Timestamp; dueDate: Timestamp };
          const purchaseId = existing.purchaseId;

          if (purchaseId.startsWith('PUR-A-') || existing.supplier === 'Asset Purchase' || existing.supplier === 'Existing Asset') {
              throw new Error('Asset purchases cannot be edited from the purchases list.');
          }

          const purchaseDate = data.date ? new Date(data.date) : new Date();
          if (Number.isNaN(purchaseDate.getTime())) throw new Error('Invalid purchase date.');
          const dueDate = new Date(data.dueDate);
          if (Number.isNaN(dueDate.getTime())) throw new Error('Invalid due date.');

          const metadataDoc = await transaction.get(metadataRef);

          // --- READ PHASE: locate every artifact this purchase created ---

          // Payables this purchase opened. payPayable either reduces the amount
          // of a Pending payable or flips it to Paid (with isHiddenFromHistory)
          // and emits a "Payment for: ..." trace plus an expense. Any of those
          // settlement artifacts — or a pending balance that no longer matches
          // what the purchase opened with — means the books already reference
          // this payable, so the purchase can no longer be edited safely.
          // getPurchaseSettlementSummaries applies the same predicate to lock
          // the edit button client-side.
          const payablesSnapshot = await getDocs(query(transactionsCollection, where('type', '==', 'Payable')));
          const linkedPayables: QueryDocumentSnapshot<DocumentData>[] = [];
          let hasSettlement = false;
          payablesSnapshot.docs.forEach(d => {
              const classified = classifyPurchasePayable(String(d.data().description || ''));
              if (!classified || classified.purchaseId !== purchaseId) return;
              if (classified.isTrace || d.data().status === 'Paid') {
                  hasSettlement = true;
              } else {
                  linkedPayables.push(d);
              }
          });
          if (!hasSettlement && linkedPayables.length > 0) {
              const expectedBalance = existing.totalAmount - (existing.discountAmount || 0)
                  - (existing.paymentMethod === 'Split' ? (existing.amountPaid || 0) : 0);
              const pendingSum = linkedPayables.reduce((acc, d) => acc + (Number(d.data().amount) || 0), 0);
              if (Math.abs(pendingSum - expectedBalance) > 0.005) hasSettlement = true;
          }
          if (hasSettlement) {
              throw new Error('This purchase has a payable that was already fully or partially paid, so it can no longer be edited. Record a correcting purchase or expense instead.');
          }

          // Expenses this purchase wrote (matching the descriptions addPurchase uses).
          const [paidExpenses, partialExpenses] = await Promise.all([
              getDocs(query(expensesCollection, where('description', '==', `Payment for Purchase ${purchaseId}`))),
              getDocs(query(expensesCollection, where('description', '==', `Partial payment for Purchase ${purchaseId}`))),
          ]);

          // --- WRITE PHASE: reverse the old purchase ---

          // 1. Give the old stock back. The weighted-average cost basis cannot
          //    be perfectly reversed once other purchases/sales happened in
          //    between, so the old rows' contribution is removed at its own
          //    recorded cost and the price is only adjusted while it stays
          //    non-negative.
          for (const row of existing.items) {
              let itemSnap: any = null;
              if (row.itemId) {
                  itemSnap = await transaction.get(doc(itemsCollection, row.itemId));
              }
              if (!itemSnap || !itemSnap.exists()) {
                  const categorySnapshot = await getDocs(query(itemsCollection, where('categoryId', '==', row.categoryId)));
                  const match = categorySnapshot.docs.find(d => normalizeTitle(d.data().title) === normalizeTitle(row.itemName));
                  itemSnap = match || null;
              }
              if (!itemSnap) continue;

              const itemData = itemSnap.data();
              const currentStock = Number(itemData.stock) || 0;
              const currentPP = Number(itemData.productionPrice) || 0;
              const newStock = Math.max(0, currentStock - Number(row.quantity));
              let newPP = currentPP;
              if (newStock > 0) {
                  const reversedValue = currentStock * currentPP - Number(row.quantity) * Number(row.cost);
                  if (reversedValue > 0) newPP = reversedValue / newStock;
              }
              transaction.update(itemSnap.ref, { stock: newStock, productionPrice: newPP });
          }

          // 2. Hand the old payment artifacts to the re-apply step so they are
          //    updated in place (keeping their EXP numbers and doc ids) while
          //    the purchase still needs them, and deleted only when it no
          //    longer does. addPurchase never creates more than one payment
          //    expense / one payable per purchase, so anything beyond the
          //    first of each is defensive cleanup.
          const oldExpenseSnaps = [...paidExpenses.docs, ...partialExpenses.docs];
          const oldPayableSnaps = linkedPayables;
          oldExpenseSnaps.slice(1).forEach(d => transaction.delete(d.ref));
          oldPayableSnaps.slice(1).forEach(d => transaction.delete(d.ref));

          // --- Re-apply from the submitted values (same path as addPurchase) ---

          const itemsWithLinks = await resolveAndApplyPurchaseItems(transaction, itemsCollection, data.items, purchaseDate);

          let totalAmount = 0;
          for (const item of data.items) {
              totalAmount += item.cost * item.quantity;
          }
          const discountAmount = data.discountAmount || 0;

          const purchaseData: Record<string, unknown> = {
              supplier: data.supplier,
              items: itemsWithLinks,
              date: Timestamp.fromDate(purchaseDate),
              dueDate: Timestamp.fromDate(dueDate),
              totalAmount,
              discountAmount,
              paymentMethod: data.paymentMethod,
              amountPaid: data.amountPaid || 0,
          };
          if (data.splitPaymentMethod) purchaseData.splitPaymentMethod = data.splitPaymentMethod;
          transaction.update(purchaseRef, purchaseData);

          const newExpenseNumber = writePurchasePaymentArtifacts(transaction, {
              expensesCollection,
              transactionsCollection,
              purchaseId,
              supplier: data.supplier,
              finalAmount: totalAmount - discountAmount,
              paymentMethod: data.paymentMethod,
              amountPaid: data.amountPaid,
              splitPaymentMethod: data.splitPaymentMethod,
              purchaseDate,
              dueDate,
              startExpenseNumber: (metadataDoc.data() as Metadata)?.lastExpenseNumber || 0,
              reusableExpenseSnap: oldExpenseSnaps[0],
              reusablePayableSnap: oldPayableSnaps[0],
          });
          if (newExpenseNumber !== null) {
              transaction.set(metadataRef, { lastExpenseNumber: newExpenseNumber }, { merge: true });
          }

          return {
              success: true,
              purchase: {
                  id: purchaseDocId,
                  ...purchaseData,
                  purchaseId,
                  date: purchaseDate.toISOString(),
                  dueDate: dueDate.toISOString(),
              } as unknown as Purchase,
          };
      });

      revalidatePath('/purchases');
      revalidatePath('/items');
      revalidatePath('/payables');
      revalidatePath('/expenses');
      revalidatePath('/dashboard');
      return result;
  } catch (e) {
      console.error('Purchase update failed: ', e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function addOfficeAsset(
    userId: string,
    data: {
      itemName: string;
      quantity: number;
      cost: number;
      paymentMethod: 'Cash' | 'Bank';
      date: Date;
    }
  ) {
    if (!db || !userId) return { success: false, error: 'Database not connected' };
  
    try {
      const result = await runTransaction(db, async (transaction) => {
        const userRef = doc(db!, 'users', userId);
        const metadataRef = doc(userRef, 'metadata', 'counters');
        const purchasesCollection = collection(userRef, 'purchases');
        const expensesCollection = collection(userRef, 'expenses');
  
        const metadataDoc = await transaction.get(metadataRef);
        let lastPurchaseNumber = (metadataDoc.data() as Metadata)?.lastPurchaseNumber || 0;
        const newPurchaseNumber = lastPurchaseNumber + 1;
        const purchaseId = `PUR-A-${String(newPurchaseNumber).padStart(4, '0')}`;
  
        const totalAmount = data.cost * data.quantity;
  
        const newPurchaseRef = doc(purchasesCollection);
        const purchaseData = {
          purchaseId,
          supplier: 'Asset Purchase',
          date: Timestamp.fromDate(data.date),
          dueDate: Timestamp.fromDate(data.date),
          items: [
            {
              itemName: data.itemName,
              categoryId: 'OFFICE_ASSET',
              categoryName: 'Office Asset',
              quantity: data.quantity,
              cost: data.cost,
            },
          ],
          totalAmount: totalAmount,
          paymentMethod: data.paymentMethod,
        };
        transaction.set(newPurchaseRef, purchaseData);
        transaction.set(metadataRef, { lastPurchaseNumber: newPurchaseNumber }, { merge: true });
  
        // Get expense counter for generating expense ID
        let lastExpenseNumber = (metadataDoc.data() as Metadata)?.lastExpenseNumber || 0;
        lastExpenseNumber += 1;
        const expenseId = `EXP-${String(lastExpenseNumber).padStart(4, '0')}`;
        
        const expenseData = {
          expenseId,
          description: `Asset Purchase: ${data.itemName}`,
          amount: totalAmount,
          date: Timestamp.fromDate(data.date),
          paymentMethod: data.paymentMethod,
        };
        transaction.set(doc(expensesCollection), expenseData);
        transaction.set(metadataRef, { lastExpenseNumber }, { merge: true });
  
        return { success: true };
      });
  
      revalidatePath('/purchases');
      revalidatePath('/expenses');
      return result;
    } catch (e) {
      console.error("Office asset creation failed: ", e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
}

export async function addExistingAsset(
    userId: string,
    data: {
      itemName: string;
      quantity: number;
      value: number;
    }
  ): Promise<{ success: true } | { success: false; error: string }> {
    if (!db || !userId) return { success: false, error: 'Database not connected' };
  
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db!, 'users', userId);
        const metadataRef = doc(userRef, 'metadata', 'counters');
        const purchasesCollection = collection(userRef, 'purchases');
        const capitalCollection = collection(userRef, 'capital');
        
        const date = new Date();
  
        const metadataDoc = await transaction.get(metadataRef);
        let lastPurchaseNumber = (metadataDoc.data() as Metadata)?.lastPurchaseNumber || 0;
        const newPurchaseNumber = lastPurchaseNumber + 1;
        const purchaseId = `PUR-A-${String(newPurchaseNumber).padStart(4, '0')}`;
  
        const totalValue = data.value * data.quantity;
  
        const newPurchaseRef = doc(purchasesCollection);
        const purchaseData = {
          purchaseId,
          supplier: 'Existing Asset',
          date: Timestamp.fromDate(date),
          dueDate: Timestamp.fromDate(date),
          items: [
            {
              itemName: data.itemName,
              categoryId: 'OFFICE_ASSET',
              categoryName: 'Office Asset',
              quantity: data.quantity,
              cost: data.value,
            },
          ],
          totalAmount: totalValue,
          paymentMethod: 'N/A',
        };
        transaction.set(newPurchaseRef, purchaseData);
        transaction.set(metadataRef, { lastPurchaseNumber: newPurchaseNumber }, { merge: true });
        
        // Add to capital as owner's equity
        const capitalData = {
          source: 'Capital Adjustment',
          amount: totalValue,
          date: Timestamp.fromDate(date),
          paymentMethod: 'Asset', // Special type for non-cash/bank capital
          notes: `Existing asset added: ${data.quantity}x ${data.itemName}`,
        };
        transaction.set(doc(capitalCollection), capitalData);
      });
  
      revalidatePath('/items');
      return { success: true };
    } catch (e) {
      console.error("Existing asset creation failed: ", e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
}
