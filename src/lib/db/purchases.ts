
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

export type PurchaseSettlementSummary = {
    dueAmount: number;
    hasSettlement: boolean;
    /** Paid at purchase time per the purchase record (Split: amountPaid; Cash/Bank: net; Due: 0). */
    initialPaidAmount: number;
    /** Paid afterwards against the payable (sum of settlement traces). */
    laterPaidAmount: number;
};

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
 * updatePurchase enforces the same predicate and then restricts the edit to
 * non-payment fields: the recorded payments stay untouched and only the
 * outstanding balance is recalculated.
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
            || (summaries[classified.purchaseId] = { dueAmount: 0, hasSettlement: false, initialPaidAmount: 0, laterPaidAmount: 0 });
        if (classified.isTrace) {
            entry.hasSettlement = true;
            entry.laterPaidAmount += Number(d.data().amount) || 0;
        } else if (d.data().status === 'Paid') {
            entry.hasSettlement = true;
        } else {
            entry.dueAmount += Number(d.data().amount) || 0;
        }
    }

    // Flag the edit as restricted when a pending payable no longer matches the
    // balance the purchase opened with, and record what the purchase itself
    // says was paid up front. Both sides use the exact arithmetic addPurchase
    // used to create the payable, so they are bit-identical until something
    // outside the normal flow changed the payable.
    purchasesSnapshot.docs.forEach(pd => {
        const data = pd.data();
        const purchaseId = String(data.purchaseId || '');
        const entry = summaries[purchaseId];
        const net = (Number(data.totalAmount) || 0) - (Number(data.discountAmount) || 0);
        const initialPaid = data.paymentMethod === 'Split'
            ? (Number(data.amountPaid) || 0)
            : (data.paymentMethod === 'Due' ? 0 : net);
        if (!entry) return;
        entry.initialPaidAmount = initialPaid;
        if (entry.hasSettlement) return;
        const expectedBalance = net - initialPaid;
        if (Math.abs(entry.dueAmount - expectedBalance) > 0.005) {
            entry.hasSettlement = true;
        }
    });

    return summaries;
}

/**
 * Resolves the item documents a purchase touches using non-transactional
 * reads (committed state). Firestore transactions forbid any read after the
 * first write, so every read for a purchase flow happens up front and the
 * net stock/cost effect per item document is computed from a single
 * committed snapshot, then applied with one update per document.
 */
type PurchaseRowPlan = {
    row: { itemId?: string; itemName: string; categoryId: string; categoryName: string; author?: string; quantity: number; cost: number; sellingPrice?: number };
    itemId: string | null;
    newItemRef?: ReturnType<typeof doc>;
};

type PurchaseItemEffect = {
    ref: ReturnType<typeof doc>;
    committed: DocumentData;
    reverseQty: number;
    reverseCost: number;
    applyRows: { quantity: number; cost: number; sellingPrice?: number; author?: string }[];
};

async function planPurchaseItemEffects(
    itemsCollection: CollectionReference<DocumentData>,
    oldRows: { itemId?: string; itemName: string; categoryId: string; quantity: number; cost: number }[],
    newRows: PurchaseRowPlan['row'][],
): Promise<{ effects: Map<string, PurchaseItemEffect>; links: PurchaseRowPlan[] }> {
    const effects = new Map<string, PurchaseItemEffect>();
    const effectFor = (snap: { id: string; ref: ReturnType<typeof doc>; data: () => DocumentData }): PurchaseItemEffect => {
        let e = effects.get(snap.id);
        if (!e) {
            e = { ref: snap.ref, committed: snap.data(), reverseQty: 0, reverseCost: 0, applyRows: [] };
            effects.set(snap.id, e);
        }
        return e;
    };
    const findByTitle = async (categoryId: string, title: string) => {
        const catSnap = await getDocs(query(itemsCollection, where('categoryId', '==', categoryId)));
        return catSnap.docs.find(d => normalizeTitle(d.data().title) === normalizeTitle(title)) || null;
    };

    for (const row of oldRows) {
        let snap: { id: string; ref: ReturnType<typeof doc>; data: () => DocumentData } | null = null;
        if (row.itemId) {
            const d = await getDoc(doc(itemsCollection, row.itemId));
            if (d.exists()) snap = d;
        }
        if (!snap) snap = await findByTitle(row.categoryId, row.itemName);
        if (!snap) continue;
        const e = effectFor(snap);
        e.reverseQty += Number(row.quantity) || 0;
        e.reverseCost += (Number(row.quantity) || 0) * (Number(row.cost) || 0);
    }

    const links: PurchaseRowPlan[] = [];
    for (const row of newRows) {
        const snap = await findByTitle(row.categoryId, row.itemName);
        if (snap) {
            effectFor(snap).applyRows.push({ quantity: row.quantity, cost: row.cost, sellingPrice: row.sellingPrice, author: row.author });
            links.push({ row, itemId: snap.id });
        } else {
            links.push({ row, itemId: null, newItemRef: doc(itemsCollection) });
        }
    }
    return { effects, links };
}

/**
 * Applies the planned net stock/cost effects and creates catalog entries for
 * unmatched rows. Write-only — every read happened in
 * planPurchaseItemEffects, before the first write of the transaction.
 *
 * The net effect is computed as a delta against the committed snapshot:
 * newStock = committedStock + (newQty - oldQty), and the stock value adjusts
 * by the new rows' cost minus the old rows' cost. An edit that leaves the
 * rows untouched (e.g. only a discount change) therefore leaves stock and
 * production price exactly where they were, even if sales happened in
 * between — clamping the reversal first and re-adding would silently
 * inflate stock for partially sold items.
 */
function applyPurchaseItemEffects(
    transaction: Transaction,
    itemsCollection: CollectionReference<DocumentData>,
    plan: Awaited<ReturnType<typeof planPurchaseItemEffects>>,
    purchaseDate: Date,
) {
    for (const e of plan.effects.values()) {
        const committedStock = Number(e.committed.stock) || 0;
        const committedPP = Number(e.committed.productionPrice) || 0;

        let applyQty = 0;
        let applyValue = 0;
        let lastRow: { quantity: number; cost: number; sellingPrice?: number; author?: string } | null = null;
        for (const r of e.applyRows) {
            applyQty += Number(r.quantity) || 0;
            applyValue += (Number(r.quantity) || 0) * (Number(r.cost) || 0);
            lastRow = r;
        }

        const newStock = Math.max(0, committedStock - e.reverseQty + applyQty);
        let newPP = committedPP;
        if (newStock > 0) {
            const newValue = committedStock * committedPP - e.reverseCost + applyValue;
            if (newValue > 0) newPP = newValue / newStock;
        }

        const updateData: any = { stock: newStock, productionPrice: newPP };
        if (lastRow) {
            updateData.sellingPrice = lastRow.sellingPrice && lastRow.sellingPrice > 0
                ? lastRow.sellingPrice
                : Math.max(Number(e.committed.sellingPrice) || 0, newPP * 1.5);
            if (lastRow.author) updateData.author = lastRow.author;
        }
        transaction.update(e.ref, updateData);
    }

    for (const link of plan.links) {
        if (link.itemId || !link.newItemRef) continue;
        const row = link.row;
        const sellingPrice = row.sellingPrice && row.sellingPrice > 0 ? row.sellingPrice : row.cost * 1.5;
        const newItemData: Omit<Item, 'id'> = {
            title: row.itemName,
            categoryId: row.categoryId,
            categoryName: row.categoryName,
            author: row.author || 'Unknown',
            stock: row.quantity,
            productionPrice: row.cost,
            sellingPrice,
            createdAt: Timestamp.fromDate(purchaseDate),
        };
        transaction.set(link.newItemRef, newItemData);
    }
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

          // Resolve every row against the catalog so the purchase remembers
          // which item it fed; rows without a match create a new item. All
          // reads happen here, before the first write — Firestore transactions
          // forbid reads after writes.
          const plan = await planPurchaseItemEffects(itemsCollection, [], data.items);
          const itemsWithLinks = plan.links.map(l => ({ ...l.row, itemId: l.itemId ?? l.newItemRef!.id }));
          applyPurchaseItemEffects(transaction, itemsCollection, plan, purchaseDate);

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
          // what the purchase opened with — means money has already moved, so
          // the edit is restricted to non-payment fields below.
          // getPurchaseSettlementSummaries applies the same predicate to lock
          // the payment fields in the edit dialog.
          const payablesSnapshot = await getDocs(query(transactionsCollection, where('type', '==', 'Payable')));
          const linkedPayables: QueryDocumentSnapshot<DocumentData>[] = [];
          let hasSettlement = false;
          let traceSum = 0;
          payablesSnapshot.docs.forEach(d => {
              const classified = classifyPurchasePayable(String(d.data().description || ''));
              if (!classified || classified.purchaseId !== purchaseId) return;
              if (classified.isTrace) {
                  hasSettlement = true;
                  traceSum += Number(d.data().amount) || 0;
              } else if (d.data().status === 'Paid') {
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

          // Read everything else the edit needs before the first write —
          // Firestore transactions forbid reads after writes. The item plan
          // combines the old rows' stock reversal and the new rows' additions
          // into one net effect per catalog item, computed from the committed
          // snapshot, so no document ever needs to be re-read mid-transaction.
          let oldExpenseSnaps: QueryDocumentSnapshot<DocumentData>[] = [];
          if (!hasSettlement) {
              const [paidExpenses, partialExpenses] = await Promise.all([
                  getDocs(query(expensesCollection, where('description', '==', `Payment for Purchase ${purchaseId}`))),
                  getDocs(query(expensesCollection, where('description', '==', `Partial payment for Purchase ${purchaseId}`))),
              ]);
              oldExpenseSnaps = [...paidExpenses.docs, ...partialExpenses.docs];
          }
          const plan = await planPurchaseItemEffects(itemsCollection, existing.items, data.items);
          const itemsWithLinks = plan.links.map(l => ({ ...l.row, itemId: l.itemId ?? l.newItemRef!.id }));

          let totalAmount = 0;
          for (const item of data.items) {
              totalAmount += item.cost * item.quantity;
          }
          const discountAmount = data.discountAmount || 0;

          // --- WRITE PHASE (no transactional reads beyond this point) ---
          applyPurchaseItemEffects(transaction, itemsCollection, plan, purchaseDate);

          const purchaseData: Record<string, unknown> = {
              supplier: data.supplier,
              items: itemsWithLinks,
              date: Timestamp.fromDate(purchaseDate),
              dueDate: Timestamp.fromDate(dueDate),
              totalAmount,
              discountAmount,
          };

          if (hasSettlement) {
              // Restricted edit: the money that already moved — the initial
              // payment expense and every later payable payment — is recorded
              // fact and stays untouched. Only the outstanding balance is
              // recalculated: new net total minus everything actually paid.
              const oldNet = existing.totalAmount - (existing.discountAmount || 0);
              const initialPaid = existing.paymentMethod === 'Split'
                  ? (existing.amountPaid || 0)
                  : (existing.paymentMethod === 'Due' ? 0 : oldNet);
              const alreadyPaid = initialPaid + traceSum;
              const newNet = totalAmount - discountAmount;
              const remainder = newNet - alreadyPaid;
              if (remainder < -0.005) {
                  throw new Error(`The new net total (৳${newNet.toFixed(2)}) is less than the ৳${alreadyPaid.toFixed(2)} already paid against this purchase (৳${initialPaid.toFixed(2)} at purchase plus ৳${traceSum.toFixed(2)} in later payments). Raise the total or record the difference separately.`);
              }
              if (linkedPayables.length > 0) {
                  if (remainder > 0.005) {
                      transaction.update(linkedPayables[0].ref, {
                          amount: remainder,
                          dueDate: Timestamp.fromDate(dueDate),
                      });
                      linkedPayables.slice(1).forEach(d => transaction.delete(d.ref));
                  } else {
                      // The corrected total is fully covered by payments
                      // already made — nothing is owed anymore.
                      linkedPayables.forEach(d => transaction.delete(d.ref));
                  }
              } else if (remainder > 0.005) {
                  // The payable was fully settled but the corrected total leaves
                  // a new outstanding balance — open it as a fresh payable.
                  transaction.set(doc(transactionsCollection), {
                      description: `Balance for Purchase ${purchaseId} from ${data.supplier}`,
                      amount: remainder,
                      dueDate: Timestamp.fromDate(dueDate),
                      status: 'Pending' as const,
                      type: 'Payable' as const,
                  });
              }
              // Payment facts on the purchase record stay exactly as they were.
              purchaseData.paymentMethod = existing.paymentMethod;
              purchaseData.amountPaid = existing.amountPaid || 0;
              if (existing.splitPaymentMethod) purchaseData.splitPaymentMethod = existing.splitPaymentMethod;
          } else {
              // Full edit: the old payment artifacts are handed to the re-apply
              // step so they are updated in place (EXP numbers and doc ids stay
              // stable) while the purchase still needs them, and deleted when it
              // no longer does. addPurchase never creates more than one payment
              // expense / one payable per purchase, so anything beyond the
              // first of each is defensive cleanup.
              const oldPayableSnaps = linkedPayables;
              oldExpenseSnaps.slice(1).forEach(d => transaction.delete(d.ref));
              oldPayableSnaps.slice(1).forEach(d => transaction.delete(d.ref));

              purchaseData.paymentMethod = data.paymentMethod;
              purchaseData.amountPaid = data.amountPaid || 0;
              if (data.splitPaymentMethod) purchaseData.splitPaymentMethod = data.splitPaymentMethod;

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
          }
          transaction.update(purchaseRef, purchaseData);

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
