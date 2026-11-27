import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  Lock,
  Minus,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Unlock,
  Upload,
} from 'lucide-react';
import {
  Category,
  CategoryMode,
  DayClosure,
  PosState,
  Product,
  SaleRecord,
  ShopSettings,
} from '../types';
import {
  formatCurrency,
  formatDateTime,
  formatStockKg,
  formatWeightGrams,
  paymentMethodLabel,
} from '../utils/format';
import { CategoryEditorModal } from './CategoryEditorModal';
import { PeriodReportPrintData } from './ReceiptPrintView';
import { SalesTrendCharts } from './SalesTrendCharts';

interface Props {
  state: PosState;
  isAdminUnlocked: boolean;
  onVerifyAdmin: (username: string, password: string) => boolean;
  onLockAdmin: () => void;
  onAddCategory: (name: string, mode: CategoryMode) => Category;
  onUpdateCategory: (id: string, updates: Partial<Pick<Category, 'name' | 'mode' | 'order'>>) => void;
  onMoveCategoryOrder: (id: string, direction: 'up' | 'down') => void;
  onDeleteCategory: (id: string) => void;
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (id: string, updates: Partial<Omit<Product, 'id'>>) => void;
  onMoveProductOrder: (id: string, direction: 'up' | 'down') => void;
  onDeleteProduct: (id: string) => void;
  onRestockCoffeeKg: (productId: string, deltaKg: number) => void;
  onSetCoffeeStockKg: (productId: string, exactKg: number) => void;
  onVoidSale: (saleId: string) => void;
  onUpdateSettings: (updates: Partial<ShopSettings>) => void;
  onExportBackup: () => string;
  onImportBackup: (json: string) => boolean;
  onResetAllData: () => void;
  onPrintSale: (sale: SaleRecord) => void;
  onPrintClosure: (closure: DayClosure) => void;
  onPrintPeriodReport: (report: PeriodReportPrintData) => void;
}

type AdminTab = 'reports' | 'coffee_stock' | 'catalog' | 'history' | 'settings';
type ReportPeriod = 'daily' | 'weekly' | 'semimonthly' | 'monthly' | 'all';
type SemiMonthMode = 'last15' | 'firstHalf' | 'secondHalf';

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toLocalMonthStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export const AdminView: React.FC<Props> = ({
  state,
  isAdminUnlocked,
  onVerifyAdmin,
  onLockAdmin,
  onAddCategory,
  onUpdateCategory,
  onMoveCategoryOrder,
  onDeleteCategory,
  onAddProduct,
  onUpdateProduct,
  onMoveProductOrder,
  onDeleteProduct,
  onRestockCoffeeKg,
  onSetCoffeeStockKg,
  onVoidSale,
  onUpdateSettings,
  onExportBackup,
  onImportBackup,
  onResetAllData,
  onPrintSale,
  onPrintClosure,
  onPrintPeriodReport,
}) => {
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const [adminTab, setAdminTab] = useState<AdminTab>('reports');

  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() => toLocalDateStr(new Date()));
  const [semiMode, setSemiMode] = useState<SemiMonthMode>('last15');
  const [selectedMonthStr, setSelectedMonthStr] = useState<string>(() =>
    toLocalMonthStr(new Date())
  );

  // Catalog drafts (inline price, cost, min stock)
  const [newCatName, setNewCatName] = useState('');
  const [newCatMode, setNewCatMode] = useState<CategoryMode>('drink');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [quickPrices, setQuickPrices] = useState<Record<string, string>>({});
  const [quickCosts, setQuickCosts] = useState<Record<string, string>>({});
  const [quickMinStocks, setQuickMinStocks] = useState<Record<string, string>>({});

  // Coffee stock management drafts
  const [coffeeCostDrafts, setCoffeeCostDrafts] = useState<Record<string, string>>({});
  const [coffeePriceDrafts, setCoffeePriceDrafts] = useState<Record<string, string>>({});
  const [coffeeStockDrafts, setCoffeeStockDrafts] = useState<Record<string, string>>({});
  const [coffeeMinDrafts, setCoffeeMinDrafts] = useState<Record<string, string>>({});
  const [coffeeDeltaInputs, setCoffeeDeltaInputs] = useState<Record<string, string>>({});

  // Quick add coffee bean form
  const weightCategories = useMemo(
    () =>
      state.categories
        .filter((c) => c.mode === 'weight')
        .sort((a, b) => a.order - b.order),
    [state.categories]
  );
  const [newCoffeeCatId, setNewCoffeeCatId] = useState<string>('');
  const [newCoffeeName, setNewCoffeeName] = useState('');
  const [newCoffeeCost, setNewCoffeeCost] = useState('');
  const [newCoffeePrice, setNewCoffeePrice] = useState('');
  const [newCoffeeKg, setNewCoffeeKg] = useState('10');
  const [newCoffeeMinKg, setNewCoffeeMinKg] = useState('3');

  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [historySubTab, setHistorySubTab] = useState<'sales' | 'closures'>('sales');

  const [shopName, setShopName] = useState(state.settings.shopName);
  const [shopSubtitle, setShopSubtitle] = useState(state.settings.shopSubtitle);
  const [phone, setPhone] = useState(state.settings.phone);
  const [receiptFooter, setReceiptFooter] = useState(state.settings.receiptFooter);
  const [minPlasticCupsStr, setMinPlasticCupsStr] = useState(String(state.settings.minPlasticCups));
  const [newAdminUser, setNewAdminUser] = useState(state.settings.adminUsername);
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(
    null
  );
  const [confirmReset, setConfirmReset] = useState(false);

  const flash = (text: string, isError = false) => {
    setStatusMessage({ text, isError });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date;
    let title = '';
    let rangeLabel = '';

    if (period === 'daily') {
      const [y, m, d] = selectedDayStr.split('-').map(Number);
      start = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
      end = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
      title = 'تقرير الحسابات اليومية';
      rangeLabel = selectedDayStr;
    } else if (period === 'weekly') {
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      title = 'تقرير الحسابات الأسبوعية (آخر 7 أيام)';
      rangeLabel = `${toLocalDateStr(start)} إلى ${toLocalDateStr(end)}`;
    } else if (period === 'semimonthly') {
      if (semiMode === 'firstHalf') {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59, 999);
        title = 'تقرير النصف الأول من الشهر (1 – 15)';
      } else if (semiMode === 'secondHalf') {
        start = new Date(now.getFullYear(), now.getMonth(), 16, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        title = 'تقرير النصف الثاني من الشهر (16 – آخر الشهر)';
      } else {
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14, 0, 0, 0, 0);
        title = 'تقرير الحسابات النصف شهرية (آخر 15 يوم)';
      }
      rangeLabel = `${toLocalDateStr(start)} إلى ${toLocalDateStr(end)}`;
    } else if (period === 'monthly') {
      const [y, m] = selectedMonthStr.split('-').map(Number);
      start = new Date(y, (m || 1) - 1, 1, 0, 0, 0, 0);
      end = new Date(y, m || 1, 0, 23, 59, 59, 999);
      title = 'تقرير الحسابات الشهرية';
      rangeLabel = `${toLocalDateStr(start)} إلى ${toLocalDateStr(end)}`;
    } else {
      start = new Date(2000, 0, 1);
      end = new Date(2100, 0, 1);
      title = 'التقرير المالي الشامل (كل الفترات)';
      rangeLabel = 'منذ بداية التشغيل';
    }

    return { startMs: start.getTime(), endMs: end.getTime(), title, rangeLabel };
  }, [period, selectedDayStr, semiMode, selectedMonthStr]);

  const analytics = useMemo(() => {
    const inRange = (iso: string) => {
      const ms = new Date(iso).getTime();
      return ms >= dateRange.startMs && ms <= dateRange.endMs;
    };

    const periodSales = state.sales.filter((s) => !s.voided && inRange(s.timestamp));
    const periodVoidedCount = state.sales.filter((s) => s.voided && inRange(s.timestamp)).length;
    const periodExpenses = state.expenses.filter((e) => inRange(e.timestamp));
    const periodCreditPayments = state.creditTransactions.filter(
      (t) => t.type === 'payment' && inRange(t.timestamp)
    );
    const periodClosures = state.closures.filter((c) => inRange(c.closedAt));

    let totalSales = 0;
    let totalCost = 0;
    let cashSales = 0;
    let vodafoneSales = 0;
    let instapaySales = 0;
    let creditNew = 0;
    let creditDownCash = 0;
    let creditDownWallet = 0;

    const catStats = new Map<
      string,
      { name: string; mode: CategoryMode; revenue: number; cost: number; grams: number; units: number }
    >();
    const prodStats = new Map<
      string,
      { name: string; mode: CategoryMode; revenue: number; profit: number; grams: number; units: number }
    >();

    const catLookup = new Map<string, Category>();
    state.categories.forEach((c) => catLookup.set(c.id, c));

    for (const sale of periodSales) {
      totalSales += sale.total;
      totalCost += sale.totalCost;

      if (sale.paymentMethod === 'cash') cashSales += sale.total;
      else if (sale.paymentMethod === 'vodafone') vodafoneSales += sale.total;
      else if (sale.paymentMethod === 'instapay') instapaySales += sale.total;
      else if (sale.paymentMethod === 'credit') {
        creditNew += sale.creditRemaining;
        if (sale.paidNow > 0) {
          if (sale.downPaymentMethod === 'vodafone' || sale.downPaymentMethod === 'instapay') {
            creditDownWallet += sale.paidNow;
          } else {
            creditDownCash += sale.paidNow;
          }
        }
      }

      for (const item of sale.items) {
        const cat = catLookup.get(item.categoryId);
        const catKey = item.categoryId;
        const prevCat = catStats.get(catKey) || {
          name: cat?.name || 'أخرى',
          mode: item.mode,
          revenue: 0,
          cost: 0,
          grams: 0,
          units: 0,
        };
        prevCat.revenue += item.lineTotal;
        prevCat.cost += item.costTotal;
        if (item.mode === 'weight' && item.weightGrams) {
          prevCat.grams += item.weightGrams * item.qty;
        } else {
          prevCat.units += item.qty;
        }
        catStats.set(catKey, prevCat);

        const prevProd = prodStats.get(item.productId) || {
          name: item.name,
          mode: item.mode,
          revenue: 0,
          profit: 0,
          grams: 0,
          units: 0,
        };
        prevProd.revenue += item.lineTotal;
        prevProd.profit += item.lineTotal - item.costTotal;
        if (item.mode === 'weight' && item.weightGrams) {
          prevProd.grams += item.weightGrams * item.qty;
        } else {
          prevProd.units += item.qty;
        }
        prodStats.set(item.productId, prevProd);
      }
    }

    let creditCollectionsCash = 0;
    let creditCollectionsWallet = 0;
    for (const p of periodCreditPayments) {
      if (p.paymentMethod === 'vodafone' || p.paymentMethod === 'instapay') {
        creditCollectionsWallet += p.amount;
      } else {
        creditCollectionsCash += p.amount;
      }
    }

    const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
    const expenseByCatMap = new Map<string, number>();
    for (const e of periodExpenses) {
      expenseByCatMap.set(e.category, (expenseByCatMap.get(e.category) || 0) + e.amount);
    }
    const expenseRows = Array.from(expenseByCatMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    const grossProfit = totalSales - totalCost;
    const netProfit = grossProfit - totalExpenses;
    const grossMarginPct = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
    const netMarginPct = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
    const avgTicket = periodSales.length > 0 ? totalSales / periodSales.length : 0;
    const netCashFlow = cashSales + creditDownCash + creditCollectionsCash - totalExpenses;
    const totalWalletsInflow =
      vodafoneSales + instapaySales + creditDownWallet + creditCollectionsWallet;
    const totalDrawerVariance = periodClosures.reduce((sum, c) => sum + c.drawerDiff, 0);

    const categoryRows = Array.from(catStats.values())
      .map((c) => ({
        name: c.name,
        revenue: c.revenue,
        cost: c.cost,
        profit: c.revenue - c.cost,
        sharePct: totalSales > 0 ? (c.revenue / totalSales) * 100 : 0,
        qtyLabel: c.mode === 'weight' ? formatWeightGrams(c.grams) : `${c.units} قطعة / كوب`,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const topProducts = Array.from(prodStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    let coffeeStockCostValue = 0;
    let coffeeStockSaleValue = 0;
    let coffeeTotalKg = 0;
    let fridgeStockCostValue = 0;
    let fridgeStockSaleValue = 0;
    let fridgeTotalUnits = 0;

    for (const p of state.products) {
      const cat = catLookup.get(p.categoryId);
      if (cat?.mode === 'weight') {
        const kg = p.stockKg || 0;
        coffeeTotalKg += kg;
        coffeeStockCostValue += kg * p.costPrice;
        coffeeStockSaleValue += kg * p.price;
      } else if (cat?.mode === 'fridge' && !p.isIceCup) {
        const units = p.stockUnits || 0;
        fridgeTotalUnits += units;
        fridgeStockCostValue += units * p.costPrice;
        fridgeStockSaleValue += units * p.price;
      }
    }

    const totalReceivables = state.customers.reduce((sum, c) => sum + c.balance, 0);

    return {
      salesCount: periodSales.length,
      voidedCount: periodVoidedCount,
      expensesCount: periodExpenses.length,
      closuresCount: periodClosures.length,
      totalSales,
      totalCost,
      grossProfit,
      totalExpenses,
      netProfit,
      grossMarginPct,
      netMarginPct,
      avgTicket,
      cashSales,
      vodafoneSales,
      instapaySales,
      creditNew,
      creditDownCash,
      creditDownWallet,
      creditCollectionsCash,
      creditCollectionsWallet,
      netCashFlow,
      totalWalletsInflow,
      totalDrawerVariance,
      categoryRows,
      expenseRows,
      topProducts,
      coffeeTotalKg,
      coffeeStockCostValue,
      coffeeStockSaleValue,
      fridgeTotalUnits,
      fridgeStockCostValue,
      fridgeStockSaleValue,
      totalInventoryCost: coffeeStockCostValue + fridgeStockCostValue,
      totalInventorySale: coffeeStockSaleValue + fridgeStockSaleValue,
      totalReceivables,
    };
  }, [state, dateRange]);

  const coffeeProducts = useMemo(() => {
    const weightCatOrder = new Map<string, number>();
    weightCategories.forEach((c) => weightCatOrder.set(c.id, c.order));
    return state.products
      .filter((p) => weightCatOrder.has(p.categoryId))
      .sort((a, b) => {
        const catDiff = (weightCatOrder.get(a.categoryId) ?? 999) - (weightCatOrder.get(b.categoryId) ?? 999);
        if (catDiff !== 0) return catDiff;
        return (a.order ?? 999) - (b.order ?? 999);
      });
  }, [state.products, weightCategories]);

  const lowCoffeeCount = useMemo(
    () => coffeeProducts.filter((p) => (p.stockKg ?? 0) <= (p.minStockKg ?? 3)).length,
    [coffeeProducts]
  );

  const filteredSalesHistory = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase();
    if (!q) return state.sales;
    return state.sales.filter(
      (s) =>
        String(s.receiptNo).includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        s.items.some((i) => i.name.toLowerCase().includes(q))
    );
  }, [state.sales, invoiceSearch]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (onVerifyAdmin(loginUser, loginPass)) {
      setLoginError('');
      setLoginUser('');
      setLoginPass('');
    } else {
      setLoginError('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  };

  if (!isAdminUnlocked) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
          <div className="w-10 h-10 rounded-lg bg-stone-900 dark:bg-amber-600 text-amber-400 dark:text-stone-950 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">دخول قسم الإدارة</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              الحسابات اليومية والأسبوعية والشهرية والتحكم الكامل في الأسعار والفئات
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              اسم المستخدم
            </label>
            <input
              type="text"
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              placeholder="اكتب اسم المستخدم"
              className="w-full h-11 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3.5 text-sm focus:border-amber-600 focus:outline-none"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              كلمة المرور
            </label>
            <input
              type="password"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              placeholder="اكتب كلمة المرور"
              className="w-full h-11 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3.5 text-sm focus:border-amber-600 focus:outline-none"
              required
            />
          </div>

          {loginError && <p className="text-xs font-semibold text-red-600 dark:text-red-400">{loginError}</p>}

          <button
            type="submit"
            className="w-full h-11 rounded-lg bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-500 text-white dark:text-stone-950 text-sm font-bold transition-colors cursor-pointer"
          >
            دخول الإدارة
          </button>
        </form>

        {!state.settings.adminConfigured && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <strong>الدخول لأول مرة:</strong> اسم المستخدم الافتراضي{' '}
            <code className="font-num font-bold">admin</code> وكلمة المرور{' '}
            <code className="font-num font-bold">1234</code>. بعد الدخول يمكنك تغييرهما فوراً إلى
            بياناتك الخاصة من تبويب «الأمان وإعدادات المحل».
          </div>
        )}
      </div>
    );
  }

  const editingCategory = state.categories.find((c) => c.id === editingCategoryId) || null;

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUser.trim() || !newAdminPass) {
      flash('يرجى إدخال اسم المستخدم وكلمة المرور الجديدة', true);
      return;
    }
    if (newAdminPass !== confirmAdminPass) {
      flash('كلمتا المرور غير متطابقتين', true);
      return;
    }
    onUpdateSettings({
      adminUsername: newAdminUser.trim(),
      adminPassword: newAdminPass,
      adminConfigured: true,
    });
    setNewAdminPass('');
    setConfirmAdminPass('');
    flash('تم تحديث اسم المستخدم وكلمة مرور الإدارة بنجاح');
  };

  const handleSaveShopInfo = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMinCups = Math.max(0, Math.round(Number(minPlasticCupsStr) || 0));
    onUpdateSettings({
      shopName: shopName.trim() || state.settings.shopName,
      shopSubtitle: shopSubtitle.trim(),
      phone: phone.trim(),
      receiptFooter: receiptFooter.trim(),
      minPlasticCups: parsedMinCups,
    });
    flash('تم حفظ بيانات المحل وتنسيق الفاتورة وإعدادات التنبيه');
  };

  const handleDownloadBackup = () => {
    const json = onExportBackup();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bunn-esketto-backup-${toLocalDateStr(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('تم تنزيل ملف النسخة الاحتياطية على جهازك');
  };

  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = onImportBackup(String(reader.result || ''));
      if (ok) flash('تمت استعادة النسخة الاحتياطية بنجاح');
      else flash('ملف النسخة الاحتياطية غير صالح', true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'reports', label: 'الحسابات والتقارير' },
              { id: 'coffee_stock', label: 'مخزن البن (الأسعار والكميات)' },
              { id: 'catalog', label: 'إدارة الفئات والأسعار والترتيب' },
              { id: 'history', label: 'سجل الفواتير والتقفيلات' },
              { id: 'settings', label: 'الأمان وإعدادات المحل' },
            ] as { id: AdminTab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAdminTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                adminTab === t.id
                  ? 'bg-stone-900 dark:bg-amber-600 text-white dark:text-stone-950'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              <span>{t.label}</span>
              {t.id === 'coffee_stock' && lowCoffeeCount > 0 && (
                <AlertTriangle
                  className={`w-3.5 h-3.5 shrink-0 ${
                    adminTab === 'coffee_stock'
                      ? 'text-red-300 dark:text-red-950'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                />
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onLockAdmin}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/50 cursor-pointer whitespace-nowrap"
        >
          <Unlock className="w-3.5 h-3.5" />
          <span>قفل الإدارة الآن</span>
        </button>
      </div>

      {statusMessage && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold ${
            statusMessage.isError
              ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300'
              : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* TAB 1: FINANCIAL REPORTS */}
      {adminTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'daily', label: 'حسابات اليوم' },
                  { id: 'weekly', label: 'حسابات الأسبوع' },
                  { id: 'semimonthly', label: 'حسابات نص الشهر (15 يوم)' },
                  { id: 'monthly', label: 'حسابات الشهر' },
                  { id: 'all', label: 'الإجمالي الكلي' },
                ] as { id: ReportPeriod; label: string }[]
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                    period === p.id
                      ? 'bg-amber-700 dark:bg-amber-600 border-amber-700 dark:border-amber-600 text-white dark:text-stone-950'
                      : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {period === 'daily' && (
                <input
                  type="date"
                  value={selectedDayStr}
                  onChange={(e) => setSelectedDayStr(e.target.value)}
                  className="rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-1.5 text-xs font-num font-semibold"
                />
              )}
              {period === 'semimonthly' && (
                <select
                  value={semiMode}
                  onChange={(e) => setSemiMode(e.target.value as SemiMonthMode)}
                  className="rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-1.5 text-xs font-semibold"
                >
                  <option value="last15">آخر 15 يوم</option>
                  <option value="firstHalf">النصف الأول (1 – 15)</option>
                  <option value="secondHalf">النصف الثاني (16 – آخر الشهر)</option>
                </select>
              )}
              {period === 'monthly' && (
                <input
                  type="month"
                  value={selectedMonthStr}
                  onChange={(e) => setSelectedMonthStr(e.target.value)}
                  className="rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-1.5 text-xs font-num font-semibold"
                />
              )}

              <button
                type="button"
                onClick={() =>
                  onPrintPeriodReport({
                    title: dateRange.title,
                    rangeLabel: dateRange.rangeLabel,
                    totalSales: analytics.totalSales,
                    salesCount: analytics.salesCount,
                    avgTicket: analytics.avgTicket,
                    totalCost: analytics.totalCost,
                    grossProfit: analytics.grossProfit,
                    totalExpenses: analytics.totalExpenses,
                    netProfit: analytics.netProfit,
                    cashSales: analytics.cashSales,
                    vodafoneSales: analytics.vodafoneSales,
                    instapaySales: analytics.instapaySales,
                    creditNew: analytics.creditNew,
                    creditCollectionsCash: analytics.creditCollectionsCash,
                    creditCollectionsWallet: analytics.creditCollectionsWallet,
                    netCashFlow: analytics.netCashFlow,
                    categoryRows: analytics.categoryRows,
                    expenseRows: analytics.expenseRows,
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 text-xs font-bold hover:bg-stone-800 dark:hover:bg-white cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة التقرير</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-stone-500 dark:text-stone-400">
            <span className="font-bold text-stone-800 dark:text-stone-100 text-sm">{dateRange.title}</span>
            <span className="font-num">
              النطاق الزمني: {dateRange.rangeLabel} · {analytics.salesCount} فاتورة مكتملة
              {analytics.voidedCount > 0 ? ` · ${analytics.voidedCount} ملغاة` : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">إجمالي المبيعات</div>
              <div className="text-xl font-bold font-num text-stone-900 dark:text-stone-100 mt-1">
                {formatCurrency(analytics.totalSales)}
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-num">
                متوسط الفاتورة: {formatCurrency(analytics.avgTicket)}
              </div>
            </div>

            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                تكلفة البضاعة المباعة
              </div>
              <div className="text-xl font-bold font-num text-stone-800 dark:text-stone-200 mt-1">
                {formatCurrency(analytics.totalCost)}
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-num">
                تكلفة الخامات والبن والتلاجة
              </div>
            </div>

            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">مجمل الربح</div>
              <div className="text-xl font-bold font-num text-stone-900 dark:text-stone-100 mt-1">
                {formatCurrency(analytics.grossProfit)}
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-num">
                هامش الربح: {analytics.grossMarginPct.toFixed(1)}%
              </div>
            </div>

            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">إجمالي المصروفات</div>
              <div className="text-xl font-bold font-num text-red-700 dark:text-red-400 mt-1">
                -{formatCurrency(analytics.totalExpenses)}
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-num">
                {analytics.expensesCount} بند مصروفات
              </div>
            </div>

            <div className="bg-stone-900 border border-stone-800 dark:border-emerald-800/70 text-white rounded-xl p-4">
              <div className="text-xs font-semibold text-stone-300">صافي الربح الحقيقي</div>
              <div
                className={`text-xl font-bold font-num mt-1 ${
                  analytics.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {formatCurrency(analytics.netProfit)}
              </div>
              <div className="text-xs text-stone-400 mt-1 font-num">
                نسبة الصافي: {analytics.netMarginPct.toFixed(1)}%
              </div>
            </div>
          </div>

          <SalesTrendCharts
            sales={state.sales}
            expenses={state.expenses}
            selectedDayStr={selectedDayStr}
            periodStartMs={dateRange.startMs}
            periodEndMs={dateRange.endMs}
            periodLabel={dateRange.rangeLabel}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 border-b border-stone-200 dark:border-stone-800 pb-2.5">
                التدفقات النقدية وتفصيل طرق التحصيل خلال الفترة
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">مبيعات كاش مباشرة</span>
                  <span className="font-num font-bold text-stone-900 dark:text-stone-100">
                    {formatCurrency(analytics.cashSales)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">مبيعات فودافون كاش</span>
                  <span className="font-num font-semibold text-stone-900 dark:text-stone-100">
                    {formatCurrency(analytics.vodafoneSales)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">مبيعات إنستا باي</span>
                  <span className="font-num font-semibold text-stone-900 dark:text-stone-100">
                    {formatCurrency(analytics.instapaySales)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">
                    مبيعات آجل جديدة (مضافة على العملاء)
                  </span>
                  <span className="font-num font-semibold text-amber-800 dark:text-amber-400">
                    {formatCurrency(analytics.creditNew)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">
                    مقدمات آجل + تحصيلات آجل (كاش)
                  </span>
                  <span className="font-num font-semibold text-emerald-700 dark:text-emerald-400">
                    +{formatCurrency(analytics.creditDownCash + analytics.creditCollectionsCash)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">
                    مقدمات آجل + تحصيلات آجل (محافظ)
                  </span>
                  <span className="font-num font-semibold text-emerald-700 dark:text-emerald-400">
                    +{formatCurrency(analytics.creditDownWallet + analytics.creditCollectionsWallet)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-700 dark:text-red-400">المصروفات النقدية المخصومة</span>
                  <span className="font-num font-bold text-red-700 dark:text-red-400">
                    -{formatCurrency(analytics.totalExpenses)}
                  </span>
                </div>
                <div className="flex justify-between pt-2.5 border-t border-stone-200 dark:border-stone-800 font-bold text-stone-900 dark:text-stone-100">
                  <span>صافي الكاش الداخل للخزينة بعد المصروفات</span>
                  <span className="font-num text-amber-800 dark:text-amber-400">
                    {formatCurrency(analytics.netCashFlow)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400">
                  <span>إجمالي الداخل على المحافظ (فودافون + إنستا باي)</span>
                  <span className="font-num font-semibold text-stone-800 dark:text-stone-200">
                    {formatCurrency(analytics.totalWalletsInflow)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400">
                  <span>مجموع فروق الجرد في تقفيلات الفترة ({analytics.closuresCount} تقفيلة)</span>
                  <span
                    className={`font-num font-semibold ${
                      analytics.totalDrawerVariance < 0
                        ? 'text-red-600 dark:text-red-400'
                        : analytics.totalDrawerVariance > 0
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {analytics.totalDrawerVariance >= 0
                      ? `+${formatCurrency(analytics.totalDrawerVariance)}`
                      : formatCurrency(analytics.totalDrawerVariance)}
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 border-b border-stone-200 dark:border-stone-800 pb-2.5">
                الموقف المالي العام للمحل (قيمة المخزون ورأس المال الآن)
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400">
                    مخزون البن الحالي ({formatStockKg(analytics.coffeeTotalKg)}) — بالتكلفة
                  </span>
                  <span className="font-num font-bold text-stone-900 dark:text-stone-100">
                    {formatCurrency(analytics.coffeeStockCostValue)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400">
                  <span>القيمة البيعية لمخزون البن</span>
                  <span className="font-num">{formatCurrency(analytics.coffeeStockSaleValue)}</span>
                </div>

                <div className="flex justify-between pt-1">
                  <span className="text-stone-600 dark:text-stone-400">
                    مخزون التلاجة الحالي ({analytics.fridgeTotalUnits} قطعة) — بالتكلفة
                  </span>
                  <span className="font-num font-bold text-stone-900 dark:text-stone-100">
                    {formatCurrency(analytics.fridgeStockCostValue)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400">
                  <span>القيمة البيعية لمخزون التلاجة</span>
                  <span className="font-num">{formatCurrency(analytics.fridgeStockSaleValue)}</span>
                </div>

                <div className="flex justify-between pt-2 border-t border-stone-200 dark:border-stone-800 font-bold text-stone-900 dark:text-stone-100">
                  <span>إجمالي رأس المال في البضاعة (بسعر التكلفة)</span>
                  <span className="font-num">{formatCurrency(analytics.totalInventoryCost)}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                  <span>الربح المتوقع من بيع المخزون الحالي بالكامل</span>
                  <span className="font-num">
                    {formatCurrency(analytics.totalInventorySale - analytics.totalInventoryCost)}
                  </span>
                </div>

                <div className="flex justify-between pt-2 border-t border-stone-200 dark:border-stone-800 font-bold">
                  <span className="text-amber-900 dark:text-amber-300">
                    إجمالي الفلوس المستحقة بره (دفتر الآجل)
                  </span>
                  <span className="font-num text-amber-800 dark:text-amber-400">
                    {formatCurrency(analytics.totalReceivables)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400">
                  <span>إجمالي الأصول المتداولة (بضاعة بالتكلفة + مستحقات الآجل)</span>
                  <span className="font-num font-bold text-stone-900 dark:text-stone-100">
                    {formatCurrency(analytics.totalInventoryCost + analytics.totalReceivables)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                أداء المبيعات والأرباح حسب كل فئة
              </h3>
            </div>
            {analytics.categoryRows.length === 0 ? (
              <div className="py-10 text-center text-xs text-stone-400 dark:text-stone-500">
                لا توجد مبيعات مسجلة في هذه الفترة حتى الآن
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-stone-800 text-xs text-stone-500 dark:text-stone-400 bg-stone-50/50 dark:bg-stone-950/40">
                      <th className="text-right py-2.5 px-4 font-semibold">الفئة</th>
                      <th className="text-right py-2.5 px-4 font-semibold">الكمية / الوزن المباع</th>
                      <th className="text-left py-2.5 px-4 font-semibold">المبيعات</th>
                      <th className="text-left py-2.5 px-4 font-semibold">التكلفة</th>
                      <th className="text-left py-2.5 px-4 font-semibold">الربح</th>
                      <th className="text-left py-2.5 px-4 font-semibold">نسبة المساهمة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {analytics.categoryRows.map((row) => (
                      <tr key={row.name} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                        <td className="py-2.5 px-4 font-bold text-stone-900 dark:text-stone-100">
                          {row.name}
                        </td>
                        <td className="py-2.5 px-4 text-xs font-num text-stone-600 dark:text-stone-400">
                          {row.qtyLabel}
                        </td>
                        <td className="py-2.5 px-4 text-left font-num font-bold text-stone-900 dark:text-stone-100">
                          {formatCurrency(row.revenue)}
                        </td>
                        <td className="py-2.5 px-4 text-left font-num text-stone-600 dark:text-stone-400">
                          {formatCurrency(row.cost)}
                        </td>
                        <td className="py-2.5 px-4 text-left font-num font-bold text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(row.profit)}
                        </td>
                        <td className="py-2.5 px-4 text-left font-num text-xs text-stone-500 dark:text-stone-400">
                          {row.sharePct.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  تفصيل المصروفات في هذه الفترة
                </h3>
              </div>
              {analytics.expenseRows.length === 0 ? (
                <div className="py-10 text-center text-xs text-stone-400 dark:text-stone-500">
                  لا توجد مصروفات مسجلة في هذه الفترة
                </div>
              ) : (
                <div className="divide-y divide-stone-100 dark:divide-stone-800">
                  {analytics.expenseRows.map((row) => {
                    const pct =
                      analytics.totalExpenses > 0
                        ? (row.amount / analytics.totalExpenses) * 100
                        : 0;
                    return (
                      <div key={row.category} className="px-4 py-2.5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {row.category}
                        </span>
                        <div className="flex items-center gap-3 font-num">
                          <span className="text-stone-400 dark:text-stone-500">{pct.toFixed(0)}%</span>
                          <span className="font-bold text-red-700 dark:text-red-400">
                            {formatCurrency(row.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  الأصناف الأكثر مبيعاً في الفترة
                </h3>
              </div>
              {analytics.topProducts.length === 0 ? (
                <div className="py-10 text-center text-xs text-stone-400 dark:text-stone-500">
                  لا توجد مبيعات أصناف بعد
                </div>
              ) : (
                <div className="divide-y divide-stone-100 dark:divide-stone-800">
                  {analytics.topProducts.map((p, idx) => (
                    <div key={p.name} className="px-4 py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-num text-stone-400 dark:text-stone-500 w-4">{idx + 1}.</span>
                        <span className="font-bold text-stone-900 dark:text-stone-100">{p.name}</span>
                        <span className="text-stone-500 dark:text-stone-400 font-num">
                          · {p.mode === 'weight' ? formatWeightGrams(p.grams) : `${p.units}×`}
                        </span>
                      </div>
                      <div className="font-num font-bold text-stone-900 dark:text-stone-100">
                        {formatCurrency(p.revenue)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COFFEE BEAN STOCK MANAGEMENT (EXCLUSIVE TO ADMIN) */}
      {adminTab === 'coffee_stock' && (
        <div className="space-y-4">
          {/* Coffee KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                إجمالي مخزون البن
              </div>
              <div className="text-xl font-bold font-num text-stone-900 dark:text-stone-100 mt-1">
                {formatStockKg(analytics.coffeeTotalKg)}
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-num">
                {coffeeProducts.length} صنف بن
              </div>
            </div>

            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                قيمة المخزون بسعر التكلفة
              </div>
              <div className="text-xl font-bold font-num text-stone-900 dark:text-stone-100 mt-1">
                {formatCurrency(analytics.coffeeStockCostValue)}
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                رأس المال الفعلي في المطحنة
              </div>
            </div>

            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                القيمة البيعية لمخزون البن
              </div>
              <div className="text-xl font-bold font-num text-amber-800 dark:text-amber-400 mt-1">
                {formatCurrency(analytics.coffeeStockSaleValue)}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-num font-semibold mt-1">
                ربح متوقع: {formatCurrency(analytics.coffeeStockSaleValue - analytics.coffeeStockCostValue)}
              </div>
            </div>

            <div
              className={`rounded-xl border p-4 ${
                lowCoffeeCount > 0
                  ? 'border-red-300 dark:border-red-800/80 bg-red-50/70 dark:bg-red-950/35'
                  : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
              }`}
            >
              <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                أصناف بن قاربت على النفاد
              </div>
              <div
                className={`text-xl font-bold font-num mt-1 ${
                  lowCoffeeCount > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {lowCoffeeCount} صنف
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                تظهر باللون الأحمر تلقائياً في شاشة البيع
              </div>
            </div>
          </div>

          {/* Quick Add New Coffee Bean Form */}
          {weightCategories.length > 0 && (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-3">
                إضافة صنف بن جديد للمخزن وشاشة البيع
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const catId = newCoffeeCatId || weightCategories[0]?.id;
                  const cleanName = newCoffeeName.trim();
                  const pCost = Number(newCoffeeCost || 0);
                  const pPrice = Number(newCoffeePrice);
                  const pKg = Math.max(0, Number(newCoffeeKg) || 0);
                  const pMin = Math.max(0, Number(newCoffeeMinKg) || 0);
                  if (!catId || !cleanName || !Number.isFinite(pPrice) || pPrice < 0) return;

                  onAddProduct({
                    categoryId: catId,
                    name: cleanName,
                    costPrice: Number((Number.isFinite(pCost) && pCost >= 0 ? pCost : 0).toFixed(2)),
                    price: Number(pPrice.toFixed(2)),
                    stockKg: pKg,
                    minStockKg: pMin,
                    roastLevels: ['فاتح', 'وسط', 'غامق'],
                    active: true,
                  });
                  setNewCoffeeName('');
                  setNewCoffeeCost('');
                  setNewCoffeePrice('');
                  setNewCoffeeKg('10');
                  setNewCoffeeMinKg('3');
                  flash(`تمت إضافة صنف البن «${cleanName}» بنجاح`);
                }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5 items-end"
              >
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    فئة البن
                  </label>
                  <select
                    value={newCoffeeCatId || weightCategories[0]?.id || ''}
                    onChange={(e) => setNewCoffeeCatId(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-2.5 py-2 text-xs font-semibold"
                  >
                    {weightCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    اسم الصنف
                  </label>
                  <input
                    type="text"
                    value={newCoffeeName}
                    onChange={(e) => setNewCoffeeName(e.target.value)}
                    placeholder="مثال: بن كولومبي مخصوص"
                    className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    سعر التكلفة / كجم
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={newCoffeeCost}
                    onChange={(e) => setNewCoffeeCost(e.target.value)}
                    placeholder="380"
                    className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-2.5 py-2 text-xs font-num"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    سعر البيع / كجم
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={newCoffeePrice}
                    onChange={(e) => setNewCoffeePrice(e.target.value)}
                    placeholder="520"
                    className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-2.5 py-2 text-xs font-num"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      الكمية (كجم)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={newCoffeeKg}
                      onChange={(e) => setNewCoffeeKg(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-2 py-2 text-xs font-num"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      حد التنبيه
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={newCoffeeMinKg}
                      onChange={(e) => setNewCoffeeMinKg(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-2 py-2 text-xs font-num"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="h-[34px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-500 text-white dark:text-stone-950 text-xs font-bold cursor-pointer whitespace-nowrap px-3"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة الصنف</span>
                </button>
              </form>
            </div>
          )}

          {/* Complete Coffee Stock Table */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                التحكم الكامل في مخزن البن (سعر التكلفة · سعر البيع · الكمية · حد التنبيه)
              </h3>
              <span className="text-xs text-stone-500 dark:text-stone-400">
                الخصم من الرصيد يتم تلقائياً بالجرام عند كل عملية بيع
              </span>
            </div>

            {coffeeProducts.length === 0 ? (
              <div className="py-12 text-center text-sm text-stone-500 dark:text-stone-400">
                لا توجد أصناف بن مسجلة حالياً
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 text-xs text-stone-500 dark:text-stone-400">
                      <th className="text-right py-3 px-4 font-semibold">الصنف والفئة</th>
                      <th className="text-center py-3 px-2.5 font-semibold">سعر التكلفة / كجم</th>
                      <th className="text-center py-3 px-2.5 font-semibold">سعر البيع / كجم</th>
                      <th className="text-center py-3 px-2.5 font-semibold">الربح / كجم</th>
                      <th className="text-center py-3 px-2.5 font-semibold">الكمية الحالية (كجم)</th>
                      <th className="text-center py-3 px-2.5 font-semibold">حد التنبيه (كجم)</th>
                      <th className="text-right py-3 px-3 font-semibold">توريد / خصم سريع</th>
                      <th className="text-center py-3 px-3 font-semibold">حفظ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {coffeeProducts.map((prod) => {
                      const cat = state.categories.find((c) => c.id === prod.categoryId);
                      const currentStock = prod.stockKg ?? 0;
                      const currentMin = prod.minStockKg ?? 3;
                      const isLow = currentStock <= currentMin;
                      const isOut = currentStock <= 0;

                      const costDraft = coffeeCostDrafts[prod.id] ?? String(prod.costPrice);
                      const priceDraft = coffeePriceDrafts[prod.id] ?? String(prod.price);
                      const stockDraft = coffeeStockDrafts[prod.id] ?? String(currentStock);
                      const minDraft = coffeeMinDrafts[prod.id] ?? String(currentMin);
                      const deltaDraft = coffeeDeltaInputs[prod.id] ?? '';

                      const parsedCost = Number(costDraft);
                      const parsedPrice = Number(priceDraft);
                      const parsedStock = Number(stockDraft);
                      const parsedMin = Number(minDraft);

                      const profitPerKg =
                        (Number.isFinite(parsedPrice) ? parsedPrice : prod.price) -
                        (Number.isFinite(parsedCost) ? parsedCost : prod.costPrice);

                      const hasEdits =
                        (costDraft !== '' && parsedCost !== prod.costPrice) ||
                        (priceDraft !== '' && parsedPrice !== prod.price) ||
                        (stockDraft !== '' && parsedStock !== currentStock) ||
                        (minDraft !== '' && parsedMin !== currentMin);

                      return (
                        <tr
                          key={prod.id}
                          className={
                            isLow
                              ? 'bg-red-50/50 dark:bg-red-950/25 hover:bg-red-50/80 dark:hover:bg-red-950/35'
                              : 'hover:bg-stone-50 dark:hover:bg-stone-800/40'
                          }
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              {isLow && (
                                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                              )}
                              <span className="font-bold text-stone-900 dark:text-stone-100">
                                {prod.name}
                              </span>
                            </div>
                            <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 flex items-center gap-1.5">
                              <span>{cat?.name}</span>
                              {isLow && (
                                <span className="text-red-600 dark:text-red-400 font-bold">
                                  · {isOut ? 'نفد المخزون' : 'قارب على النفاد'}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-2.5 text-center">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={costDraft}
                              onChange={(e) =>
                                setCoffeeCostDrafts((prev) => ({
                                  ...prev,
                                  [prod.id]: e.target.value,
                                }))
                              }
                              className="w-24 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-2 py-1.5 text-xs font-num font-semibold text-center focus:border-amber-600 focus:outline-none"
                            />
                          </td>

                          <td className="py-3 px-2.5 text-center">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={priceDraft}
                              onChange={(e) =>
                                setCoffeePriceDrafts((prev) => ({
                                  ...prev,
                                  [prod.id]: e.target.value,
                                }))
                              }
                              className="w-24 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-amber-800 dark:text-amber-400 px-2 py-1.5 text-xs font-num font-bold text-center focus:border-amber-600 focus:outline-none"
                            />
                          </td>

                          <td className="py-3 px-2.5 text-center font-num text-xs font-bold whitespace-nowrap">
                            <span
                              className={
                                profitPerKg >= 0
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-red-600 dark:text-red-400'
                              }
                            >
                              {formatCurrency(profitPerKg)}
                            </span>
                          </td>

                          <td className="py-3 px-2.5 text-center">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={stockDraft}
                              onChange={(e) =>
                                setCoffeeStockDrafts((prev) => ({
                                  ...prev,
                                  [prod.id]: e.target.value,
                                }))
                              }
                              className={`w-24 rounded-lg border px-2 py-1.5 text-xs font-num font-bold text-center focus:outline-none ${
                                isLow
                                  ? 'border-red-400 dark:border-red-700 bg-white dark:bg-stone-950 text-red-600 dark:text-red-400'
                                  : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:border-amber-600'
                              }`}
                            />
                          </td>

                          <td className="py-3 px-2.5 text-center">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={minDraft}
                              onChange={(e) =>
                                setCoffeeMinDrafts((prev) => ({
                                  ...prev,
                                  [prod.id]: e.target.value,
                                }))
                              }
                              className="w-20 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-2 py-1.5 text-xs font-num text-center focus:border-amber-600 focus:outline-none"
                            />
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex flex-wrap items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onRestockCoffeeKg(prod.id, 5);
                                  setCoffeeStockDrafts((prev) => {
                                    const next = { ...prev };
                                    delete next[prod.id];
                                    return next;
                                  });
                                  flash(`تمت إضافة 5 كجم إلى ${prod.name}`);
                                }}
                                className="px-2 py-1 rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-[11px] font-num font-bold text-stone-800 dark:text-stone-100 cursor-pointer"
                              >
                                +5 كجم
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onRestockCoffeeKg(prod.id, 10);
                                  setCoffeeStockDrafts((prev) => {
                                    const next = { ...prev };
                                    delete next[prod.id];
                                    return next;
                                  });
                                  flash(`تمت إضافة 10 كجم إلى ${prod.name}`);
                                }}
                                className="px-2 py-1 rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-[11px] font-num font-bold text-stone-800 dark:text-stone-100 cursor-pointer"
                              >
                                +10 كجم
                              </button>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={deltaDraft}
                                onChange={(e) =>
                                  setCoffeeDeltaInputs((prev) => ({
                                    ...prev,
                                    [prod.id]: e.target.value,
                                  }))
                                }
                                placeholder="كمية"
                                className="w-16 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-1.5 py-1 text-[11px] font-num text-center"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const kg = Number(deltaDraft);
                                  if (!Number.isFinite(kg) || kg <= 0) return;
                                  onRestockCoffeeKg(prod.id, kg);
                                  setCoffeeDeltaInputs((prev) => ({ ...prev, [prod.id]: '' }));
                                  setCoffeeStockDrafts((prev) => {
                                    const next = { ...prev };
                                    delete next[prod.id];
                                    return next;
                                  });
                                  flash(`تمت إضافة ${kg} كجم إلى ${prod.name}`);
                                }}
                                className="p-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                                title="إضافة للمخزن"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const kg = Number(deltaDraft);
                                  if (!Number.isFinite(kg) || kg <= 0) return;
                                  onRestockCoffeeKg(prod.id, -kg);
                                  setCoffeeDeltaInputs((prev) => ({ ...prev, [prod.id]: '' }));
                                  setCoffeeStockDrafts((prev) => {
                                    const next = { ...prev };
                                    delete next[prod.id];
                                    return next;
                                  });
                                  flash(`تم خصم ${kg} كجم من ${prod.name}`);
                                }}
                                className="p-1 rounded bg-stone-700 dark:bg-stone-600 hover:bg-stone-800 text-white cursor-pointer"
                                title="خصم من المخزن"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              disabled={!hasEdits}
                              onClick={() => {
                                const updates: Partial<Omit<Product, 'id'>> = {};
                                if (Number.isFinite(parsedCost) && parsedCost >= 0) {
                                  updates.costPrice = Number(parsedCost.toFixed(2));
                                }
                                if (Number.isFinite(parsedPrice) && parsedPrice >= 0) {
                                  updates.price = Number(parsedPrice.toFixed(2));
                                }
                                if (Number.isFinite(parsedMin) && parsedMin >= 0) {
                                  updates.minStockKg = parsedMin;
                                }
                                onUpdateProduct(prod.id, updates);
                                if (
                                  Number.isFinite(parsedStock) &&
                                  parsedStock >= 0 &&
                                  parsedStock !== currentStock
                                ) {
                                  onSetCoffeeStockKg(prod.id, parsedStock);
                                }
                                setCoffeeCostDrafts((prev) => {
                                  const n = { ...prev };
                                  delete n[prod.id];
                                  return n;
                                });
                                setCoffeePriceDrafts((prev) => {
                                  const n = { ...prev };
                                  delete n[prod.id];
                                  return n;
                                });
                                setCoffeeStockDrafts((prev) => {
                                  const n = { ...prev };
                                  delete n[prod.id];
                                  return n;
                                });
                                setCoffeeMinDrafts((prev) => {
                                  const n = { ...prev };
                                  delete n[prod.id];
                                  return n;
                                });
                                flash(`تم حفظ بيانات ومخزون ${prod.name}`);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                            >
                              حفظ
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CATALOG MANAGEMENT (PRICES, COSTS, DISPLAY ORDER) */}
      {adminTab === 'catalog' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                إضافة فئة جديدة في شاشة الكاشير
              </h3>
              <span className="text-xs text-stone-500 dark:text-stone-400">
                التحكم في أسعار كل الأصناف وترتيب ظهور الفئات والأزرار حصري من هنا
              </span>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCatName.trim()) return;
                onAddCategory(newCatName, newCatMode);
                setNewCatName('');
                flash('تمت إضافة الفئة الجديدة بنجاح');
              }}
              className="flex flex-wrap items-end gap-3"
            >
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  اسم الفئة
                </label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="مثال: حلويات ومعجنات، مستلزمات قهوة، شاي خام..."
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
                  required
                />
              </div>
              <div className="w-56">
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  نظام البيع والمخزن
                </label>
                <select
                  value={newCatMode}
                  onChange={(e) => setNewCatMode(e.target.value as CategoryMode)}
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm font-semibold"
                >
                  <option value="drink">مشروبات / أصناف بالقطعة</option>
                  <option value="weight">بن / بيع بالوزن والمبلغ</option>
                  <option value="fridge">تلاجة (شرنك / باركود / عدد)</option>
                </select>
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-500 text-white dark:text-stone-950 text-sm font-bold cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة الفئة</span>
              </button>
            </form>
          </div>

          <div className="space-y-3">
            {[...state.categories]
              .sort((a, b) => a.order - b.order)
              .map((cat, catIdx, allCats) => {
                const catProducts = state.products
                  .filter((p) => p.categoryId === cat.id)
                  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
                const modeLabel =
                  cat.mode === 'weight'
                    ? 'بالوزن والمبلغ (كجم)'
                    : cat.mode === 'fridge'
                      ? 'تلاجة (شرنك وباركود)'
                      : 'مشروبات وأصناف';
                return (
                  <div
                    key={cat.id}
                    className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden"
                  >
                    <div className="px-4 py-3 bg-stone-50 dark:bg-stone-900/80 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-num font-bold text-stone-500 dark:text-stone-400">
                            ترتيب #{catIdx + 1}
                          </span>
                          <button
                            type="button"
                            disabled={catIdx === 0}
                            onClick={() => onMoveCategoryOrder(cat.id, 'up')}
                            className="p-1 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="تقديم الفئة في شاشة البيع"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={catIdx === allCats.length - 1}
                            onClick={() => onMoveCategoryOrder(cat.id, 'down')}
                            className="p-1 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="تأخير الفئة في شاشة البيع"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div>
                          <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                            {cat.name}
                          </span>
                          <span className="text-xs text-stone-500 dark:text-stone-400 mr-2">
                            · {modeLabel} · {catProducts.length} زر
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingCategoryId(cat.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-amber-600 text-white dark:text-stone-950 text-xs font-semibold hover:bg-stone-800 dark:hover:bg-amber-500 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>إضافة / تعديل الأزرار</span>
                        </button>
                        {state.categories.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteCategory(cat.id);
                              flash(`تم حذف فئة ${cat.name}`);
                            }}
                            className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                            title="حذف الفئة بالكامل"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {catProducts.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-stone-200 dark:bg-stone-800">
                        {catProducts.map((p, pIdx) => {
                          const priceDraft = quickPrices[p.id] ?? String(p.price);
                          const costDraft = quickCosts[p.id] ?? String(p.costPrice);
                          const hasMinStock =
                            cat.mode === 'weight' || (cat.mode === 'fridge' && !p.isIceCup);
                          const currentMin =
                            cat.mode === 'weight' ? (p.minStockKg ?? 3) : (p.minStockUnits ?? 8);
                          const minDraft = quickMinStocks[p.id] ?? String(currentMin);

                          const priceChanged =
                            priceDraft !== '' && Number(priceDraft) !== p.price;
                          const costChanged =
                            costDraft !== '' && Number(costDraft) !== p.costPrice;
                          const minChanged =
                            hasMinStock && minDraft !== '' && Number(minDraft) !== currentMin;
                          const changed = priceChanged || costChanged || minChanged;

                          return (
                            <div
                              key={p.id}
                              className="bg-white dark:bg-stone-900 px-3.5 py-3 space-y-2.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-[11px] font-num font-bold text-stone-400 dark:text-stone-500 shrink-0">
                                    #{pIdx + 1}
                                  </span>
                                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                                    {p.name}
                                  </span>
                                  {!p.active && (
                                    <span className="text-[11px] text-stone-400 shrink-0">· مخفي</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    disabled={pIdx === 0}
                                    onClick={() => onMoveProductOrder(p.id, 'up')}
                                    className="p-1 rounded border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                    title="تقديم الزر"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={pIdx === catProducts.length - 1}
                                    onClick={() => onMoveProductOrder(p.id, 'down')}
                                    className="p-1 rounded border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                    title="تأخير الزر"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-end gap-2">
                                <div className="flex-1 min-w-[76px]">
                                  <label className="block text-[10px] font-semibold text-stone-500 dark:text-stone-400 mb-0.5">
                                    البيع {cat.mode === 'weight' ? '(كجم)' : '(ج.م)'}
                                  </label>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={priceDraft}
                                    onChange={(e) =>
                                      setQuickPrices((prev) => ({
                                        ...prev,
                                        [p.id]: e.target.value,
                                      }))
                                    }
                                    className="w-full rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-amber-800 dark:text-amber-400 px-2 py-1 text-xs font-num font-bold text-center"
                                  />
                                </div>

                                <div className="flex-1 min-w-[76px]">
                                  <label className="block text-[10px] font-semibold text-stone-500 dark:text-stone-400 mb-0.5">
                                    التكلفة
                                  </label>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={costDraft}
                                    onChange={(e) =>
                                      setQuickCosts((prev) => ({
                                        ...prev,
                                        [p.id]: e.target.value,
                                      }))
                                    }
                                    className="w-full rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-2 py-1 text-xs font-num text-center"
                                  />
                                </div>

                                {hasMinStock && (
                                  <div className="w-16">
                                    <label className="block text-[10px] font-semibold text-stone-500 dark:text-stone-400 mb-0.5">
                                      حد التنبيه
                                    </label>
                                    <input
                                      type="number"
                                      step={cat.mode === 'weight' ? '0.5' : '1'}
                                      min="0"
                                      value={minDraft}
                                      onChange={(e) =>
                                        setQuickMinStocks((prev) => ({
                                          ...prev,
                                          [p.id]: e.target.value,
                                        }))
                                      }
                                      className="w-full rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-1.5 py-1 text-xs font-num text-center"
                                    />
                                  </div>
                                )}

                                {changed && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const valPrice = Number(priceDraft);
                                      const valCost = Number(costDraft);
                                      const valMin = Number(minDraft);
                                      const updates: Partial<Omit<Product, 'id'>> = {};
                                      if (Number.isFinite(valPrice) && valPrice >= 0) {
                                        updates.price = Number(valPrice.toFixed(2));
                                      }
                                      if (Number.isFinite(valCost) && valCost >= 0) {
                                        updates.costPrice = Number(valCost.toFixed(2));
                                      }
                                      if (hasMinStock && Number.isFinite(valMin) && valMin >= 0) {
                                        if (cat.mode === 'weight') updates.minStockKg = valMin;
                                        else updates.minStockUnits = Math.round(valMin);
                                      }
                                      onUpdateProduct(p.id, updates);
                                      flash(`تم تحديث تسعير وبيانات ${p.name}`);
                                    }}
                                    className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold cursor-pointer h-[26px]"
                                  >
                                    حفظ
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 3: HISTORY */}
      {adminTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setHistorySubTab('sales')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  historySubTab === 'sales'
                    ? 'bg-stone-900 dark:bg-amber-600 text-white dark:text-stone-950'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200'
                }`}
              >
                سجل الفواتير ({state.sales.length})
              </button>
              <button
                type="button"
                onClick={() => setHistorySubTab('closures')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  historySubTab === 'closures'
                    ? 'bg-stone-900 dark:bg-amber-600 text-white dark:text-stone-950'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200'
                }`}
              >
                سجل تقفيلات الأيام ({state.closures.length})
              </button>
            </div>

            {historySubTab === 'sales' && (
              <input
                type="text"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                placeholder="بحث برقم الفاتورة أو الصنف أو العميل..."
                className="w-64 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-1.5 text-xs"
              />
            )}
          </div>

          {historySubTab === 'sales' ? (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
              {filteredSalesHistory.length === 0 ? (
                <div className="py-12 text-center text-xs text-stone-400 dark:text-stone-500">
                  لا توجد فواتير مطابقة
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/40 text-xs text-stone-500 dark:text-stone-400">
                        <th className="text-right py-3 px-4 font-semibold">رقم الفاتورة</th>
                        <th className="text-right py-3 px-4 font-semibold">الأصناف</th>
                        <th className="text-right py-3 px-4 font-semibold">الدفع</th>
                        <th className="text-right py-3 px-4 font-semibold">التاريخ</th>
                        <th className="text-left py-3 px-4 font-semibold">الإجمالي</th>
                        <th className="text-left py-3 px-4 font-semibold">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {filteredSalesHistory.slice(0, 100).map((sale) => (
                        <tr
                          key={sale.id}
                          className={
                            sale.voided
                              ? 'bg-red-50/40 dark:bg-red-950/20 text-stone-400 dark:text-stone-500 line-through'
                              : 'hover:bg-stone-50 dark:hover:bg-stone-800/40'
                          }
                        >
                          <td className="py-2.5 px-4 font-num font-bold text-stone-900 dark:text-stone-100">
                            #{sale.receiptNo}
                            {sale.voided && (
                              <span className="text-[11px] text-red-600 dark:text-red-400 font-sans mr-1.5 no-underline">
                                ملغاة
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-xs text-stone-700 dark:text-stone-300 max-w-xs truncate">
                            {sale.items
                              .map((i) =>
                                i.mode === 'weight' && i.weightGrams
                                  ? `${i.name}${i.roast ? ` (${i.roast})` : ''} ${formatWeightGrams(i.weightGrams)}`
                                  : `${i.name}${i.note ? ` (سكر ${i.note})` : ''} ×${i.qty}`
                              )
                              .join('، ')}
                            {sale.customerName ? ` — ${sale.customerName}` : ''}
                          </td>
                          <td className="py-2.5 px-4 text-xs font-semibold text-stone-800 dark:text-stone-200">
                            {paymentMethodLabel(sale.paymentMethod)}
                          </td>
                          <td className="py-2.5 px-4 text-xs font-num text-stone-500 dark:text-stone-400 whitespace-nowrap">
                            {formatDateTime(sale.timestamp)}
                          </td>
                          <td className="py-2.5 px-4 text-left font-num font-bold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                            {formatCurrency(sale.total)}
                          </td>
                          <td className="py-2.5 px-4 text-left whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onPrintSale(sale)}
                                className="p-1.5 rounded border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                                title="إعادة طباعة الفاتورة"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              {!sale.voided && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onVoidSale(sale.id);
                                    flash(`تم إلغاء الفاتورة #${sale.receiptNo} وردّ البضاعة للمخزن`);
                                  }}
                                  className="px-2 py-1 rounded border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-[11px] font-semibold cursor-pointer"
                                >
                                  إلغاء ومرتجع
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
              {state.closures.length === 0 ? (
                <div className="py-12 text-center text-xs text-stone-400 dark:text-stone-500">
                  لم يتم تسجيل أي تقفيل يومي بعد
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/40 text-xs text-stone-500 dark:text-stone-400">
                        <th className="text-right py-3 px-4 font-semibold">تاريخ التقفيل</th>
                        <th className="text-left py-3 px-4 font-semibold">المبيعات</th>
                        <th className="text-left py-3 px-4 font-semibold">المصروفات</th>
                        <th className="text-left py-3 px-4 font-semibold">صافي الدرج</th>
                        <th className="text-left py-3 px-4 font-semibold">الفرق</th>
                        <th className="text-left py-3 px-4 font-semibold">صافي الربح</th>
                        <th className="text-center py-3 px-3 font-semibold">طباعة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {state.closures.map((c) => (
                        <tr key={c.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                          <td className="py-2.5 px-4 text-xs font-num text-stone-700 dark:text-stone-300">
                            {formatDateTime(c.closedAt)}
                          </td>
                          <td className="py-2.5 px-4 text-left font-num font-bold text-stone-900 dark:text-stone-100">
                            {formatCurrency(c.totalSales)}
                          </td>
                          <td className="py-2.5 px-4 text-left font-num text-red-700 dark:text-red-400">
                            -{formatCurrency(c.totalExpenses)}
                          </td>
                          <td className="py-2.5 px-4 text-left font-num font-semibold text-stone-900 dark:text-stone-100">
                            {formatCurrency(c.actualDrawerCash)}
                          </td>
                          <td
                            className={`py-2.5 px-4 text-left font-num font-bold ${
                              c.drawerDiff < 0
                                ? 'text-red-600 dark:text-red-400'
                                : c.drawerDiff > 0
                                  ? 'text-amber-700 dark:text-amber-400'
                                  : 'text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {c.drawerDiff >= 0
                              ? `+${formatCurrency(c.drawerDiff)}`
                              : formatCurrency(c.drawerDiff)}
                          </td>
                          <td className="py-2.5 px-4 text-left font-num font-bold text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(c.estimatedProfit)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => onPrintClosure(c)}
                              className="p-1.5 rounded border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SECURITY, SHOP INFO & BACKUP */}
      {adminTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <form
            onSubmit={handleSaveCredentials}
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
              <ShieldCheck className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  اسم المستخدم وكلمة مرور الإدارة
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  حدد بيانات الدخول الخاصة بك لحماية الأسعار والتقارير
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                اسم المستخدم الجديد
              </label>
              <input
                type="text"
                value={newAdminUser}
                onChange={(e) => setNewAdminUser(e.target.value)}
                className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  value={newAdminPass}
                  onChange={(e) => setNewAdminPass(e.target.value)}
                  placeholder="اكتب كلمة المرور"
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  تأكيد كلمة المرور
                </label>
                <input
                  type="password"
                  value={confirmAdminPass}
                  onChange={(e) => setConfirmAdminPass(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور"
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-500 text-white dark:text-stone-950 text-sm font-bold cursor-pointer"
            >
              حفظ بيانات الدخول الجديدة
            </button>
          </form>

          <form
            onSubmit={handleSaveShopInfo}
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 space-y-3.5"
          >
            <div className="border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                بيانات المحل والفاتورة المطبوعة
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                تظهر أعلى وأسفل بون الكاشير وورقة تقفيل اليوم
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                اسم المحل
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  الوصف المختصر
                </label>
                <input
                  type="text"
                  value={shopSubtitle}
                  onChange={(e) => setShopSubtitle(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  رقم تليفون المحل
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm font-num"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  جملة أسفل الفاتورة
                </label>
                <input
                  type="text"
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  حد تنبيه أكواب الثلج
                </label>
                <input
                  type="number"
                  min="0"
                  value={minPlasticCupsStr}
                  onChange={(e) => setMinPlasticCupsStr(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm font-num"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-amber-700 dark:bg-amber-600 hover:bg-amber-800 dark:hover:bg-amber-500 text-white dark:text-stone-950 text-sm font-bold cursor-pointer"
            >
              حفظ بيانات المحل
            </button>
          </form>

          <div className="lg:col-span-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                النسخ الاحتياطي واستعادة البيانات
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                احفظ نسخة من كل الأصناف والمخزن والحسابات على جهازك، أو استرجعها في أي وقت.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900 dark:bg-amber-600 text-white dark:text-stone-950 text-xs font-bold hover:bg-stone-800 dark:hover:bg-amber-500 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تصدير نسخة احتياطية</span>
              </button>

              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 text-xs font-bold cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>استعادة نسخة</span>
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleUploadBackup}
                  className="hidden"
                />
              </label>

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ضبط المصنع</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onResetAllData();
                      setConfirmReset(false);
                      flash('تمت إعادة ضبط النظام للبيانات الافتراضية');
                    }}
                    className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer"
                  >
                    تأكيد المسح والضبط
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editingCategory && (
        <CategoryEditorModal
          category={editingCategory}
          products={state.products}
          isAdminUnlocked={isAdminUnlocked}
          onVerifyAdmin={onVerifyAdmin}
          onUpdateCategory={onUpdateCategory}
          onAddProduct={onAddProduct}
          onUpdateProduct={onUpdateProduct}
          onMoveProductOrder={onMoveProductOrder}
          onDeleteProduct={onDeleteProduct}
          onClose={() => setEditingCategoryId(null)}
        />
      )}
    </div>
  );
};
