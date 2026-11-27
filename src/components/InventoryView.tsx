import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  PackagePlus,
  Snowflake,
} from 'lucide-react';
import { Category, Product } from '../types';

interface Props {
  categories: Category[];
  products: Product[];
  plasticCupsStock: number;
  minPlasticCups: number;
  onRestockFridgePacks: (productId: string, packsCount: number) => void;
  onRestockFridgeUnits: (productId: string, unitsCount: number) => void;
  onApplyFridgeAudit: (countsByProductId: Record<string, number>) => void;
  onAdjustPlasticCups: (delta: number) => void;
}

type InventorySubTab = 'fridge' | 'audit';

export const InventoryView: React.FC<Props> = ({
  categories,
  products,
  plasticCupsStock,
  minPlasticCups,
  onRestockFridgePacks,
  onRestockFridgeUnits,
  onApplyFridgeAudit,
  onAdjustPlasticCups,
}) => {
  const [subTab, setSubTab] = useState<InventorySubTab>('fridge');
  const [packInputs, setPackInputs] = useState<Record<string, string>>({});
  const [unitInputs, setUnitInputs] = useState<Record<string, string>>({});
  const [cupsAddStr, setCupsAddStr] = useState('100');
  const [auditInputs, setAuditInputs] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  const catModeMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const fridgeProducts = useMemo(
    () =>
      products
        .filter((p) => catModeMap.get(p.categoryId)?.mode === 'fridge' && !p.isIceCup)
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
    [products, catModeMap]
  );

  const totalFridgeUnits = useMemo(
    () => fridgeProducts.reduce((sum, p) => sum + (p.stockUnits || 0), 0),
    [fridgeProducts]
  );

  const lowStockCount = useMemo(() => {
    const lowFridge = fridgeProducts.filter(
      (p) => (p.stockUnits || 0) <= (p.minStockUnits ?? 8)
    ).length;
    const lowCups = plasticCupsStock <= minPlasticCups ? 1 : 0;
    return lowFridge + lowCups;
  }, [fridgeProducts, plasticCupsStock, minPlasticCups]);

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleApplyAudit = () => {
    const updates: Record<string, number> = {};
    fridgeProducts.forEach((p) => {
      const val = auditInputs[p.id];
      if (val !== undefined && val !== '') {
        const parsed = Number(val);
        if (Number.isFinite(parsed) && parsed >= 0) {
          updates[p.id] = Math.round(parsed);
        }
      }
    });
    if (Object.keys(updates).length === 0) return;
    onApplyFridgeAudit(updates);
    setAuditInputs({});
    notify('تم اعتماد وتسوية جرد التلاجة بنجاح');
  };

  return (
    <div className="space-y-4">
      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">
            إجمالي رصيد التلاجة
          </div>
          <div className="text-2xl font-bold font-num text-stone-900 dark:text-stone-100 mt-1">
            {totalFridgeUnits}{' '}
            <span className="text-sm font-normal text-stone-500 dark:text-stone-400">
              زجاجة / علبة
            </span>
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-num">
            {fridgeProducts.length} صنف تلاجة مسجل
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">
            أكواب البلاستيك (كوباية ثلج)
          </div>
          <div
            className={`text-2xl font-bold font-num mt-1 ${
              plasticCupsStock <= minPlasticCups
                ? 'text-red-600 dark:text-red-400'
                : 'text-stone-900 dark:text-stone-100'
            }`}
          >
            {plasticCupsStock}{' '}
            <span className="text-sm font-normal text-stone-500 dark:text-stone-400">كوب</span>
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-num">
            ينبه عند أقل من {minPlasticCups} كوب
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">
            تنبيهات نقص التلاجة
          </div>
          <div
            className={`text-2xl font-bold font-num mt-1 ${
              lowStockCount > 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {lowStockCount}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {lowStockCount > 0 ? 'أصناف اقتربت من النفاد وتظهر باللون الأحمر في البيع' : 'كل أصناف التلاجة متوفرة'}
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubTab('fridge')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              subTab === 'fridge'
                ? 'bg-stone-900 dark:bg-amber-600 text-white dark:text-stone-950'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            استلام ومخزن التلاجة (بالشرنك والواحدة)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('audit')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              subTab === 'audit'
                ? 'bg-amber-700 dark:bg-amber-600 text-white dark:text-stone-950'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>جرد التلاجة السريع في دقيقة</span>
          </button>
        </div>

        <span className="text-xs text-stone-500 dark:text-stone-400 px-2">
          مخزون البن والأسعار يُدار بالكامل من صفحة الإدارة
        </span>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-4 py-2.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* SUB-TAB 1: FRIDGE STOCK BY SHRINK / PACK & UNITS + PLASTIC CUPS */}
      {subTab === 'fridge' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-700 dark:text-sky-400">
                <Snowflake className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  مخزن الأكواب البلاستيك (لزرار كوباية ثلج)
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-num">
                  الرصيد الحالي:{' '}
                  <strong
                    className={
                      plasticCupsStock <= minPlasticCups
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-stone-900 dark:text-stone-100'
                    }
                  >
                    {plasticCupsStock} كوب
                  </strong>{' '}
                  · يُخصم 1 كوب تلقائياً مع كل ضغطة على كوباية ثلج
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={cupsAddStr}
                onChange={(e) => setCupsAddStr(e.target.value)}
                className="w-24 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-xs font-num font-bold"
              />
              <button
                type="button"
                onClick={() => {
                  const n = Number(cupsAddStr);
                  if (n > 0) {
                    onAdjustPlasticCups(n);
                    notify(`تمت إضافة ${n} كوب بلاستيك للمخزن`);
                  }
                }}
                className="px-3.5 py-2 rounded-lg bg-stone-900 dark:bg-amber-600 text-white dark:text-stone-950 text-xs font-semibold hover:bg-stone-800 dark:hover:bg-amber-500 cursor-pointer whitespace-nowrap"
              >
                + إضافة أكواب
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                استلام بضاعة التلاجة بالشرنك / البالتة (يتحول تلقائياً إلى زجاجات/علب)
              </h3>
              <span className="text-xs text-stone-500 dark:text-stone-400">
                مثال: 5 شرنك مياه × 20 = 100 زجاجة
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800 text-xs text-stone-500 dark:text-stone-400 bg-stone-50/50 dark:bg-stone-950/40">
                    <th className="text-right py-3 px-4 font-semibold">الصنف</th>
                    <th className="text-right py-3 px-4 font-semibold">محتوى العبوة</th>
                    <th className="text-right py-3 px-4 font-semibold">الرصيد الحالي</th>
                    <th className="text-left py-3 px-4 font-semibold">استلام بالشرنك / البالتة</th>
                    <th className="text-left py-3 px-4 font-semibold">إضافة بالواحدة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {fridgeProducts.map((prod) => {
                    const perPack = prod.unitsPerPack || 24;
                    const packLabel = prod.packLabel || 'شرنك';
                    const stock = prod.stockUnits ?? 0;
                    const minUnits = prod.minStockUnits ?? 8;
                    const isLow = stock <= minUnits;
                    const packVal = packInputs[prod.id] ?? '';
                    const packNum = Number(packVal);
                    const previewUnits =
                      Number.isFinite(packNum) && packNum > 0 ? Math.round(packNum * perPack) : 0;
                    const unitVal = unitInputs[prod.id] ?? '';

                    return (
                      <tr key={prod.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40">
                        <td className="py-3 px-4">
                          <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                            <span>{prod.name}</span>
                            {isLow && (
                              <AlertTriangle
                                className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0"
                                aria-label="قارب على النفاد"
                              />
                            )}
                          </div>
                          {prod.barcode && (
                            <div className="text-[11px] text-stone-400 dark:text-stone-500 font-num">
                              باركود: {prod.barcode}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-stone-600 dark:text-stone-300 font-num">
                          1 {packLabel} = <strong>{perPack}</strong> قطعة
                        </td>
                        <td className="py-3 px-4">
                          <div
                            className={`font-num font-bold ${
                              isLow
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-stone-900 dark:text-stone-100'
                            }`}
                          >
                            {stock} قطعة
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400 font-num">
                            ({(stock / perPack).toFixed(1)} {packLabel}) · تنبيه عند {minUnits}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              min="1"
                              value={packVal}
                              onChange={(e) =>
                                setPackInputs((prev) => ({ ...prev, [prod.id]: e.target.value }))
                              }
                              placeholder={`عدد ${packLabel}`}
                              className="w-24 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-2.5 py-1.5 text-xs font-num"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (previewUnits <= 0) return;
                                onRestockFridgePacks(prod.id, packNum);
                                setPackInputs((prev) => ({ ...prev, [prod.id]: '' }));
                                notify(
                                  `تم استلام ${packNum} ${packLabel} (${previewUnits} قطعة) من ${prod.name}`
                                );
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-700 dark:bg-amber-600 hover:bg-amber-800 dark:hover:bg-amber-500 text-white dark:text-stone-950 text-xs font-semibold cursor-pointer whitespace-nowrap"
                            >
                              <PackagePlus className="w-3.5 h-3.5" />
                              <span>{previewUnits > 0 ? `+${previewUnits} قطعة` : `إضافة ${packLabel}`}</span>
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              value={unitVal}
                              onChange={(e) =>
                                setUnitInputs((prev) => ({ ...prev, [prod.id]: e.target.value }))
                              }
                              placeholder="عدد"
                              className="w-16 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-2 py-1.5 text-xs font-num"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const n = Number(unitVal);
                                if (!Number.isFinite(n) || n === 0) return;
                                onRestockFridgeUnits(prod.id, n);
                                setUnitInputs((prev) => ({ ...prev, [prod.id]: '' }));
                                notify(`تم تحديث رصيد ${prod.name}`);
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-xs font-semibold text-stone-800 dark:text-stone-100 cursor-pointer"
                            >
                              تحديث
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: 1-MINUTE FRIDGE AUDIT */}
      {subTab === 'audit' && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                جرد التلاجة السريع في دقيقة واحدة
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                بص في التلاجة بعينك وسجّل العدد الفعلي لكل صنف لمطابقة الرصيد واكتشاف أي عجز فوراً
              </p>
            </div>
            <button
              type="button"
              onClick={handleApplyAudit}
              disabled={Object.keys(auditInputs).length === 0}
              className="px-4 py-2 rounded-lg bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-500 disabled:opacity-40 text-white dark:text-stone-950 text-xs font-bold cursor-pointer whitespace-nowrap"
            >
              اعتماد وتسوية الجرد الفعلي
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:gap-px bg-stone-200 dark:bg-stone-800">
            {fridgeProducts.map((prod) => {
              const expected = prod.stockUnits ?? 0;
              const rawVal = auditInputs[prod.id] ?? '';
              const hasVal = rawVal !== '';
              const actual = Number(rawVal);
              const diff = hasVal && Number.isFinite(actual) ? Math.round(actual) - expected : 0;

              return (
                <div
                  key={prod.id}
                  className="bg-white dark:bg-stone-900 p-4 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-bold text-stone-900 dark:text-stone-100">{prod.name}</div>
                    <div className="text-xs text-stone-600 dark:text-stone-400 mt-1 font-num">
                      المفروض في التلاجة:{' '}
                      <strong className="text-stone-900 dark:text-stone-100 text-sm">{expected}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-24">
                      <input
                        type="number"
                        min="0"
                        value={rawVal}
                        onChange={(e) =>
                          setAuditInputs((prev) => ({ ...prev, [prod.id]: e.target.value }))
                        }
                        placeholder="العدد الفعلي"
                        className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-2.5 py-2 text-sm font-num font-bold text-center focus:border-amber-600 focus:outline-none"
                      />
                    </div>
                    <div className="w-20 text-left text-xs font-bold font-num">
                      {!hasVal ? (
                        <span className="text-stone-400 dark:text-stone-600 font-normal">—</span>
                      ) : diff === 0 ? (
                        <span className="text-emerald-700 dark:text-emerald-400">مظبوط ✓</span>
                      ) : diff < 0 ? (
                        <span className="text-red-600 dark:text-red-400">عجز {diff}</span>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-400">زيادة +{diff}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
