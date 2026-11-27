import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Barcode,
  CheckCircle2,
  Minus,
  Plus,
  Printer,
  Scale,
  Snowflake,
  Trash2,
  UserPlus,
} from 'lucide-react';
import {
  CartItem,
  Category,
  CreditCustomer,
  PaymentMethod,
  Product,
  RoastLevel,
  SaleRecord,
} from '../types';
import {
  formatCurrency,
  formatStockKg,
  formatWeightGrams,
  generateId,
} from '../utils/format';

interface Props {
  categories: Category[];
  products: Product[];
  customers: CreditCustomer[];
  plasticCupsStock: number;
  minPlasticCups: number;
  onAddCustomer: (name: string, phone: string, notes: string) => CreditCustomer;
  onCompleteSale: (params: {
    items: CartItem[];
    paymentMethod: PaymentMethod;
    customerId?: string;
    paidNow?: number;
    downPaymentMethod?: 'cash' | 'vodafone' | 'instapay';
  }) => SaleRecord;
  onPrintSale: (sale: SaleRecord) => void;
}

const QUICK_WEIGHTS = [
  { label: 'ثمن', grams: 125 },
  { label: 'ربع', grams: 250 },
  { label: 'نص', grams: 500 },
  { label: 'كيلو', grams: 1000 },
];

const QUICK_AMOUNTS = [25, 50, 100, 150];
const SUGAR_OPTIONS = ['بدون تحديد', 'سادة', 'عالريحة', 'مظبوط', 'مانو', 'زيادة'];

export const PosScreen: React.FC<Props> = ({
  categories,
  products,
  customers,
  plasticCupsStock,
  minPlasticCups,
  onAddCustomer,
  onCompleteSale,
  onPrintSale,
}) => {
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.order - b.order),
    [categories]
  );

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    sortedCategories[0]?.id || ''
  );
  const activeCategory =
    sortedCategories.find((c) => c.id === selectedCategoryId) || sortedCategories[0];

  const activeProducts = useMemo(
    () =>
      products
        .filter((p) => p.active && activeCategory && p.categoryId === activeCategory.id)
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
    [products, activeCategory]
  );

  const lowStockCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    const catModeMap = new Map<string, Category['mode']>();
    categories.forEach((c) => catModeMap.set(c.id, c.mode));

    for (const p of products) {
      if (!p.active) continue;
      const mode = catModeMap.get(p.categoryId);
      if (mode === 'weight' && (p.stockKg ?? 0) <= (p.minStockKg ?? 3)) {
        map.set(p.categoryId, (map.get(p.categoryId) || 0) + 1);
      } else if (mode === 'fridge') {
        if (p.isIceCup) {
          if (plasticCupsStock <= minPlasticCups) {
            map.set(p.categoryId, (map.get(p.categoryId) || 0) + 1);
          }
        } else if ((p.stockUnits ?? 0) <= (p.minStockUnits ?? 8)) {
          map.set(p.categoryId, (map.get(p.categoryId) || 0) + 1);
        }
      }
    }
    return map;
  }, [categories, products, plasticCupsStock, minPlasticCups]);

  const activeCategoryLowStockNames = useMemo(() => {
    if (!activeCategory) return [];
    const names: string[] = [];
    if (activeCategory.mode === 'weight') {
      activeProducts.forEach((p) => {
        if ((p.stockKg ?? 0) <= (p.minStockKg ?? 3)) names.push(p.name);
      });
    } else if (activeCategory.mode === 'fridge') {
      activeProducts.forEach((p) => {
        if (p.isIceCup) {
          if (plasticCupsStock <= minPlasticCups) names.push('أكواب الثلج البلاستيك');
        } else if ((p.stockUnits ?? 0) <= (p.minStockUnits ?? 8)) {
          names.push(p.name);
        }
      });
    }
    return names;
  }, [activeCategory, activeProducts, plasticCupsStock, minPlasticCups]);

  const [selectedCoffeeId, setSelectedCoffeeId] = useState<string>('');
  const [selectedRoast, setSelectedRoast] = useState<RoastLevel>('وسط');
  const [sellByAmountStr, setSellByAmountStr] = useState<string>('');
  const [sugarNote, setSugarNote] = useState<string>('بدون تحديد');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeMessage, setBarcodeMessage] = useState<{ text: string; isError?: boolean } | null>(
    null
  );
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [paidNowStr, setPaidNowStr] = useState<string>('0');
  const [downPaymentMethod, setDownPaymentMethod] = useState<'cash' | 'vodafone' | 'instapay'>(
    'cash'
  );

  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [saleBanner, setSaleBanner] = useState<string | null>(null);

  useEffect(() => {
    if (activeCategory?.mode === 'weight') {
      const stillValid = activeProducts.some((p) => p.id === selectedCoffeeId);
      if (!stillValid && activeProducts[0]) {
        setSelectedCoffeeId(activeProducts[0].id);
        const defaultRoast = activeProducts[0].roastLevels?.includes('وسط')
          ? 'وسط'
          : activeProducts[0].roastLevels?.[0] || 'وسط';
        setSelectedRoast(defaultRoast);
      }
    }
  }, [activeCategory, activeProducts, selectedCoffeeId]);

  const selectedCoffee =
    activeCategory?.mode === 'weight'
      ? activeProducts.find((p) => p.id === selectedCoffeeId) || activeProducts[0]
      : undefined;

  const calculatedGramsFromAmount = useMemo(() => {
    const amt = Number(sellByAmountStr);
    if (!selectedCoffee || !Number.isFinite(amt) || amt <= 0 || selectedCoffee.price <= 0) {
      return 0;
    }
    return Math.round((amt / selectedCoffee.price) * 1000);
  }, [sellByAmountStr, selectedCoffee]);

  const iceCupProduct = useMemo(
    () => products.find((p) => p.isIceCup && p.active),
    [products]
  );

  const fridgeProducts = useMemo(
    () => activeProducts.filter((p) => !p.isIceCup),
    [activeProducts]
  );

  const addCoffeeByWeight = (grams: number, exactPriceOverride?: number) => {
    if (!selectedCoffee || !activeCategory || grams <= 0) return;
    const priceForWeight =
      exactPriceOverride !== undefined
        ? Number(exactPriceOverride.toFixed(2))
        : Number(((selectedCoffee.price * grams) / 1000).toFixed(2));
    const costForWeight = Number(((selectedCoffee.costPrice * grams) / 1000).toFixed(2));
    const roast =
      selectedCoffee.roastLevels && selectedCoffee.roastLevels.length > 0
        ? selectedCoffee.roastLevels.includes(selectedRoast)
          ? selectedRoast
          : selectedCoffee.roastLevels[0]
        : undefined;

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (i) =>
          i.productId === selectedCoffee.id &&
          i.roast === roast &&
          i.weightGrams === grams &&
          i.unitPrice === priceForWeight
      );
      if (existingIndex >= 0) {
        return prev.map((item, idx) =>
          idx === existingIndex
            ? {
                ...item,
                qty: item.qty + 1,
                lineTotal: Number(((item.qty + 1) * item.unitPrice).toFixed(2)),
                costTotal: Number(((item.qty + 1) * costForWeight).toFixed(2)),
              }
            : item
        );
      }
      return [
        ...prev,
        {
          id: generateId('line'),
          productId: selectedCoffee.id,
          categoryId: activeCategory.id,
          name: selectedCoffee.name,
          mode: 'weight',
          roast,
          weightGrams: grams,
          qty: 1,
          unitPrice: priceForWeight,
          costTotal: costForWeight,
          lineTotal: priceForWeight,
        },
      ];
    });
  };

  const handleAddByAmount = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(sellByAmountStr);
    if (!selectedCoffee || !Number.isFinite(amt) || amt <= 0 || calculatedGramsFromAmount <= 0) {
      return;
    }
    addCoffeeByWeight(calculatedGramsFromAmount, amt);
    setSellByAmountStr('');
  };

  const addUnitProduct = (product: Product, customNote?: string) => {
    const cat = categories.find((c) => c.id === product.categoryId);
    const mode = cat?.mode || 'drink';
    const note =
      mode === 'drink' && customNote && customNote !== 'بدون تحديد' ? customNote : undefined;

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.productId === product.id && i.note === note
      );
      if (existingIndex >= 0) {
        return prev.map((item, idx) =>
          idx === existingIndex
            ? {
                ...item,
                qty: item.qty + 1,
                lineTotal: Number(((item.qty + 1) * item.unitPrice).toFixed(2)),
                costTotal: Number(((item.qty + 1) * product.costPrice).toFixed(2)),
              }
            : item
        );
      }
      return [
        ...prev,
        {
          id: generateId('line'),
          productId: product.id,
          categoryId: product.categoryId,
          name: product.name,
          mode,
          qty: 1,
          unitPrice: product.price,
          costTotal: product.costPrice,
          lineTotal: product.price,
          isIceCup: product.isIceCup,
          note,
        },
      ];
    });
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;
    const match = products.find(
      (p) => p.active && p.barcode && p.barcode.toLowerCase() === code.toLowerCase()
    );
    if (match) {
      addUnitProduct(match);
      setBarcodeMessage({ text: `تمت إضافة: ${match.name}` });
      setBarcodeInput('');
    } else {
      setBarcodeMessage({ text: `لم يتم العثور على باركود: ${code}`, isError: true });
    }
    setTimeout(() => setBarcodeMessage(null), 2500);
  };

  const updateCartQty = (lineId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== lineId) return item;
          const nextQty = item.qty + delta;
          if (nextQty <= 0) return null;
          const unitCost = item.qty > 0 ? item.costTotal / item.qty : 0;
          return {
            ...item,
            qty: nextQty,
            lineTotal: Number((nextQty * item.unitPrice).toFixed(2)),
            costTotal: Number((nextQty * unitCost).toFixed(2)),
          };
        })
        .filter((x): x is CartItem => x !== null)
    );
  };

  const removeCartLine = (lineId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== lineId));
  };

  const cartTotal = useMemo(
    () => Number(cart.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)),
    [cart]
  );

  const paidNowNum = Math.min(Math.max(0, Number(paidNowStr) || 0), cartTotal);
  const creditRemaining = Math.max(0, Number((cartTotal - paidNowNum).toFixed(2)));

  const handleCheckout = (shouldPrint: boolean) => {
    if (cart.length === 0) return;
    if (paymentMethod === 'credit' && !selectedCustomerId) {
      setSaleBanner('يرجى اختيار العميل أو القهوة أولاً لتسجيل البيع الآجل');
      setTimeout(() => setSaleBanner(null), 3000);
      return;
    }

    const sale = onCompleteSale({
      items: cart,
      paymentMethod,
      customerId: paymentMethod === 'credit' ? selectedCustomerId : undefined,
      paidNow: paymentMethod === 'credit' ? paidNowNum : cartTotal,
      downPaymentMethod: paymentMethod === 'credit' ? downPaymentMethod : undefined,
    });

    setCart([]);
    setPaidNowStr('0');
    setPaymentMethod('cash');
    setSaleBanner(`تم تسجيل الفاتورة #${sale.receiptNo} بإجمالي ${formatCurrency(sale.total)}`);
    setTimeout(() => setSaleBanner(null), 3500);

    if (shouldPrint) {
      onPrintSale(sale);
    }
  };

  const handleQuickCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    const created = onAddCustomer(newCustName, newCustPhone, '');
    setSelectedCustomerId(created.id);
    setNewCustName('');
    setNewCustPhone('');
    setShowQuickCustomer(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[calc(100vh-88px)]">
      {/* RIGHT WORKSPACE: Categories + Product Controls */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Category Tabs Bar (Sorted by Admin Display Order) */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-2 flex flex-wrap items-center gap-1.5">
          {sortedCategories.map((cat) => {
            const isActive = activeCategory?.id === cat.id;
            const catLowCount = lowStockCountByCategory.get(cat.id) || 0;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-stone-900 dark:bg-amber-600 text-white dark:text-stone-950'
                    : catLowCount > 0
                      ? 'bg-red-50 dark:bg-red-950/35 border border-red-300 dark:border-red-800/80 text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/60'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                <span>{cat.name}</span>
                {catLowCount > 0 && (
                  <AlertTriangle
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-red-300 dark:text-red-950' : 'text-red-600 dark:text-red-400'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Low Stock Alert Strip for Active Category */}
        {activeCategoryLowStockNames.length > 0 && (
          <div className="flex items-start sm:items-center gap-2 rounded-lg border border-red-300 dark:border-red-800/80 bg-red-50/90 dark:bg-red-950/40 px-3.5 py-2.5 text-xs font-semibold text-red-800 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              تنبيه مخزون قارب على النفاد ({activeCategoryLowStockNames.length}):{' '}
              <span className="font-bold">{activeCategoryLowStockNames.join(' · ')}</span>
            </span>
          </div>
        )}

        {/* Sale Feedback Banner */}
        {saleBanner && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-4 py-2.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saleBanner}</span>
          </div>
        )}

        {/* MODE 1: WEIGHT-BASED COFFEE */}
        {activeCategory?.mode === 'weight' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  1. اختر نوع {activeCategory.name}
                </h2>
                <span className="text-xs text-stone-500 dark:text-stone-400">الأسعار للكيلو الواحد</span>
              </div>

              {activeProducts.length === 0 ? (
                <div className="text-center py-8 text-sm text-stone-500 dark:text-stone-400">
                  لا توجد أصناف في هذه الفئة. يمكنك إضافتها وترتيبها من قسم «الإدارة».
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {activeProducts.map((prod) => {
                    const isSelected = selectedCoffee?.id === prod.id;
                    const stockKg = prod.stockKg ?? 0;
                    const minKg = prod.minStockKg ?? 3;
                    const lowStock = stockKg <= minKg;
                    const outOfStock = stockKg <= 0;
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => {
                          setSelectedCoffeeId(prod.id);
                          if (prod.roastLevels && !prod.roastLevels.includes(selectedRoast)) {
                            setSelectedRoast(prod.roastLevels[0]);
                          }
                        }}
                        className={`text-right rounded-lg border p-3.5 transition-all cursor-pointer ${
                          lowStock
                            ? isSelected
                              ? 'border-red-600 dark:border-red-500 bg-red-50/90 dark:bg-red-950/50 ring-1 ring-red-600 dark:ring-red-500'
                              : 'border-red-400 dark:border-red-700/90 bg-red-50/60 dark:bg-red-950/30 hover:border-red-500 dark:hover:border-red-500'
                            : isSelected
                              ? 'border-amber-700 dark:border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-1 ring-amber-700 dark:ring-amber-500'
                              : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950/60 hover:border-stone-400 dark:hover:border-stone-600'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                            {prod.name}
                          </div>
                          {lowStock && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 whitespace-nowrap shrink-0">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>{outOfStock ? 'نفد المخزون' : 'قارب على النفاد'}</span>
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-xs">
                          <span className="font-num font-bold text-amber-800 dark:text-amber-400">
                            {formatCurrency(prod.price)} / كجم
                          </span>
                          <span
                            className={`font-num ${
                              lowStock
                                ? 'text-red-600 dark:text-red-400 font-bold'
                                : 'text-stone-500 dark:text-stone-400'
                            }`}
                          >
                            متاح: {formatStockKg(stockKg)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedCoffee && (
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 space-y-5">
                {selectedCoffee.roastLevels && selectedCoffee.roastLevels.length > 0 && (
                  <div>
                    <div className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-2">
                      2. درجة التحميص
                    </div>
                    <div className="grid grid-cols-3 gap-2 max-w-md">
                      {selectedCoffee.roastLevels.map((roast) => {
                        const active = selectedRoast === roast;
                        return (
                          <button
                            key={roast}
                            type="button"
                            onClick={() => setSelectedRoast(roast)}
                            className={`py-2.5 rounded-lg text-sm font-bold border transition-colors cursor-pointer ${
                              active
                                ? 'bg-amber-700 dark:bg-amber-600 border-amber-700 dark:border-amber-600 text-white dark:text-stone-950'
                                : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700'
                            }`}
                          >
                            {roast}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-2">
                    3. أوزان جاهزة (ضغطة واحدة للإضافة للفاتورة)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {QUICK_WEIGHTS.map((w) => {
                      const computedPrice = Number(((selectedCoffee.price * w.grams) / 1000).toFixed(2));
                      return (
                        <button
                          key={w.grams}
                          type="button"
                          onClick={() => addCoffeeByWeight(w.grams)}
                          className="rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 hover:bg-stone-900 dark:hover:bg-amber-600 hover:text-white dark:hover:text-stone-950 hover:border-stone-900 dark:hover:border-amber-600 p-3.5 text-center transition-colors group cursor-pointer"
                        >
                          <div className="text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-white dark:group-hover:text-stone-950">
                            {w.label}
                          </div>
                          <div className="text-xs text-stone-500 dark:text-stone-400 group-hover:text-stone-300 dark:group-hover:text-stone-900 font-num mt-0.5">
                            {w.grams} جرام
                          </div>
                          <div className="text-sm font-bold text-amber-800 dark:text-amber-400 group-hover:text-amber-300 dark:group-hover:text-stone-950 font-num mt-1.5">
                            {formatCurrency(computedPrice)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-stone-200 dark:border-stone-800 pt-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Scale className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      بيع بمبلغ محدد (يحسب الوزن على الميزان تلقائياً)
                    </span>
                  </div>

                  <form onSubmit={handleAddByAmount} className="flex flex-wrap items-stretch gap-2.5">
                    <div className="relative flex-1 min-w-[180px]">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={sellByAmountStr}
                        onChange={(e) => setSellByAmountStr(e.target.value)}
                        placeholder="اكتب المبلغ بالجنيه (مثلاً 50)"
                        className="w-full h-11 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-3.5 text-base font-num font-bold text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-600 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {QUICK_AMOUNTS.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setSellByAmountStr(String(amt))}
                          className="h-11 px-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-xs font-num font-bold text-stone-700 dark:text-stone-200 cursor-pointer"
                        >
                          {amt} ج
                        </button>
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={calculatedGramsFromAmount <= 0}
                      className="h-11 px-5 rounded-lg bg-amber-700 dark:bg-amber-600 text-white dark:text-stone-950 text-sm font-bold hover:bg-amber-800 dark:hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                    >
                      إضافة للفاتورة
                    </button>
                  </form>

                  {calculatedGramsFromAmount > 0 && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-stone-900 dark:bg-stone-950 border border-stone-800 text-white px-4 py-3">
                      <span className="text-sm font-medium">
                        {selectedCoffee.name} ({selectedRoast}) بقيمة{' '}
                        <strong className="font-num text-amber-300">
                          {formatCurrency(Number(sellByAmountStr))}
                        </strong>
                      </span>
                      <span className="text-base font-bold font-num text-amber-300">
                        الوزن على الميزان: {formatWeightGrams(calculatedGramsFromAmount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: DRINKS */}
        {activeCategory?.mode === 'drink' && (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-200 dark:border-stone-800">
              <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                ملاحظة السكر للطلب القادم:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {SUGAR_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSugarNote(opt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      sugarNote === opt
                        ? 'bg-amber-700 dark:bg-amber-600 text-white dark:text-stone-950'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {activeProducts.length === 0 ? (
              <div className="text-center py-10 text-sm text-stone-500 dark:text-stone-400">
                لا توجد مشروبات في هذه الفئة. يمكنك إضافتها وترتيبها من قسم «الإدارة».
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {activeProducts.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => addUnitProduct(prod, sugarNote)}
                    className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950/60 hover:border-stone-900 dark:hover:border-amber-500 hover:bg-stone-50 dark:hover:bg-stone-800 p-3.5 text-right transition-colors flex flex-col justify-between min-h-[86px] cursor-pointer"
                  >
                    <div className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug">
                      {prod.name}
                    </div>
                    <div className="mt-2 text-sm font-bold text-amber-800 dark:text-amber-400 font-num">
                      {formatCurrency(prod.price)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODE 3: FRIDGE */}
        {activeCategory?.mode === 'fridge' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <form onSubmit={handleBarcodeSubmit} className="flex-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <Barcode className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="مرّر قارئ الباركود هنا أو اكتب الكود ثم Enter..."
                    className="w-full h-11 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 pr-9 pl-3 text-sm font-num focus:border-amber-600 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="h-11 px-4 rounded-lg bg-stone-900 dark:bg-stone-800 dark:border dark:border-stone-700 text-white text-xs font-semibold hover:bg-stone-800 dark:hover:bg-stone-700 cursor-pointer whitespace-nowrap"
                >
                  إضافة بالكود
                </button>
              </form>

              {iceCupProduct && (() => {
                const cupsLow = plasticCupsStock <= minPlasticCups;
                return (
                  <button
                    type="button"
                    onClick={() => addUnitProduct(iceCupProduct)}
                    className={`h-11 px-4 rounded-lg text-white flex items-center justify-center gap-2 text-sm font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      cupsLow
                        ? 'bg-red-700 dark:bg-red-600 hover:bg-red-800 dark:hover:bg-red-500'
                        : 'bg-sky-700 dark:bg-sky-600 hover:bg-sky-800 dark:hover:bg-sky-500'
                    }`}
                  >
                    {cupsLow ? (
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                    ) : (
                      <Snowflake className="w-4 h-4 shrink-0" />
                    )}
                    <span>{iceCupProduct.name}</span>
                    <span className="font-num text-white/90 text-xs">
                      ({iceCupProduct.price === 0 ? 'مجاني' : formatCurrency(iceCupProduct.price)} · متاح {plasticCupsStock} كوب{cupsLow ? ' · منخفض' : ''})
                    </span>
                  </button>
                );
              })()}
            </div>

            {barcodeMessage && (
              <div
                className={`rounded-lg px-4 py-2 text-xs font-semibold border ${
                  barcodeMessage.isError
                    ? 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                    : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {barcodeMessage.text}
              </div>
            )}

            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4">
              {fridgeProducts.length === 0 ? (
                <div className="text-center py-10 text-sm text-stone-500 dark:text-stone-400">
                  لا توجد أصناف في التلاجة بعد. يمكنك إضافتها وترتيبها من قسم «الإدارة».
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {fridgeProducts.map((prod) => {
                    const units = prod.stockUnits ?? 0;
                    const minUnits = prod.minStockUnits ?? 8;
                    const low = units <= minUnits;
                    const outOfStock = units <= 0;
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => addUnitProduct(prod)}
                        className={`rounded-lg border p-3.5 text-right transition-colors flex flex-col justify-between min-h-[100px] cursor-pointer ${
                          low
                            ? 'border-red-400 dark:border-red-700/90 bg-red-50/70 dark:bg-red-950/35 hover:border-red-600 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/50'
                            : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950/60 hover:border-stone-900 dark:hover:border-amber-500 hover:bg-stone-50 dark:hover:bg-stone-800'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug">
                            {prod.name}
                          </div>
                          {low && (
                            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>{outOfStock ? 'نفد المخزون' : 'قارب على النفاد'}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-2.5 flex items-end justify-between gap-2">
                          <span className="text-sm font-bold text-amber-800 dark:text-amber-400 font-num">
                            {formatCurrency(prod.price)}
                          </span>
                          <span
                            className={`text-xs font-num ${
                              low
                                ? 'text-red-600 dark:text-red-400 font-bold'
                                : 'text-stone-500 dark:text-stone-400'
                            }`}
                          >
                            متبقي {units}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* LEFT SIDEBAR: LIVE ORDER TICKET & CHECKOUT */}
      <div className="w-full lg:w-[370px] xl:w-[395px] shrink-0 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-900/90">
          <div>
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">الفاتورة الحالية</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-num">{cart.length} صنف</p>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setCart([])}
              className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 cursor-pointer"
            >
              مسح الكل
            </button>
          )}
        </div>

        {/* Ticket Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800 p-3 space-y-1 min-h-[220px] max-h-[420px] lg:max-h-none">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 text-stone-400 dark:text-stone-500">
              <p className="text-sm font-medium text-stone-500 dark:text-stone-400">الفاتورة فارغة</p>
              <p className="text-xs mt-1">اختر البن أو المشروب أو صنف التلاجة لإضافته فوراً</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="py-2.5 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug">
                    {item.name}
                    {item.roast ? ` (${item.roast})` : ''}
                    {item.note ? (
                      <span className="text-amber-800 dark:text-amber-400 font-bold">
                        {' '}— سكر {item.note}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400 font-num mt-0.5">
                    {item.mode === 'weight' && item.weightGrams
                      ? `الوزن: ${formatWeightGrams(item.weightGrams)}`
                      : `السعر: ${formatCurrency(item.unitPrice)}`}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.id, -1)}
                      className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 cursor-pointer"
                      aria-label="نقص الكمية"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2 text-xs font-num font-bold text-stone-900 dark:text-stone-100">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.id, 1)}
                      className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 cursor-pointer"
                      aria-label="زيادة الكمية"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="w-16 text-left text-xs font-num font-bold text-stone-900 dark:text-stone-100">
                    {formatCurrency(item.lineTotal)}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeCartLine(item.id)}
                    className="p-1 text-stone-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                    aria-label="حذف الصنف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout Footer */}
        <div className="border-t border-stone-200 dark:border-stone-800 p-4 bg-stone-50 dark:bg-stone-900/90 space-y-3">
          <div>
            <div className="text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
              طريقة الدفع
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'cash', label: 'كاش' },
                  { id: 'vodafone', label: 'فودافون' },
                  { id: 'instapay', label: 'إنستا باي' },
                  { id: 'credit', label: 'آجل' },
                ] as { id: PaymentMethod; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    paymentMethod === m.id
                      ? m.id === 'credit'
                        ? 'bg-amber-700 dark:bg-amber-600 border-amber-700 dark:border-amber-600 text-white dark:text-stone-950'
                        : 'bg-stone-900 dark:bg-stone-100 border-stone-900 dark:border-stone-100 text-white dark:text-stone-950'
                      : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'credit' && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/30 p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  اختر العميل / القهوة
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickCustomer((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>عميل جديد</span>
                </button>
              </div>

              {showQuickCustomer ? (
                <form onSubmit={handleQuickCreateCustomer} className="space-y-2">
                  <input
                    type="text"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="اسم العميل أو القهوة"
                    className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-2.5 py-1.5 text-xs"
                    required
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      placeholder="رقم التليفون (اختياري)"
                      className="flex-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-2.5 py-1.5 text-xs font-num"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-amber-600 text-white dark:text-stone-950 text-xs font-semibold cursor-pointer"
                    >
                      حفظ
                    </button>
                  </div>
                </form>
              ) : (
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-2.5 py-2 text-xs font-semibold text-stone-900 dark:text-stone-100"
                >
                  <option value="">-- اختر من دفتر الآجل --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (عليه {formatCurrency(c.balance)})
                    </option>
                  ))}
                </select>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    دفع مقدم الآن (ج.م)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={cartTotal}
                    value={paidNowStr}
                    onChange={(e) => setPaidNowStr(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-2.5 py-1.5 text-xs font-num font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    طريقة دفع المقدم
                  </label>
                  <select
                    value={downPaymentMethod}
                    onChange={(e) =>
                      setDownPaymentMethod(e.target.value as 'cash' | 'vodafone' | 'instapay')
                    }
                    className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-2 py-1.5 text-xs font-semibold"
                  >
                    <option value="cash">كاش</option>
                    <option value="vodafone">فودافون كاش</option>
                    <option value="instapay">إنستا باي</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between text-xs font-bold text-amber-900 dark:text-amber-300 pt-1 border-t border-amber-200 dark:border-amber-800/60">
                <span>المتبقي يُضاف للآجل:</span>
                <span className="font-num">{formatCurrency(creditRemaining)}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-bold text-stone-700 dark:text-stone-300">الإجمالي المطلوب</span>
            <span className="text-2xl font-bold font-num text-stone-900 dark:text-stone-100">
              {formatCurrency(cartTotal)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => handleCheckout(true)}
              className="flex items-center justify-center gap-2 rounded-lg bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-stone-950 py-3 px-3 text-sm font-bold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>بيع وطباعة</span>
            </button>
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => handleCheckout(false)}
              className="flex items-center justify-center gap-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed text-stone-900 dark:text-stone-100 py-3 px-3 text-sm font-bold transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>إتمام البيع</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
