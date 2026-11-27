import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Lock, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Category, Product, RoastLevel } from '../types';
import { formatCurrency } from '../utils/format';

interface Props {
  category: Category;
  products: Product[];
  isAdminUnlocked: boolean;
  onVerifyAdmin: (username: string, password: string) => boolean;
  onUpdateCategory: (id: string, updates: Partial<Pick<Category, 'name' | 'mode' | 'order'>>) => void;
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (id: string, updates: Partial<Omit<Product, 'id'>>) => void;
  onMoveProductOrder: (id: string, direction: 'up' | 'down') => void;
  onDeleteProduct: (id: string) => void;
  onClose: () => void;
}

const ALL_ROASTS: RoastLevel[] = ['فاتح', 'وسط', 'غامق'];

export const CategoryEditorModal: React.FC<Props> = ({
  category,
  products,
  isAdminUnlocked,
  onVerifyAdmin,
  onUpdateCategory,
  onAddProduct,
  onUpdateProduct,
  onMoveProductOrder,
  onDeleteProduct,
  onClose,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [catName, setCatName] = useState(category.name);
  const [editingProdId, setEditingProdId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stockKg, setStockKg] = useState('10');
  const [minStockKg, setMinStockKg] = useState('3');
  const [stockUnits, setStockUnits] = useState('24');
  const [minStockUnits, setMinStockUnits] = useState('8');
  const [unitsPerPack, setUnitsPerPack] = useState('24');
  const [packLabel, setPackLabel] = useState('بالتة');
  const [barcode, setBarcode] = useState('');
  const [roasts, setRoasts] = useState<RoastLevel[]>(['فاتح', 'وسط', 'غامق']);
  const [isIceCup, setIsIceCup] = useState(false);

  const categoryProducts = useMemo(
    () =>
      products
        .filter((p) => p.categoryId === category.id)
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
    [products, category.id]
  );

  const resetForm = () => {
    setEditingProdId(null);
    setName('');
    setPrice('');
    setCostPrice('');
    setStockKg('10');
    setMinStockKg('3');
    setStockUnits('24');
    setMinStockUnits('8');
    setUnitsPerPack('24');
    setPackLabel('بالتة');
    setBarcode('');
    setRoasts(['فاتح', 'وسط', 'غامق']);
    setIsIceCup(false);
  };

  const startEditProduct = (p: Product) => {
    setEditingProdId(p.id);
    setName(p.name);
    setPrice(String(p.price));
    setCostPrice(String(p.costPrice));
    setStockKg(String(p.stockKg ?? 0));
    setMinStockKg(String(p.minStockKg ?? 3));
    setStockUnits(String(p.stockUnits ?? 0));
    setMinStockUnits(String(p.minStockUnits ?? 8));
    setUnitsPerPack(String(p.unitsPerPack ?? 24));
    setPackLabel(p.packLabel || 'شرنك');
    setBarcode(p.barcode || '');
    setRoasts(p.roastLevels && p.roastLevels.length > 0 ? p.roastLevels : ['فاتح', 'وسط', 'غامق']);
    setIsIceCup(Boolean(p.isIceCup));
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const parsedPrice = Number(price);
    const parsedCost = Number(costPrice || 0);
    if (!cleanName || !Number.isFinite(parsedPrice) || parsedPrice < 0) return;

    const payload: Omit<Product, 'id'> = {
      categoryId: category.id,
      name: cleanName,
      price: Number(parsedPrice.toFixed(2)),
      costPrice: Number((Number.isFinite(parsedCost) && parsedCost >= 0 ? parsedCost : 0).toFixed(2)),
      active: true,
      ...(category.mode === 'weight'
        ? {
            roastLevels: roasts.length > 0 ? roasts : ['فاتح', 'وسط', 'غامق'],
            stockKg: Math.max(0, Number(stockKg) || 0),
            minStockKg: Math.max(0, Number(minStockKg) || 0),
          }
        : {}),
      ...(category.mode === 'fridge'
        ? {
            isIceCup,
            barcode: barcode.trim() || undefined,
            ...(isIceCup
              ? {}
              : {
                  stockUnits: Math.max(0, Math.round(Number(stockUnits) || 0)),
                  minStockUnits: Math.max(0, Math.round(Number(minStockUnits) || 0)),
                  unitsPerPack: Math.max(1, Math.round(Number(unitsPerPack) || 24)),
                  packLabel: packLabel.trim() || 'شرنك',
                }),
          }
        : {}),
    };

    if (editingProdId) {
      onUpdateProduct(editingProdId, payload);
    } else {
      onAddProduct(payload);
    }
    resetForm();
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (onVerifyAdmin(username, password)) {
      setAuthError('');
    } else {
      setAuthError('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  };

  const toggleRoast = (r: RoastLevel) => {
    setRoasts((prev) =>
      prev.includes(r) ? (prev.length > 1 ? prev.filter((x) => x !== r) : prev) : [...prev, r]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              تعديل فئة: {category.name}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              إضافة أزرار جديدة أو تعديل الأسعار والتكلفة مباشرة
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAdminUnlocked ? (
          <form onSubmit={handleAuth} className="p-6 max-w-sm mx-auto space-y-4">
            <div className="flex items-center gap-2 text-stone-800 dark:text-stone-200 font-semibold text-sm">
              <Lock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <span>تعديل الأسعار والأزرار يتطلب صلاحية الإدارة</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                اسم المستخدم
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
                placeholder="admin"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
                placeholder="••••"
                required
              />
            </div>
            {authError && <p className="text-xs font-semibold text-red-600 dark:text-red-400">{authError}</p>}
            <button
              type="submit"
              className="w-full rounded-lg bg-stone-900 dark:bg-amber-600 py-2.5 text-sm font-semibold text-white dark:text-stone-950 hover:bg-stone-800 dark:hover:bg-amber-500 cursor-pointer"
            >
              فتح التعديل
            </button>
          </form>
        ) : (
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Rename Category */}
            <div className="flex flex-wrap items-end gap-3 pb-4 border-b border-stone-200 dark:border-stone-800">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  اسم الفئة
                </label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (catName.trim()) onUpdateCategory(category.id, { name: catName.trim() });
                }}
                className="px-4 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-semibold text-stone-800 dark:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-700 cursor-pointer whitespace-nowrap"
              >
                حفظ اسم الفئة
              </button>
            </div>

            {/* Add / Edit Product Form */}
            <form
              onSubmit={handleSaveProduct}
              className="rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {editingProdId ? 'تعديل الصنف المحدد' : 'إضافة زر / صنف جديد في هذه الفئة'}
                </h4>
                {editingProdId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white cursor-pointer"
                  >
                    إلغاء التعديل
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    اسم الصنف
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={category.mode === 'weight' ? 'مثال: بن وسط محوج' : 'مثال: قهوة فرنساوي'}
                    className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    {category.mode === 'weight' ? 'سعر البيع للكيلو (ج.م)' : 'سعر البيع (ج.م)'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm font-num focus:border-amber-600 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    {category.mode === 'weight' ? 'التكلفة للكيلو (ج.م)' : 'سعر التكلفة (ج.م)'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm font-num focus:border-amber-600 focus:outline-none"
                  />
                </div>
              </div>

              {category.mode === 'weight' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      الرصيد الحالي بالمخزن (كيلو)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={stockKg}
                      onChange={(e) => setStockKg(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm font-num focus:border-amber-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      حد التنبيه الأحمر (كيلو)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={minStockKg}
                      onChange={(e) => setMinStockKg(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm font-num focus:border-amber-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                      درجات التحميص المتاحة
                    </label>
                    <div className="flex items-center gap-1.5">
                      {ALL_ROASTS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => toggleRoast(r)}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                            roasts.includes(r)
                              ? 'bg-amber-700 dark:bg-amber-600 border-amber-700 dark:border-amber-600 text-white dark:text-stone-950'
                              : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {category.mode === 'fridge' && (
                <div className="space-y-3 pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-stone-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isIceCup}
                      onChange={(e) => setIsIceCup(e.target.checked)}
                      className="rounded border-stone-300 dark:border-stone-600 text-amber-700 focus:ring-amber-700"
                    />
                    <span>هذا الزر خاص بـ «كوباية ثلج» (يخصم من مخزن الأكواب البلاستيك ويمكن جعل سعره 0 للمجاني)</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    {!isIceCup && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                            الرصيد (زجاجة/علبة)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={stockUnits}
                            onChange={(e) => setStockUnits(e.target.value)}
                            className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm font-num"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                            حد التنبيه (قطعة)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={minStockUnits}
                            onChange={(e) => setMinStockUnits(e.target.value)}
                            className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm font-num"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                            عدد القطع في الشرنك
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={unitsPerPack}
                            onChange={(e) => setUnitsPerPack(e.target.value)}
                            className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm font-num"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                            اسم العبوة (شرنك/بالتة)
                          </label>
                          <input
                            type="text"
                            value={packLabel}
                            onChange={(e) => setPackLabel(e.target.value)}
                            className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm"
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                        كود الباركود (اختياري)
                      </label>
                      <input
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        placeholder="6221000..."
                        className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm font-num"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-stone-900 dark:bg-amber-600 px-4 py-2 text-xs font-semibold text-white dark:text-stone-950 hover:bg-stone-800 dark:hover:bg-amber-500 cursor-pointer"
                >
                  {editingProdId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{editingProdId ? 'حفظ التعديلات' : 'إضافة الزر للفئة'}</span>
                </button>
              </div>
            </form>

            {/* Existing Buttons List */}
            <div>
              <h4 className="text-xs font-bold text-stone-500 dark:text-stone-400 mb-2">
                الأزرار والأصناف الحالية ({categoryProducts.length})
              </h4>
              <div className="border border-stone-200 dark:border-stone-800 rounded-lg divide-y divide-stone-200 dark:divide-stone-800 overflow-hidden">
                {categoryProducts.length === 0 ? (
                  <div className="p-6 text-center text-sm text-stone-500 dark:text-stone-400">
                    لا توجد أصناف في هذه الفئة بعد. أضف أول صنف من الأعلى.
                  </div>
                ) : (
                  categoryProducts.map((p, idx) => (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800/60"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs font-num font-bold text-stone-400 dark:text-stone-500 w-6 text-center">
                            #{idx + 1}
                          </span>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => onMoveProductOrder(p.id, 'up')}
                            className="p-1 rounded border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="تقديم للأعلى في شاشة البيع"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === categoryProducts.length - 1}
                            onClick={() => onMoveProductOrder(p.id, 'down')}
                            className="p-1 rounded border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="تأخير للأسفل في شاشة البيع"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                            <span>{p.name}</span>
                            {!p.active && <span className="text-xs text-stone-400">· مخفي</span>}
                          </div>
                          <div className="text-xs text-stone-500 dark:text-stone-400 font-num mt-0.5">
                            البيع: {formatCurrency(p.price)}
                            {category.mode === 'weight' ? '/كجم' : ''}
                            {' · '}
                            التكلفة: {formatCurrency(p.costPrice)}
                            {category.mode === 'weight' ? ` · حد التنبيه: ${p.minStockKg ?? 3} كجم` : ''}
                            {category.mode === 'fridge' && !p.isIceCup
                              ? ` · حد التنبيه: ${p.minStockUnits ?? 8} قطعة`
                              : ''}
                            {p.barcode ? ` · باركود: ${p.barcode}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onUpdateProduct(p.id, { active: !p.active })}
                          className="px-2.5 py-1.5 rounded border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                        >
                          {p.active ? 'إخفاء' : 'إظهار'}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditProduct(p)}
                          className="p-1.5 rounded border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                          title="تعديل"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProduct(p.id)}
                          className="p-1.5 rounded border border-stone-200 dark:border-stone-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
