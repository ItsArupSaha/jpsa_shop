
'use server';

import { Timestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getExpenses } from './expenses';
import { getItems } from './items';
import { getPurchases } from './purchases';
import { getSales } from './sales';
import { getCurrentYear } from './utils';

// Calculate closing balances for a specific year (as of Dec 31st, 11:59 PM)
async function getClosingBalancesForYear(userId: string, year: number): Promise<{
    cash: number;
    bank: number;
    stockValue: number;
    officeAssetsValue: number;
}> {
    if (!db) {
        throw new Error("Database not connected");
    }

    // Use UTC dates for year boundaries to ensure consistency with client-side filtering
    // This prevents timezone-related filtering issues when server and client are in different timezones
    const yearEndDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    const yearStartDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const yearEndTimestamp = Timestamp.fromDate(yearEndDate);
    const yearStartTimestamp = Timestamp.fromDate(yearStartDate);

    // Fetch all data
    const [allItems, allSales, allExpenses, allTransactionsData, allPurchases, capitalData, transfersData, donationsData] = await Promise.all([
        getItems(userId),
        getSales(userId),
        getExpenses(userId),
        getDocs(collection(db, 'users', userId, 'transactions')),
        getPurchases(userId),
        getDocs(collection(db, 'users', userId, 'capital')),
        getDocs(collection(db, 'users', userId, 'transfers')),
        getDocs(collection(db, 'users', userId, 'donations')),
    ]);

    const allTransactions = allTransactionsData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));
    const allCapital = capitalData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));
    const allDonations = donationsData.docs.map(doc => doc.data());
    const allTransfers = transfersData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));

    // Helper to check if date is within the year
    const isInYear = (date: any): boolean => {
        if (!date) return false;
        const dateTimestamp = date instanceof Timestamp ? date : Timestamp.fromDate(new Date(date));
        return dateTimestamp.toMillis() >= yearStartTimestamp.toMillis() && 
               dateTimestamp.toMillis() <= yearEndTimestamp.toMillis();
    };

    // Filter data for the year
    // This function calculates closing balances for a specific year, so it should only include
    // transactions that occurred DURING that year (Jan 1 to Dec 31), not all historical transactions.
    // Initial Capital: Include only if created DURING the year (not before or after)
    // Capital Adjustments: Include if occurred within the year
    const filteredCapital = allCapital.filter((capital: any) => {
        if (capital.source === 'Initial Capital') {
            // Only include initial capital created DURING this specific year
            // This prevents accumulating capital from previous years in closing balances
            return isInYear(capital.date);
        } else {
            // For capital adjustments, only include those within the year
            return isInYear(capital.date);
        }
    });
    const filteredDonations = allDonations.filter((donation: any) => isInYear(donation.date));
    const filteredSales = allSales.filter((sale: any) => isInYear(sale.date));
    const filteredExpenses = allExpenses.filter((expense: any) => isInYear(expense.date));
    const filteredTransfers = allTransfers.filter((transfer: any) => isInYear(transfer.date));
    const filteredPurchases = allPurchases.filter((purchase: any) => isInYear(purchase.date));
    const filteredTransactions = allTransactions.filter((t: any) => isInYear(t.dueDate));
    const paidTransactions = filteredTransactions.filter((t: any) => t.status === 'Paid');

    let cash = 0;
    let bank = 0;

    // Handle initial capital and adjustments
    filteredCapital.forEach((capital: any) => {
        if (capital.paymentMethod === 'Cash') {
            cash += capital.amount;
        } else if (capital.paymentMethod === 'Bank') {
            bank += capital.amount;
        }
    });

    // Handle donations
    filteredDonations.forEach((donation: any) => {
        if (donation.source !== 'Initial Capital' && donation.donorName !== 'Internal Transfer') {
            if (donation.paymentMethod === 'Cash') {
                cash += donation.amount;
            } else if (donation.paymentMethod === 'Bank') {
                bank += donation.amount;
            }
        }
    });

    // Handle sales
    filteredSales.forEach((sale: any) => {
        if (sale.paymentMethod === 'Cash') {
            cash += sale.total;
        } else if (sale.paymentMethod === 'Bank') {
            bank += sale.total;
        } else if (sale.paymentMethod === 'Split' && sale.amountPaid && sale.amountPaid > 0) {
            if (sale.splitPaymentMethod === 'Bank') {
                bank += sale.amountPaid;
            } else {
                cash += sale.amountPaid;
            }
        }
    });

    // Handle customer payments
    paidTransactions.forEach((t: any) => {
        if (t.type === 'Receivable' && t.description?.startsWith('Payment from customer')) {
            if (t.paymentMethod === 'Cash') {
                cash += t.amount;
            } else if (t.paymentMethod === 'Bank') {
                bank += t.amount;
            }
        }
    });

    // Handle expenses
    filteredExpenses.forEach((expense: any) => {
        if (expense.paymentMethod === 'Bank') {
            bank -= expense.amount;
        } else {
            cash -= expense.amount;
        }
    });

    // Handle transfers
    filteredTransfers.forEach((transfer: any) => {
        if (transfer.from === 'Cash') {
            cash -= transfer.amount;
        } else if (transfer.from === 'Bank') {
            bank -= transfer.amount;
        }
        if (transfer.to === 'Cash') {
            cash += transfer.amount;
        } else if (transfer.to === 'Bank') {
            bank += transfer.amount;
        }
    });

    // Calculate stock value at year end
    const stockValue = allItems.reduce((sum: number, item: any) => {
        // Get sales of this item AFTER year end
        const itemSalesAfterYear = allSales
            .filter((sale: any) => {
                const saleDate = sale.date instanceof Timestamp ? sale.date : Timestamp.fromDate(new Date(sale.date));
                return saleDate.toMillis() > yearEndTimestamp.toMillis();
            })
            .reduce((saleSum: number, sale: any) => {
                const saleItem = sale.items.find((si: any) => si.itemId === item.id);
                if (saleItem) {
                    return saleSum + saleItem.quantity;
                }
                return saleSum;
            }, 0);

        // Get purchases of this item AFTER year end
        const itemPurchasesAfterYear = allPurchases
            .filter((purchase: any) => {
                const purchaseDate = purchase.date instanceof Timestamp ? purchase.date : Timestamp.fromDate(new Date(purchase.date));
                return purchaseDate.toMillis() > yearEndTimestamp.toMillis();
            })
            .reduce((purchaseSum: number, purchase: any) => {
                const purchaseItem = purchase.items.find((pi: any) => pi.categoryId === item.categoryId && pi.itemName === item.title);
                if (purchaseItem) {
                    return purchaseSum + purchaseItem.quantity;
                }
                return purchaseSum;
            }, 0);

        // Stock at year end = current stock - net change after year end
        const closingStockAtYearEnd = item.stock + itemSalesAfterYear - itemPurchasesAfterYear;
        const value = closingStockAtYearEnd > 0 ? item.productionPrice * closingStockAtYearEnd : 0;
        return sum + value;
    }, 0);

    const officeAssetsValue = filteredPurchases
        .flatMap((p: any) => p.items)
        .filter((i: any) => i.categoryName === 'Office Asset')
        .reduce((sum: number, item: any) => sum + (item.cost * item.quantity), 0);

    return { cash, bank, stockValue, officeAssetsValue };
}

export async function getBalanceSheetData(userId: string, asOfDate?: Date, year?: number) {
    if (!db) {
        throw new Error("Database not connected");
    }

    // Use provided year or default to current year
    const selectedYear = year ?? getCurrentYear();
    // Use UTC dates for year boundaries to ensure consistency with client-side filtering
    // This prevents timezone-related filtering issues when server and client are in different timezones
    const yearStart = new Date(Date.UTC(selectedYear, 0, 1, 0, 0, 0, 0));
    const yearEnd = new Date(Date.UTC(selectedYear, 11, 31, 23, 59, 59, 999));
    const yearStartTimestamp = Timestamp.fromDate(yearStart);
    const yearEndTimestamp = Timestamp.fromDate(yearEnd);

    // If asOfDate is provided, we need to get data up to that date
    // But we only include transactions from the selected year
    // Note: Timestamp.fromDate() converts the Date to UTC, ensuring consistency with UTC year boundaries
    const cutoffTimestamp = asOfDate ? Timestamp.fromDate(asOfDate) : yearEndTimestamp;
    // Ensure cutoff is within the selected year
    const finalCutoffTimestamp = cutoffTimestamp && cutoffTimestamp.toMillis() > yearEndTimestamp.toMillis() 
        ? yearEndTimestamp 
        : (cutoffTimestamp || yearEndTimestamp);
    
    // Get opening balances from previous year (if not first year)
    let openingCash = 0;
    let openingBank = 0;
    let openingStockValue = 0;
    let openingOfficeAssets = 0;
    let isFirstYear = false;
    
    // Check if there's a previous year by checking for actual transactions
    // We cannot rely on balance values alone, as a year could legitimately have zero balances
    const previousYear = selectedYear - 1;
    // Use UTC dates for previous year boundaries to ensure consistency with selected year boundaries
    // This prevents timezone-related filtering issues when determining opening balances
    const previousYearStart = new Date(Date.UTC(previousYear, 0, 1, 0, 0, 0, 0));
    const previousYearEnd = new Date(Date.UTC(previousYear, 11, 31, 23, 59, 59, 999));
    const previousYearStartTimestamp = Timestamp.fromDate(previousYearStart);
    const previousYearEndTimestamp = Timestamp.fromDate(previousYearEnd);
    
    // Helper to check if date is in previous year
    const isInPreviousYear = (date: any): boolean => {
        if (!date) return false;
        const dateTimestamp = date instanceof Timestamp ? date : Timestamp.fromDate(new Date(date));
        return dateTimestamp.toMillis() >= previousYearStartTimestamp.toMillis() && 
               dateTimestamp.toMillis() <= previousYearEndTimestamp.toMillis();
    };
    
    try {
        // Check if there are any transactions in the previous year
        // This is the correct way to determine if a year has data, not by checking balance values
        const [salesData, purchasesData, expensesData, donationsData, transfersData, capitalData] = await Promise.all([
            getSales(userId),
            getPurchases(userId),
            getExpenses(userId),
            getDocs(collection(db, 'users', userId, 'donations')),
            getDocs(collection(db, 'users', userId, 'transfers')),
            getDocs(collection(db, 'users', userId, 'capital')),
        ]);
        
        const hasSalesInPreviousYear = salesData.some((sale: any) => isInPreviousYear(sale.date));
        const hasPurchasesInPreviousYear = purchasesData.some((purchase: any) => isInPreviousYear(purchase.date));
        const hasExpensesInPreviousYear = expensesData.some((expense: any) => isInPreviousYear(expense.date));
        const hasDonationsInPreviousYear = donationsData.docs.some((doc: any) => isInPreviousYear(doc.data().date));
        const hasTransfersInPreviousYear = transfersData.docs.some((doc: any) => isInPreviousYear(doc.data().date));
        const hasCapitalInPreviousYear = capitalData.docs.some((doc: any) => {
            const capital = doc.data();
            return isInPreviousYear(capital.date);
        });
        
        const hasAnyTransactionsInPreviousYear = hasSalesInPreviousYear || hasPurchasesInPreviousYear || 
                                                hasExpensesInPreviousYear || hasDonationsInPreviousYear || 
                                                hasTransfersInPreviousYear || hasCapitalInPreviousYear;
        
        if (hasAnyTransactionsInPreviousYear) {
            // Previous year has transactions, so get closing balances
            const closingBalances = await getClosingBalancesForYear(userId, previousYear);
            openingCash = closingBalances.cash;
            openingBank = closingBalances.bank;
            openingStockValue = closingBalances.stockValue;
            openingOfficeAssets = closingBalances.officeAssetsValue;
        } else {
            // No transactions in previous year, meaning this is the first year
            isFirstYear = true;
        }
    } catch (error) {
        // If there's an error checking for previous year data, treat as first year
        isFirstYear = true;
    }
    
    // If this is the first year, include ALL initial capital as opening balance
    // (not just capital before the year started, since this IS the starting year)
    if (isFirstYear) {
        const capitalData = await getDocs(collection(db, 'users', userId, 'capital'));
        const allCapital = capitalData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));
        allCapital.forEach((capital: any) => {
            if (capital.source === 'Initial Capital') {
                // For first year, include ALL initial capital regardless of when it was added
                // This ensures initial capital added in the first year is included
                if (capital.paymentMethod === 'Cash') {
                    openingCash += capital.amount;
                } else if (capital.paymentMethod === 'Bank') {
                    openingBank += capital.amount;
                }
            }
        });
    }

    // Fetch all required data sources in parallel
    const [allItems, allSales, allExpenses, allTransactionsData, allPurchases, capitalData, transfersData, donationsData] = await Promise.all([
        getItems(userId),
        getSales(userId),
        getExpenses(userId),
        getDocs(collection(db, 'users', userId, 'transactions')),
        getPurchases(userId),
        getDocs(collection(db, 'users', userId, 'capital')),
        getDocs(collection(db, 'users', userId, 'transfers')),
        getDocs(collection(db, 'users', userId, 'donations')),
    ]);

    // Map transactions and include document creation time for accurate balance sheet filtering
    // Firestore documents have a creation timestamp in metadata that we need to use instead of dueDate
    // because dueDate can be a future payment date, not the transaction creation date
    const allTransactions = allTransactionsData.docs.map((doc: any) => {
        const data = doc.data();
        // Use document creation time from Firestore metadata if available (most accurate)
        // Firestore QueryDocumentSnapshot has metadata.createTime property
        // Fall back to dueDate only if metadata is not available (though this may not be accurate for future due dates)
        const createdAt = doc.metadata?.createTime || doc._createTime || doc.createTime || data.dueDate;
        return { 
            id: doc.id, 
            ...data,
            _createdAt: createdAt // Store creation time for filtering
        } as any;
    });
    const allDonations = donationsData.docs.map(doc => doc.data());
    const allTransfers = transfersData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));
    const allCapital = capitalData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));

    // Helper function to check if a date is in selected year and before or on the cutoff date
    const isInSelectedYearAndBeforeCutoff = (date: any): boolean => {
        if (!date) return false;
        const dateTimestamp = date instanceof Timestamp ? date : Timestamp.fromDate(new Date(date));
        
        // Must be in selected year (Jan 1st to Dec 31st)
        if (dateTimestamp.toMillis() < yearStartTimestamp.toMillis() || 
            dateTimestamp.toMillis() > yearEndTimestamp.toMillis()) {
            return false;
        }
        
        // Must be before or on the cutoff date
        return dateTimestamp.toMillis() <= finalCutoffTimestamp.toMillis();
    };

    // Filter data for selected year only (starting from Jan 1st)
    // Note: Initial Capital is already in opening balances, but Capital Adjustments in the selected year should be included
    const filteredCapital = allCapital.filter((capital: any) => {
        if (capital.source === 'Initial Capital') {
            // For first year: All initial capital is in opening balances, so exclude it
            // For subsequent years: Only initial capital before year start is in opening balances
            // Initial capital added during the selected year (for non-first years) should be excluded
            // to prevent double-counting, as it's not in opening balances
            if (isFirstYear) {
                // First year: All initial capital is already in opening balances
                return false;
            } else {
                // Subsequent years: Check if this initial capital was added during the selected year
                // If it was added during the year, it's NOT in opening balances, so we need to include it
                const capitalDate = capital.date instanceof Timestamp ? capital.date : Timestamp.fromDate(new Date(capital.date));
                const wasAddedDuringYear = capitalDate.toMillis() >= yearStartTimestamp.toMillis() && 
                                          capitalDate.toMillis() <= finalCutoffTimestamp.toMillis();
                // Include it if it was added during the selected year (not in opening balances)
                return wasAddedDuringYear;
            }
        }
        // Capital Adjustments should be included if they occurred in the selected year
        return isInSelectedYearAndBeforeCutoff(capital.date);
    });
    const filteredDonations = allDonations.filter((donation: any) => isInSelectedYearAndBeforeCutoff(donation.date));
    const filteredSales = allSales.filter((sale: any) => isInSelectedYearAndBeforeCutoff(sale.date));
    const filteredExpenses = allExpenses.filter((expense: any) => isInSelectedYearAndBeforeCutoff(expense.date));
    const filteredTransfers = allTransfers.filter((transfer: any) => isInSelectedYearAndBeforeCutoff(transfer.date));
    const filteredPurchases = allPurchases.filter((purchase: any) => isInSelectedYearAndBeforeCutoff(purchase.date));
    
    // Filter transactions by their dueDate (selected year only)
    const filteredTransactions = allTransactions.filter((t: any) => isInSelectedYearAndBeforeCutoff(t.dueDate));

    // Get paid transactions only up to cutoff date
    // Note: filteredTransactions already filters by date, so we only need to filter by status
    const paidTransactionsUpToCutoff = filteredTransactions.filter((t: any) => t.status === 'Paid');

    // Start with opening balances from previous year
    let cash = openingCash;
    let bank = openingBank;

    // Handle capital adjustments in the selected year
    filteredCapital.forEach((capital: any) => {
        if (capital.paymentMethod === 'Cash') {
            cash += capital.amount;
        } else if (capital.paymentMethod === 'Bank') {
            bank += capital.amount;
        }
    });

    // Handle regular donations
    filteredDonations.forEach((donation: any) => {
        if (donation.source !== 'Initial Capital' && donation.donorName !== 'Internal Transfer') {
            if (donation.paymentMethod === 'Cash') {
                cash += donation.amount;
            } else if (donation.paymentMethod === 'Bank') {
                bank += donation.amount;
            }
        }
    });

    // Handle sales
    filteredSales.forEach((sale: any) => {
        if (sale.paymentMethod === 'Cash') {
            cash += sale.total;
        } else if (sale.paymentMethod === 'Bank') {
            bank += sale.total;
        } else if (sale.paymentMethod === 'Split' && sale.amountPaid && sale.amountPaid > 0) {
            // For Split sales, only count the immediate payment (amountPaid)
            // The remaining due amount is tracked as a receivable
            if (sale.splitPaymentMethod === 'Bank') {
                bank += sale.amountPaid;
            } else {
                cash += sale.amountPaid;
            }
        }
        // Note: 'Paid by Credit' and 'Due' sales don't affect cash/bank balance
        // - 'Paid by Credit': Uses customer credit, no cash/bank movement
        // - 'Due': Creates receivable, no immediate cash/bank movement
    });

    // Handle payments received from customers
    // Only count "Payment from customer" transactions (actual money received)
    // Exclude all other types of paid transactions:
    // - "Due from SALE-XXXX" transactions (original receivables, not actual payments)
    // - "Partial payment for" transactions (already counted in sales section for Split sales)
    paidTransactionsUpToCutoff.forEach((t: any) => {
        if (t.type === 'Receivable') {
            const description = t.description || '';
            
            // Only count "Payment from customer" transactions (actual money received)
            // Exclude everything else
            if (description.startsWith('Payment from customer')) {
                if (t.paymentMethod === 'Cash') {
                    cash += t.amount;
                } else if (t.paymentMethod === 'Bank') {
                    bank += t.amount;
                }
            }
            // All other paid receivable transactions are excluded:
            // - "Due from SALE-XXXX" (original receivable, not actual payment)
            // - "Partial payment for SALE-XXXX" (already counted in sales section)
        }
    });

    // Handle expenses
    filteredExpenses.forEach((expense: any) => {
        if (expense.paymentMethod === 'Bank') {
            bank -= expense.amount;
        } else {
            cash -= expense.amount;
        }
    });

    // Handle transfers
    filteredTransfers.forEach((transfer: any) => {
        if (transfer.from === 'Cash') {
            cash -= transfer.amount;
        } else if (transfer.from === 'Bank') {
            bank -= transfer.amount;
        }
        
        if (transfer.to === 'Cash') {
            cash += transfer.amount;
        } else if (transfer.to === 'Bank') {
            bank += transfer.amount;
        }
    });

    // Calculate stock value as of the cutoff date
    // Stock value = opening stock value + purchases in selected year up to cutoff - sales in selected year up to cutoff
    // This is the correct and direct calculation method
    
    // Calculate purchases value in selected year up to cutoff
    // Use purchaseItem.cost directly (historical cost at purchase time) instead of looking up current item prices
    // This ensures accuracy even if items are renamed or prices change after purchase
    const purchasesValueInYearUpToCutoff = filteredPurchases
        .reduce((sum: number, purchase: any) => {
            return sum + purchase.items.reduce((itemSum: number, purchaseItem: any) => {
                // Exclude Office Assets from stock value calculation
                if (purchaseItem.categoryName !== 'Office Asset') {
                    // Use the cost stored at purchase time, not current item prices
                    // This ensures historical accuracy and handles renamed items correctly
                    return itemSum + (purchaseItem.cost * purchaseItem.quantity);
                }
                return itemSum;
            }, 0);
        }, 0);
    
    // Calculate sales value (cost of goods sold) in selected year up to cutoff
    // Note: Sales use itemId which is stable, but if item is deleted, lookup will fail
    // We use current productionPrice as sales don't store historical cost
    // This is a limitation - if productionPrice changes, historical sales will reflect new price
    const salesCostInYearUpToCutoff = filteredSales
        .reduce((sum: number, sale: any) => {
            return sum + sale.items.reduce((itemSum: number, saleItem: any) => {
                const item = allItems.find((i: any) => i.id === saleItem.itemId);
                if (item) {
                    // Use current productionPrice (sales don't store historical cost)
                    // If item is deleted, this will be 0, which is acceptable for deleted items
                    return itemSum + (item.productionPrice * saleItem.quantity);
                }
                // If item not found (deleted), skip it - can't calculate cost for deleted items
                return itemSum;
            }, 0);
        }, 0);
    
    // Stock value as of cutoff = opening stock value + purchases up to cutoff - sales (COGS) up to cutoff
    const stockValue = openingStockValue + purchasesValueInYearUpToCutoff - salesCostInYearUpToCutoff;

    // Office assets: opening + purchases this year up to cutoff
    const officeAssetsValue = openingOfficeAssets + filteredPurchases
        .flatMap((p: any) => p.items)
        .filter((i: any) => i.categoryName === 'Office Asset')
        .reduce((sum: number, item: any) => sum + (item.cost * item.quantity), 0);

    // Calculate receivables as of the cutoff date
    // Receivables should include ALL pending receivables that exist as of the cutoff date,
    // regardless of when they were created. This is because receivables are assets that should
    // be shown on the balance sheet if they're still outstanding, even if created in previous years.
    // Use document creation time (not dueDate) to determine if transaction existed as of cutoff date
    const allPendingReceivables = allTransactions.filter((t: any) => {
        if (t.type !== 'Receivable' || t.status !== 'Pending') return false;
        // Use creation time if available (from Firestore document metadata), otherwise fall back to dueDate
        // Note: dueDate can be a future payment date, not the creation date, so creation time is preferred
        const creationTime = t._createdAt || t.dueDate;
        const transactionDate = creationTime instanceof Timestamp ? creationTime : Timestamp.fromDate(new Date(creationTime));
        // Include receivables that were created on or before the cutoff date (regardless of year or due date)
        return transactionDate.toMillis() <= finalCutoffTimestamp.toMillis();
    });
    const receivables = allPendingReceivables.reduce((sum: number, t: any) => sum + t.amount, 0);

    // Calculate payables as of the cutoff date
    // Payables should include ALL pending payables that exist as of the cutoff date,
    // regardless of when they were created. This ensures consistency with receivables calculation.
    // Use document creation time (not dueDate) to determine if transaction existed as of cutoff date
    const allPendingPayables = allTransactions.filter((t: any) => {
        if (t.type !== 'Payable' || t.status !== 'Pending') return false;
        // Use creation time if available (from Firestore document metadata), otherwise fall back to dueDate
        // Note: dueDate can be a future payment date, not the creation date, so creation time is preferred
        const creationTime = t._createdAt || t.dueDate;
        const transactionDate = creationTime instanceof Timestamp ? creationTime : Timestamp.fromDate(new Date(creationTime));
        // Include payables that were created on or before the cutoff date (regardless of year or due date)
        return transactionDate.toMillis() <= finalCutoffTimestamp.toMillis();
    });
    const payables = allPendingPayables.reduce((sum: number, t: any) => sum + t.amount, 0);

    const totalAssets = cash + bank + receivables + stockValue + officeAssetsValue;
    const equity = totalAssets - payables;

    return {
        cash,
        bank,
        stockValue,
        officeAssetsValue,
        receivables,
        totalAssets,
        payables,
        equity
    };
}
