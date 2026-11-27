import { useEffect, useMemo, useState } from 'react';
import { createDefaultPosState } from '../data/defaultData';
import {
  CartItem,
  Category,
  CategoryBreakdownItem,
  CreditCustomer,
  CreditTransaction,
  DayClosure,
  ExpenseRecord,
  PaymentMethod,
  PosState,
  Product,
  SaleRecord,
  ShopSettings,
} from '../types';
import { generateId } from '../utils/format';

const STORAGE_KEY = 'bunn_cafe_pos_state_v1';

function loadInitialState(): PosState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultPosState();
    const parsed = JSON.parse(raw) as Partial<PosState>;
    const defaults = createDefaultPosState();
    const rawCategories =
      Array.isArray(parsed.categories) && parsed.categories.length > 0
        ? parsed.categories
        : defaults.categories;
    const rawProducts = Array.isArray(parsed.products) ? parsed.products : defaults.products;
    const catCounters = new Map<string, number>();
    const normalizedProducts = rawProducts.map((p) => {
      const nextOrd = (catCounters.get(p.categoryId) || 0) + 1;
      catCounters.set(p.categoryId, nextOrd);
      return {
        ...p,
        order: typeof p.order === 'number' ? p.order : nextOrd,
      };
    });

    return {
      categories: rawCategories.map((c, idx) => ({
        ...c,
        order: typeof c.order === 'number' ? c.order : idx + 1,
      })),
      products: normalizedProducts,
      sales: Array.isArray(parsed.sales) ? parsed.sales : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      customers: Array.isArray(parsed.customers) ? parsed.customers : defaults.customers,
      creditTransactions: Array.isArray(parsed.creditTransactions) ? parsed.creditTransactions : defaults.creditTransactions,
      closures: Array.isArray(parsed.closures) ? parsed.closures : [],
      settings: {
        ...defaults.settings,
        ...(parsed.settings || {}),
        shopName:
          !parsed.settings?.shopName || parsed.settings.shopName === 'مطحنة وكافيه الأصيل'
            ? 'بن اسكتو'
            : parsed.settings.shopName,
      },
    };
  } catch {
    return createDefaultPosState();
  }
}

export interface ShiftSummary {
  openingCash: number;
  cashSales: number;
  vodafoneSales: number;
  instapaySales: number;
  creditSalesTotal: number;
  creditDownPaymentsCash: number;
  creditDownPaymentsWallet: number;
  creditCashCollections: number;
  creditWalletCollections: number;
  totalExpenses: number;
  expectedDrawerCash: number;
  totalSales: number;
  totalCost: number;
  grossProfit: number;
  estimatedProfit: number;
  salesCount: number;
  expensesCount: number;
  categoryBreakdown: CategoryBreakdownItem[];
}

export function computeShiftSummary(
  state: PosState,
  shiftId: string,
  openingCash: number
): ShiftSummary {
  const shiftSales = state.sales.filter((s) => s.shiftId === shiftId && !s.voided);
  const shiftExpenses = state.expenses.filter((e) => e.shiftId === shiftId);
  const shiftCreditPayments = state.creditTransactions.filter(
    (t) => t.shiftId === shiftId && t.type === 'payment'
  );

  let cashSales = 0;
  let vodafoneSales = 0;
  let instapaySales = 0;
  let creditSalesTotal = 0;
  let creditDownPaymentsCash = 0;
  let creditDownPaymentsWallet = 0;
  let totalSales = 0;
  let totalCost = 0;

  const catMap = new Map<string, { revenue: number; count: number }>();

  for (const sale of shiftSales) {
    totalSales += sale.total;
    totalCost += sale.totalCost;

    if (sale.paymentMethod === 'cash') {
      cashSales += sale.total;
    } else if (sale.paymentMethod === 'vodafone') {
      vodafoneSales += sale.total;
    } else if (sale.paymentMethod === 'instapay') {
      instapaySales += sale.total;
    } else if (sale.paymentMethod === 'credit') {
      creditSalesTotal += sale.creditRemaining;
      if (sale.paidNow > 0) {
        if (sale.downPaymentMethod === 'vodafone' || sale.downPaymentMethod === 'instapay') {
          creditDownPaymentsWallet += sale.paidNow;
        } else {
          creditDownPaymentsCash += sale.paidNow;
        }
      }
    }

    for (const item of sale.items) {
      const prev = catMap.get(item.categoryId) || { revenue: 0, count: 0 };
      catMap.set(item.categoryId, {
        revenue: prev.revenue + item.lineTotal,
        count: prev.count + item.qty,
      });
    }
  }

  let creditCashCollections = 0;
  let creditWalletCollections = 0;
  for (const payment of shiftCreditPayments) {
    if (payment.paymentMethod === 'vodafone' || payment.paymentMethod === 'instapay') {
      creditWalletCollections += payment.amount;
    } else {
      creditCashCollections += payment.amount;
    }
  }

  const totalExpenses = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);
  const expectedDrawerCash =
    openingCash + cashSales + creditDownPaymentsCash + creditCashCollections - totalExpenses;
  const grossProfit = totalSales - totalCost;
  const estimatedProfit = grossProfit - totalExpenses;

  const categoryBreakdown: CategoryBreakdownItem[] = state.categories
    .map((cat) => {
      const stats = catMap.get(cat.id) || { revenue: 0, count: 0 };
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        revenue: stats.revenue,
        count: stats.count,
      };
    })
    .filter((b) => b.revenue > 0 || b.count > 0);

  return {
    openingCash,
    cashSales,
    vodafoneSales,
    instapaySales,
    creditSalesTotal,
    creditDownPaymentsCash,
    creditDownPaymentsWallet,
    creditCashCollections,
    creditWalletCollections,
    totalExpenses,
    expectedDrawerCash,
    totalSales,
    totalCost,
    grossProfit,
    estimatedProfit,
    salesCount: shiftSales.length,
    expensesCount: shiftExpenses.length,
    categoryBreakdown,
  };
}

export function usePosStore() {
  const [state, setState] = useState<PosState>(loadInitialState);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage quota fallback
    }
  }, [state]);

  const currentShiftSummary = useMemo(
    () => computeShiftSummary(state, state.settings.currentShiftId, state.settings.openingCash),
    [state]
  );

  // --- SALES ---
  const completeSale = (params: {
    items: CartItem[];
    paymentMethod: PaymentMethod;
    customerId?: string;
    paidNow?: number;
    downPaymentMethod?: 'cash' | 'vodafone' | 'instapay';
  }): SaleRecord => {
    const total = Number(
      params.items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
    );
    const totalCost = Number(
      params.items.reduce((sum, item) => sum + item.costTotal, 0).toFixed(2)
    );

    const isCredit = params.paymentMethod === 'credit';
    const paidNow = isCredit ? Math.min(Math.max(0, params.paidNow || 0), total) : total;
    const creditRemaining = isCredit ? Number((total - paidNow).toFixed(2)) : 0;
    const customer = isCredit
      ? state.customers.find((c) => c.id === params.customerId)
      : undefined;

    const receiptNo = state.settings.nextReceiptNo;
    const timestamp = new Date().toISOString();
    const saleRecord: SaleRecord = {
      id: generateId('sale'),
      receiptNo,
      timestamp,
      items: params.items,
      total,
      totalCost,
      paymentMethod: params.paymentMethod,
      paidNow,
      downPaymentMethod: isCredit ? params.downPaymentMethod || 'cash' : undefined,
      creditRemaining,
      customerId: customer?.id,
      customerName: customer?.name,
      shiftId: state.settings.currentShiftId,
      voided: false,
    };

    setState((prev) => {
      // Deduct inventory
      let plasticCupsToDeduct = 0;
      const updatedProducts = prev.products.map((prod) => {
        const matchingItems = params.items.filter((i) => i.productId === prod.id);
        if (matchingItems.length === 0) return prod;

        let nextProd = { ...prod };
        for (const item of matchingItems) {
          if (item.mode === 'weight' && item.weightGrams) {
            const kgUsed = (item.weightGrams * item.qty) / 1000;
            nextProd.stockKg = Math.max(
              0,
              Number(((nextProd.stockKg || 0) - kgUsed).toFixed(3))
            );
          } else if (item.mode === 'fridge') {
            if (prod.isIceCup || item.isIceCup) {
              plasticCupsToDeduct += item.qty;
            } else {
              nextProd.stockUnits = Math.max(0, (nextProd.stockUnits || 0) - item.qty);
            }
          }
        }
        return nextProd;
      });

      // Update customer balance & credit transaction if creditRemaining > 0
      let updatedCustomers = prev.customers;
      let updatedCreditTx = prev.creditTransactions;
      if (isCredit && customer && creditRemaining > 0) {
        updatedCustomers = prev.customers.map((c) =>
          c.id === customer.id
            ? { ...c, balance: Number((c.balance + creditRemaining).toFixed(2)) }
            : c
        );
        const itemSummary = params.items
          .map((i) =>
            i.mode === 'weight' && i.weightGrams
              ? `${i.name}${i.roast ? ` (${i.roast})` : ''} (${i.weightGrams}جم)`
              : `${i.name}${i.note ? ` — سكر ${i.note}` : ''} ×${i.qty}`
          )
          .join('، ');
        const tx: CreditTransaction = {
          id: generateId('ctx'),
          customerId: customer.id,
          timestamp,
          type: 'charge',
          amount: creditRemaining,
          note:
            paidNow > 0
              ? `فاتورة #${receiptNo}: ${itemSummary} (مدفوع ${paidNow} ج.م والباقي آجل)`
              : `فاتورة #${receiptNo}: ${itemSummary}`,
          receiptNo,
          shiftId: prev.settings.currentShiftId,
        };
        updatedCreditTx = [tx, ...prev.creditTransactions];
      }

      return {
        ...prev,
        products: updatedProducts,
        sales: [saleRecord, ...prev.sales],
        customers: updatedCustomers,
        creditTransactions: updatedCreditTx,
        settings: {
          ...prev.settings,
          plasticCupsStock: Math.max(0, prev.settings.plasticCupsStock - plasticCupsToDeduct),
          nextReceiptNo: prev.settings.nextReceiptNo + 1,
        },
      };
    });

    return saleRecord;
  };

  const voidSale = (saleId: string) => {
    setState((prev) => {
      const target = prev.sales.find((s) => s.id === saleId);
      if (!target || target.voided) return prev;

      let plasticCupsToRestore = 0;
      const updatedProducts = prev.products.map((prod) => {
        const matchingItems = target.items.filter((i) => i.productId === prod.id);
        if (matchingItems.length === 0) return prod;
        let nextProd = { ...prod };
        for (const item of matchingItems) {
          if (item.mode === 'weight' && item.weightGrams) {
            const kgRestored = (item.weightGrams * item.qty) / 1000;
            nextProd.stockKg = Number(((nextProd.stockKg || 0) + kgRestored).toFixed(3));
          } else if (item.mode === 'fridge') {
            if (prod.isIceCup || item.isIceCup) {
              plasticCupsToRestore += item.qty;
            } else {
              nextProd.stockUnits = (nextProd.stockUnits || 0) + item.qty;
            }
          }
        }
        return nextProd;
      });

      let updatedCustomers = prev.customers;
      let updatedCreditTx = prev.creditTransactions;
      if (target.paymentMethod === 'credit' && target.customerId && target.creditRemaining > 0) {
        updatedCustomers = prev.customers.map((c) =>
          c.id === target.customerId
            ? { ...c, balance: Math.max(0, Number((c.balance - target.creditRemaining).toFixed(2))) }
            : c
        );
        updatedCreditTx = prev.creditTransactions.filter(
          (tx) => !(tx.customerId === target.customerId && tx.receiptNo === target.receiptNo)
        );
      }

      return {
        ...prev,
        products: updatedProducts,
        sales: prev.sales.map((s) => (s.id === saleId ? { ...s, voided: true } : s)),
        customers: updatedCustomers,
        creditTransactions: updatedCreditTx,
        settings: {
          ...prev.settings,
          plasticCupsStock: prev.settings.plasticCupsStock + plasticCupsToRestore,
        },
      };
    });
  };

  // --- INVENTORY ---
  const restockCoffeeKg = (productId: string, addKg: number) => {
    if (!Number.isFinite(addKg) || addKg === 0) return;
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.id === productId
          ? { ...p, stockKg: Math.max(0, Number(((p.stockKg || 0) + addKg).toFixed(3))) }
          : p
      ),
    }));
  };

  const setCoffeeStockKg = (productId: string, exactKg: number) => {
    if (!Number.isFinite(exactKg) || exactKg < 0) return;
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.id === productId ? { ...p, stockKg: Number(exactKg.toFixed(3)) } : p
      ),
    }));
  };

  const restockFridgePacks = (productId: string, packsCount: number) => {
    if (!Number.isFinite(packsCount) || packsCount === 0) return;
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) => {
        if (p.id !== productId) return p;
        const perPack = p.unitsPerPack || 1;
        const addUnits = Math.round(packsCount * perPack);
        return { ...p, stockUnits: Math.max(0, (p.stockUnits || 0) + addUnits) };
      }),
    }));
  };

  const restockFridgeUnits = (productId: string, unitsCount: number) => {
    if (!Number.isFinite(unitsCount) || unitsCount === 0) return;
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.id === productId
          ? { ...p, stockUnits: Math.max(0, (p.stockUnits || 0) + Math.round(unitsCount)) }
          : p
      ),
    }));
  };

  const applyFridgeAudit = (countsByProductId: Record<string, number>) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) => {
        if (countsByProductId[p.id] === undefined) return p;
        return { ...p, stockUnits: Math.max(0, Math.round(countsByProductId[p.id])) };
      }),
    }));
  };

  const adjustPlasticCups = (delta: number) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        plasticCupsStock: Math.max(0, prev.settings.plasticCupsStock + Math.round(delta)),
      },
    }));
  };

  // --- EXPENSES ---
  const addExpense = (category: string, description: string, amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const record: ExpenseRecord = {
      id: generateId('exp'),
      timestamp: new Date().toISOString(),
      category,
      description: description.trim() || category,
      amount: Number(amount.toFixed(2)),
      shiftId: state.settings.currentShiftId,
    };
    setState((prev) => ({
      ...prev,
      expenses: [record, ...prev.expenses],
    }));
  };

  const deleteExpense = (expenseId: string) => {
    setState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== expenseId),
    }));
  };

  const addExpenseCategory = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setState((prev) => {
      if (prev.settings.expenseCategories.includes(clean)) return prev;
      return {
        ...prev,
        settings: {
          ...prev.settings,
          expenseCategories: [...prev.settings.expenseCategories, clean],
        },
      };
    });
  };

  const removeExpenseCategory = (name: string) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        expenseCategories: prev.settings.expenseCategories.filter((c) => c !== name),
      },
    }));
  };

  // --- CREDIT LEDGER ---
  const addCustomer = (name: string, phone: string, notes: string): CreditCustomer => {
    const customer: CreditCustomer = {
      id: generateId('cust'),
      name: name.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      balance: 0,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      customers: [customer, ...prev.customers],
    }));
    return customer;
  };

  const updateCustomer = (id: string, updates: Partial<Pick<CreditCustomer, 'name' | 'phone' | 'notes'>>) => {
    setState((prev) => ({
      ...prev,
      customers: prev.customers.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  };

  const deleteCustomer = (id: string) => {
    setState((prev) => ({
      ...prev,
      customers: prev.customers.filter((c) => c.id !== id),
      creditTransactions: prev.creditTransactions.filter((t) => t.customerId !== id),
    }));
  };

  const addManualCreditCharge = (customerId: string, amount: number, note: string) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const tx: CreditTransaction = {
      id: generateId('ctx'),
      customerId,
      timestamp: new Date().toISOString(),
      type: 'charge',
      amount: Number(amount.toFixed(2)),
      note: note.trim() || 'مسحوبات آجلة',
      shiftId: state.settings.currentShiftId,
    };
    setState((prev) => ({
      ...prev,
      customers: prev.customers.map((c) =>
        c.id === customerId
          ? { ...c, balance: Number((c.balance + tx.amount).toFixed(2)) }
          : c
      ),
      creditTransactions: [tx, ...prev.creditTransactions],
    }));
  };

  const recordCreditPayment = (
    customerId: string,
    amount: number,
    paymentMethod: 'cash' | 'vodafone' | 'instapay',
    note: string
  ) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const tx: CreditTransaction = {
      id: generateId('ctx'),
      customerId,
      timestamp: new Date().toISOString(),
      type: 'payment',
      amount: Number(amount.toFixed(2)),
      paymentMethod,
      note: note.trim() || 'تحصيل دفعة من الحساب',
      shiftId: state.settings.currentShiftId,
    };
    setState((prev) => ({
      ...prev,
      customers: prev.customers.map((c) =>
        c.id === customerId
          ? { ...c, balance: Math.max(0, Number((c.balance - tx.amount).toFixed(2))) }
          : c
      ),
      creditTransactions: [tx, ...prev.creditTransactions],
    }));
  };

  // --- DAY CLOSURE ---
  const setOpeningCash = (amount: number) => {
    if (!Number.isFinite(amount) || amount < 0) return;
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, openingCash: Number(amount.toFixed(2)) },
    }));
  };

  const closeCurrentDay = (actualDrawerCash: number, nextOpeningCash: number, notes?: string): DayClosure => {
    const summary = computeShiftSummary(state, state.settings.currentShiftId, state.settings.openingCash);
    const nowIso = new Date().toISOString();
    const closure: DayClosure = {
      id: generateId('close'),
      shiftId: state.settings.currentShiftId,
      openedAt: state.settings.currentShiftOpenedAt,
      closedAt: nowIso,
      openingCash: summary.openingCash,
      cashSales: summary.cashSales,
      vodafoneSales: summary.vodafoneSales,
      instapaySales: summary.instapaySales,
      creditSalesTotal: summary.creditSalesTotal,
      creditDownPaymentsCash: summary.creditDownPaymentsCash,
      creditDownPaymentsWallet: summary.creditDownPaymentsWallet,
      creditCashCollections: summary.creditCashCollections,
      creditWalletCollections: summary.creditWalletCollections,
      totalExpenses: summary.totalExpenses,
      expectedDrawerCash: summary.expectedDrawerCash,
      actualDrawerCash: Number(actualDrawerCash.toFixed(2)),
      drawerDiff: Number((actualDrawerCash - summary.expectedDrawerCash).toFixed(2)),
      totalSales: summary.totalSales,
      totalCost: summary.totalCost,
      estimatedProfit: summary.estimatedProfit,
      salesCount: summary.salesCount,
      expensesCount: summary.expensesCount,
      categoryBreakdown: summary.categoryBreakdown,
      notes: notes?.trim() || undefined,
    };

    setState((prev) => ({
      ...prev,
      closures: [closure, ...prev.closures],
      settings: {
        ...prev.settings,
        openingCash: Math.max(0, Number(nextOpeningCash.toFixed(2))),
        currentShiftId: `shift_${Date.now().toString(36)}`,
        currentShiftOpenedAt: nowIso,
      },
    }));

    return closure;
  };

  // --- CATEGORIES & PRODUCTS CRUD ---
  const addCategory = (name: string, mode: Category['mode']): Category => {
    const newCat: Category = {
      id: generateId('cat'),
      name: name.trim(),
      mode,
      order: state.categories.length + 1,
    };
    setState((prev) => ({
      ...prev,
      categories: [...prev.categories, newCat],
    }));
    return newCat;
  };

  const updateCategory = (id: string, updates: Partial<Pick<Category, 'name' | 'mode' | 'order'>>) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  };

  const moveCategoryOrder = (id: string, direction: 'up' | 'down') => {
    setState((prev) => {
      const sorted = [...prev.categories].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev;
      const reordered = [...sorted];
      [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
      const normalized = reordered.map((c, i) => ({ ...c, order: i + 1 }));
      return { ...prev, categories: normalized };
    });
  };

  const deleteCategory = (id: string) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
      products: prev.products.filter((p) => p.categoryId !== id),
    }));
  };

  const addProduct = (product: Omit<Product, 'id'>): Product => {
    const sameCatCount = state.products.filter((p) => p.categoryId === product.categoryId).length;
    const created: Product = {
      ...product,
      order: typeof product.order === 'number' ? product.order : sameCatCount + 1,
      id: generateId('prod'),
    };
    setState((prev) => ({
      ...prev,
      products: [...prev.products, created],
    }));
    return created;
  };

  const updateProduct = (id: string, updates: Partial<Omit<Product, 'id'>>) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  };

  const moveProductOrder = (id: string, direction: 'up' | 'down') => {
    setState((prev) => {
      const target = prev.products.find((p) => p.id === id);
      if (!target) return prev;
      const siblings = prev.products
        .filter((p) => p.categoryId === target.categoryId)
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      const idx = siblings.findIndex((p) => p.id === id);
      if (idx < 0) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= siblings.length) return prev;
      const reordered = [...siblings];
      [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
      const orderMap = new Map<string, number>();
      reordered.forEach((p, i) => orderMap.set(p.id, i + 1));
      return {
        ...prev,
        products: prev.products.map((p) =>
          orderMap.has(p.id) ? { ...p, order: orderMap.get(p.id) } : p
        ),
      };
    });
  };

  const deleteProduct = (id: string) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
    }));
  };

  // --- SETTINGS & ADMIN AUTH ---
  const verifyAdminLogin = (username: string, password: string): boolean => {
    const ok =
      username.trim().toLowerCase() === state.settings.adminUsername.trim().toLowerCase() &&
      password === state.settings.adminPassword;
    if (ok) setIsAdminUnlocked(true);
    return ok;
  };

  const lockAdmin = () => setIsAdminUnlocked(false);

  const updateSettings = (updates: Partial<ShopSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
    }));
  };

  const exportBackupJson = (): string => {
    return JSON.stringify(state, null, 2);
  };

  const importBackupJson = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString) as PosState;
      if (!parsed || !Array.isArray(parsed.categories) || !Array.isArray(parsed.products) || !parsed.settings) {
        return false;
      }
      setState(parsed);
      return true;
    } catch {
      return false;
    }
  };

  const resetAllData = () => {
    const fresh = createDefaultPosState();
    setState(fresh);
  };

  return {
    state,
    currentShiftSummary,
    isAdminUnlocked,
    verifyAdminLogin,
    lockAdmin,
    completeSale,
    voidSale,
    restockCoffeeKg,
    setCoffeeStockKg,
    restockFridgePacks,
    restockFridgeUnits,
    applyFridgeAudit,
    adjustPlasticCups,
    addExpense,
    deleteExpense,
    addExpenseCategory,
    removeExpenseCategory,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addManualCreditCharge,
    recordCreditPayment,
    setOpeningCash,
    closeCurrentDay,
    addCategory,
    updateCategory,
    moveCategoryOrder,
    deleteCategory,
    addProduct,
    updateProduct,
    moveProductOrder,
    deleteProduct,
    updateSettings,
    exportBackupJson,
    importBackupJson,
    resetAllData,
  };
}
