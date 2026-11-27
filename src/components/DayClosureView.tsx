import React, { useState } from 'react';
import { CheckCircle2, Printer, LockKeyhole } from 'lucide-react';
import { DayClosure, ExpenseRecord } from '../types';
import { ShiftSummary } from '../store/usePosStore';
import { formatCurrency, formatDateTime } from '../utils/format';

interface Props {
  summary: ShiftSummary;
  openedAt: string;
  shiftExpenses: ExpenseRecord[];
  pastClosures: DayClosure[];
  onSetOpeningCash: (amount: number) => void;
  onCloseDay: (actualDrawerCash: number, nextOpeningCash: number, notes?: string) => DayClosure;
  onPrintClosure: (closure: DayClosure) => void;
}

export const DayClosureView: React.FC<Props> = ({
  summary,
  openedAt,
  shiftExpenses,
  pastClosures,
  onSetOpeningCash,
  onCloseDay,
  onPrintClosure,
}) => {
  const [openingInput, setOpeningInput] = useState(String(summary.openingCash));
  const [actualCashStr, setActualCashStr] = useState(String(summary.expectedDrawerCash));
  const [nextOpeningStr, setNextOpeningStr] = useState(String(summary.openingCash));
  const [notes, setNotes] = useState('');
  const [closedBanner, setClosedBanner] = useState<string | null>(null);

  const actualCashNum = Number(actualCashStr);
  const hasActual = actualCashStr !== '' && Number.isFinite(actualCashNum);
  const drawerDiff = hasActual
    ? Number((actualCashNum - summary.expectedDrawerCash).toFixed(2))
    : 0;

  const buildPreviewClosure = (): DayClosure => ({
    id: 'preview',
    shiftId: 'current',
    openedAt,
    closedAt: new Date().toISOString(),
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
    actualDrawerCash: hasActual ? actualCashNum : summary.expectedDrawerCash,
    drawerDiff,
    totalSales: summary.totalSales,
    totalCost: summary.totalCost,
    estimatedProfit: summary.estimatedProfit,
    salesCount: summary.salesCount,
    expensesCount: summary.expensesCount,
    categoryBreakdown: summary.categoryBreakdown,
    notes: notes.trim() || undefined,
  });

  const handleConfirmClose = (shouldPrint: boolean) => {
    const finalActual = hasActual ? actualCashNum : summary.expectedDrawerCash;
    const nextOpen = Number(nextOpeningStr);
    const closed = onCloseDay(
      finalActual,
      Number.isFinite(nextOpen) && nextOpen >= 0 ? nextOpen : 0,
      notes
    );
    setNotes('');
    setOpeningInput(String(Number.isFinite(nextOpen) && nextOpen >= 0 ? nextOpen : 0));
    setActualCashStr(String(Number.isFinite(nextOpen) && nextOpen >= 0 ? nextOpen : 0));
    setClosedBanner('تم تقفيل اليوم وحفظ التقرير في السجل، وبدء وردية جديدة بنجاح');
    setTimeout(() => setClosedBanner(null), 4000);
    if (shouldPrint) {
      onPrintClosure(closed);
    }
  };

  return (
    <div className="space-y-4">
      {closedBanner && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{closedBanner}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">إجمالي مبيعات اليوم</div>
          <div className="text-2xl font-bold font-num text-stone-900 dark:text-stone-100 mt-1">
            {formatCurrency(summary.totalSales)}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-num">
            {summary.salesCount} فاتورة · منذ {formatDateTime(openedAt)}
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">
            مصروفات اليوم (تُخصم تلقائياً)
          </div>
          <div className="text-2xl font-bold font-num text-red-700 dark:text-red-400 mt-1">
            -{formatCurrency(summary.totalExpenses)}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-num">
            {summary.expensesCount} بند مصروفات مسجل
          </div>
        </div>

        <div className="bg-stone-900 dark:bg-stone-900 border border-stone-800 dark:border-amber-700/60 text-white rounded-xl p-4">
          <div className="text-xs font-semibold text-stone-300">صافي النقدية المفترض في الخزينة</div>
          <div className="text-2xl font-bold font-num text-amber-300 dark:text-amber-400 mt-1">
            {formatCurrency(summary.expectedDrawerCash)}
          </div>
          <div className="text-xs text-stone-400 mt-0.5">
            عهدة + مبيعات وتحصيلات كاش − المصروفات
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">
            صافي الربح التقديري اليوم
          </div>
          <div
            className={`text-2xl font-bold font-num mt-1 ${
              summary.estimatedProfit >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-red-700 dark:text-red-400'
            }`}
          >
            {formatCurrency(summary.estimatedProfit)}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-num">
            بعد خصم التكلفة ({formatCurrency(summary.totalCost)}) والمصروفات
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                تفصيل حسابات اليوم والخزينة
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-600 dark:text-stone-400">عهدة بداية الدرج:</span>
                <input
                  type="number"
                  min="0"
                  value={openingInput}
                  onChange={(e) => setOpeningInput(e.target.value)}
                  className="w-24 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-2.5 py-1 text-xs font-num font-bold"
                />
                <button
                  type="button"
                  onClick={() => onSetOpeningCash(Number(openingInput) || 0)}
                  className="px-2.5 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-xs font-semibold text-stone-800 dark:text-stone-100 cursor-pointer"
                >
                  تعديل
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-stone-600 dark:text-stone-400">رصيد بداية الدرج (العهدة)</span>
                <span className="font-num font-semibold text-stone-900 dark:text-stone-100">
                  {formatCurrency(summary.openingCash)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-stone-600 dark:text-stone-400">مبيعات الكاش المباشرة</span>
                <span className="font-num font-semibold text-stone-900 dark:text-stone-100">
                  +{formatCurrency(summary.cashSales)}
                </span>
              </div>
              {summary.creditDownPaymentsCash > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-stone-600 dark:text-stone-400">مقدمات مبيعات الآجل (كاش)</span>
                  <span className="font-num font-semibold text-stone-900 dark:text-stone-100">
                    +{formatCurrency(summary.creditDownPaymentsCash)}
                  </span>
                </div>
              )}
              {summary.creditCashCollections > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-stone-600 dark:text-stone-400">تحصيلات دفتر الآجل (كاش)</span>
                  <span className="font-num font-semibold text-emerald-700 dark:text-emerald-400">
                    +{formatCurrency(summary.creditCashCollections)}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-red-700 dark:text-red-400 font-medium">
                  يُخصم: إجمالي مصروفات اليوم
                </span>
                <span className="font-num font-bold text-red-700 dark:text-red-400">
                  -{formatCurrency(summary.totalExpenses)}
                </span>
              </div>
              <div className="flex justify-between pt-2.5 mt-1 border-t border-stone-300 dark:border-stone-700 text-base font-bold text-stone-900 dark:text-stone-100">
                <span>صافي النقدية المفترض وجوده في الدرج</span>
                <span className="font-num text-amber-800 dark:text-amber-400">
                  {formatCurrency(summary.expectedDrawerCash)}
                </span>
              </div>
            </div>

            <div className="border-t border-stone-200 dark:border-stone-800 pt-4">
              <div className="text-xs font-bold text-stone-500 dark:text-stone-400 mb-2">
                المحافظ الإلكترونية والآجل (خارج الدرج النقدي)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-sm">
                <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 p-3">
                  <div className="text-xs text-stone-500 dark:text-stone-400">فودافون كاش</div>
                  <div className="font-num font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                    {formatCurrency(summary.vodafoneSales)}
                  </div>
                </div>
                <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 p-3">
                  <div className="text-xs text-stone-500 dark:text-stone-400">إنستا باي</div>
                  <div className="font-num font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                    {formatCurrency(summary.instapaySales)}
                  </div>
                </div>
                <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 p-3">
                  <div className="text-xs text-stone-500 dark:text-stone-400">آجل جديد (متبقي)</div>
                  <div className="font-num font-bold text-amber-800 dark:text-amber-400 mt-0.5">
                    {formatCurrency(summary.creditSalesTotal)}
                  </div>
                </div>
              </div>
            </div>

            {summary.categoryBreakdown.length > 0 && (
              <div className="border-t border-stone-200 dark:border-stone-800 pt-4">
                <div className="text-xs font-bold text-stone-500 dark:text-stone-400 mb-2">
                  المبيعات اليوم حسب كل فئة
                </div>
                <div className="divide-y divide-stone-100 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
                  {summary.categoryBreakdown.map((row) => (
                    <div
                      key={row.categoryId}
                      className="flex justify-between px-3.5 py-2 text-xs bg-white dark:bg-stone-950/50"
                    >
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        {row.categoryName}
                      </span>
                      <span className="font-num font-bold text-stone-900 dark:text-stone-100">
                        {formatCurrency(row.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {shiftExpenses.length > 0 && (
              <div className="border-t border-stone-200 dark:border-stone-800 pt-4">
                <div className="text-xs font-bold text-stone-500 dark:text-stone-400 mb-2">
                  بنود المصروفات المخصومة اليوم
                </div>
                <div className="divide-y divide-stone-100 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
                  {shiftExpenses.map((e) => (
                    <div
                      key={e.id}
                      className="flex justify-between px-3.5 py-2 text-xs bg-white dark:bg-stone-950/50"
                    >
                      <span className="text-stone-700 dark:text-stone-300">
                        <strong>{e.category}</strong>
                        {e.description !== e.category ? ` — ${e.description}` : ''}
                      </span>
                      <span className="font-num font-semibold text-red-700 dark:text-red-400">
                        -{formatCurrency(e.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <LockKeyhole className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                عدّ الدرج وتقفيل اليوم
              </h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                النقدية الفعلية الموجودة في الدرج الآن (ج.م)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={actualCashStr}
                onChange={(e) => setActualCashStr(e.target.value)}
                className="w-full h-11 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3.5 text-lg font-num font-bold focus:border-amber-600 focus:outline-none"
              />
            </div>

            <div
              className={`rounded-lg border p-3.5 flex items-center justify-between text-sm font-bold ${
                !hasActual
                  ? 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-500'
                  : drawerDiff === 0
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                    : drawerDiff < 0
                      ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300'
                      : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
              }`}
            >
              <span>حالة الدرج</span>
              <span className="font-num">
                {!hasActual
                  ? 'أدخل المبلغ الفعلي'
                  : drawerDiff === 0
                    ? 'الدرج مظبوط 100% ✓'
                    : drawerDiff < 0
                      ? `عجز ${formatCurrency(drawerDiff)}`
                      : `زيادة +${formatCurrency(drawerDiff)}`}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                عهدة بداية الوردية القادمة (ج.م)
              </label>
              <input
                type="number"
                min="0"
                value={nextOpeningStr}
                onChange={(e) => setNextOpeningStr(e.target.value)}
                className="w-full h-10 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 text-sm font-num font-bold focus:border-amber-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                ملاحظات التقفيل (اختياري)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: تم تسليم الإيراد لصاحب المحل"
                className="w-full h-10 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 text-sm"
              />
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => onPrintClosure(buildPreviewClosure())}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 py-2.5 text-sm font-bold cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة ورقة تقفيل اليوم فقط</span>
              </button>

              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-500 text-white dark:text-stone-950 py-3 text-sm font-bold cursor-pointer"
              >
                <span>تقفيل اليوم وطباعة وبدء يوم جديد</span>
              </button>

              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="w-full rounded-lg bg-amber-700 dark:bg-stone-800 dark:border dark:border-stone-700 hover:bg-amber-800 dark:hover:bg-stone-700 text-white dark:text-stone-200 py-2.5 text-xs font-bold cursor-pointer"
              >
                تقفيل اليوم بدون طباعة
              </button>
            </div>
          </div>

          {pastClosures.length > 0 && (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80">
                <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  آخر التقفيلات المسجلة
                </h4>
              </div>
              <div className="divide-y divide-stone-100 dark:divide-stone-800 max-h-[260px] overflow-y-auto">
                {pastClosures.slice(0, 6).map((c) => (
                  <div
                    key={c.id}
                    className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-bold text-stone-900 dark:text-stone-100 font-num">
                        مبيعات: {formatCurrency(c.totalSales)} · صافي ربح: {formatCurrency(c.estimatedProfit)}
                      </div>
                      <div className="text-stone-500 dark:text-stone-400 font-num mt-0.5">
                        {formatDateTime(c.closedAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPrintClosure(c)}
                      className="p-1.5 rounded border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                      title="طباعة ورقة التقفيل"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
