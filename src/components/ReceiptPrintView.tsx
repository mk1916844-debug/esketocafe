import React from 'react';
import { DayClosure, SaleRecord, ShopSettings } from '../types';
import {
  formatCurrency,
  formatDateTime,
  formatWeightGrams,
  paymentMethodLabel,
} from '../utils/format';

export interface PeriodReportPrintData {
  title: string;
  rangeLabel: string;
  totalSales: number;
  salesCount: number;
  avgTicket: number;
  totalCost: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  cashSales: number;
  vodafoneSales: number;
  instapaySales: number;
  creditNew: number;
  creditCollectionsCash: number;
  creditCollectionsWallet: number;
  netCashFlow: number;
  categoryRows: { name: string; revenue: number; cost: number; profit: number; qtyLabel: string }[];
  expenseRows: { category: string; amount: number }[];
}

export type PrintDocument =
  | { type: 'sale'; sale: SaleRecord }
  | { type: 'closure'; closure: DayClosure }
  | { type: 'period_report'; report: PeriodReportPrintData }
  | null;

interface Props {
  doc: PrintDocument;
  settings: ShopSettings;
}

export const ReceiptPrintView: React.FC<Props> = ({ doc, settings }) => {
  if (!doc) return null;

  if (doc.type === 'sale') {
    const { sale } = doc;
    return (
      <div className="print-only hidden max-w-[80mm] mx-auto text-black text-xs leading-relaxed p-2 font-sans" dir="rtl">
        <div className="text-center border-b border-dashed border-black pb-2 mb-2">
          <div className="text-base font-bold">{settings.shopName}</div>
          {settings.shopSubtitle && <div className="text-[11px]">{settings.shopSubtitle}</div>}
          {settings.phone && <div className="text-[11px] font-num">هاتف: {settings.phone}</div>}
        </div>

        <div className="flex justify-between text-[11px] mb-1">
          <span>رقم الفاتورة: <strong className="font-num">#{sale.receiptNo}</strong></span>
          <span>الدفع: <strong>{paymentMethodLabel(sale.paymentMethod)}</strong></span>
        </div>
        <div className="text-[11px] mb-2 border-b border-dashed border-black pb-2">
          التاريخ: {formatDateTime(sale.timestamp)}
          {sale.customerName && <div>العميل: <strong>{sale.customerName}</strong></div>}
        </div>

        <table className="w-full text-[11px] mb-2">
          <thead>
            <tr className="border-b border-black">
              <th className="text-right py-1">الصنف</th>
              <th className="text-center py-1">الكمية/الوزن</th>
              <th className="text-left py-1">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id} className="border-b border-dotted border-black/40">
                <td className="py-1">
                  <div className="font-semibold">
                    {item.name}
                    {item.roast ? ` (${item.roast})` : ''}
                    {item.note ? ` — سكر ${item.note}` : ''}
                  </div>
                </td>
                <td className="text-center py-1 font-num">
                  {item.mode === 'weight' && item.weightGrams
                    ? `${formatWeightGrams(item.weightGrams)}${item.qty > 1 ? ` ×${item.qty}` : ''}`
                    : item.qty}
                </td>
                <td className="text-left py-1 font-num">{formatCurrency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-black pt-2 space-y-1 text-xs">
          <div className="flex justify-between font-bold text-sm">
            <span>الإجمالي</span>
            <span className="font-num">{formatCurrency(sale.total)}</span>
          </div>
          {sale.paymentMethod === 'credit' && (
            <>
              <div className="flex justify-between">
                <span>المدفوع الآن</span>
                <span className="font-num">{formatCurrency(sale.paidNow)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>المتبقي آجل</span>
                <span className="font-num">{formatCurrency(sale.creditRemaining)}</span>
              </div>
            </>
          )}
        </div>

        {settings.receiptFooter && (
          <div className="text-center text-[11px] border-t border-dashed border-black mt-3 pt-2">
            {settings.receiptFooter}
          </div>
        )}
      </div>
    );
  }

  if (doc.type === 'closure') {
    const { closure } = doc;
    return (
      <div className="print-only hidden max-w-[80mm] mx-auto text-black text-xs leading-relaxed p-2" dir="rtl">
        <div className="text-center border-b border-dashed border-black pb-2 mb-2">
          <div className="text-base font-bold">{settings.shopName}</div>
          <div className="text-sm font-bold mt-0.5">ورقة تقفيل اليوم</div>
          <div className="text-[11px]">{formatDateTime(closure.closedAt)}</div>
        </div>

        <div className="space-y-1 border-b border-dashed border-black pb-2 mb-2">
          <div className="flex justify-between"><span>عدد الفواتير</span><strong className="font-num">{closure.salesCount}</strong></div>
          <div className="flex justify-between"><span>إجمالي المبيعات</span><strong className="font-num">{formatCurrency(closure.totalSales)}</strong></div>
          <div className="flex justify-between"><span>مبيعات كاش</span><span className="font-num">{formatCurrency(closure.cashSales)}</span></div>
          <div className="flex justify-between"><span>فودافون كاش</span><span className="font-num">{formatCurrency(closure.vodafoneSales)}</span></div>
          <div className="flex justify-between"><span>إنستا باي</span><span className="font-num">{formatCurrency(closure.instapaySales)}</span></div>
          <div className="flex justify-between"><span>مبيعات آجل (متبقي)</span><span className="font-num">{formatCurrency(closure.creditSalesTotal)}</span></div>
          {closure.creditDownPaymentsCash > 0 && (
            <div className="flex justify-between"><span>مقدمات آجل كاش</span><span className="font-num">{formatCurrency(closure.creditDownPaymentsCash)}</span></div>
          )}
          {closure.creditCashCollections > 0 && (
            <div className="flex justify-between"><span>تحصيل آجل كاش</span><span className="font-num">{formatCurrency(closure.creditCashCollections)}</span></div>
          )}
        </div>

        <div className="space-y-1 border-b border-dashed border-black pb-2 mb-2">
          <div className="flex justify-between"><span>بداية الدرج (عهدة)</span><span className="font-num">{formatCurrency(closure.openingCash)}</span></div>
          <div className="flex justify-between"><span>إجمالي المصروفات ({closure.expensesCount})</span><strong className="font-num">-{formatCurrency(closure.totalExpenses)}</strong></div>
          <div className="flex justify-between font-bold text-sm pt-1">
            <span>صافي النقدية بالدرج</span>
            <span className="font-num">{formatCurrency(closure.expectedDrawerCash)}</span>
          </div>
          <div className="flex justify-between"><span>الجرد الفعلي</span><span className="font-num">{formatCurrency(closure.actualDrawerCash)}</span></div>
          <div className="flex justify-between font-semibold">
            <span>الفرق (عجز / زيادة)</span>
            <span className="font-num">{closure.drawerDiff >= 0 ? `+${formatCurrency(closure.drawerDiff)}` : formatCurrency(closure.drawerDiff)}</span>
          </div>
        </div>

        <div className="flex justify-between font-bold text-sm border-b border-dashed border-black pb-2 mb-2">
          <span>صافي الربح التقديري</span>
          <span className="font-num">{formatCurrency(closure.estimatedProfit)}</span>
        </div>

        {closure.categoryBreakdown.length > 0 && (
          <div className="space-y-1 text-[11px]">
            <div className="font-bold">توزيع المبيعات حسب الفئة:</div>
            {closure.categoryBreakdown.map((b) => (
              <div key={b.categoryId} className="flex justify-between">
                <span>{b.categoryName}</span>
                <span className="font-num">{formatCurrency(b.revenue)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Period financial report
  const { report } = doc;
  return (
    <div className="print-only hidden max-w-[190mm] mx-auto text-black text-xs leading-relaxed p-4" dir="rtl">
      <div className="border-b-2 border-black pb-3 mb-4 flex justify-between items-end">
        <div>
          <div className="text-lg font-bold">{settings.shopName}</div>
          <div className="text-sm font-semibold">{report.title}</div>
        </div>
        <div className="text-left text-xs">
          <div>الفترة: {report.rangeLabel}</div>
          <div>تاريخ الطباعة: {formatDateTime(new Date().toISOString())}</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4 border border-black p-3">
        <div>
          <div className="text-[11px]">إجمالي المبيعات ({report.salesCount} فاتورة)</div>
          <div className="text-sm font-bold font-num">{formatCurrency(report.totalSales)}</div>
        </div>
        <div>
          <div className="text-[11px]">تكلفة البضاعة</div>
          <div className="text-sm font-bold font-num">{formatCurrency(report.totalCost)}</div>
        </div>
        <div>
          <div className="text-[11px]">إجمالي المصروفات</div>
          <div className="text-sm font-bold font-num">{formatCurrency(report.totalExpenses)}</div>
        </div>
        <div>
          <div className="text-[11px]">صافي الربح</div>
          <div className="text-sm font-bold font-num">{formatCurrency(report.netProfit)}</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="font-bold mb-1">تفصيل طرق التحصيل والتدفقات النقدية</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 border-t border-black pt-2">
          <div className="flex justify-between"><span>كاش</span><span className="font-num">{formatCurrency(report.cashSales)}</span></div>
          <div className="flex justify-between"><span>فودافون كاش</span><span className="font-num">{formatCurrency(report.vodafoneSales)}</span></div>
          <div className="flex justify-between"><span>إنستا باي</span><span className="font-num">{formatCurrency(report.instapaySales)}</span></div>
          <div className="flex justify-between"><span>مبيعات آجل جديدة</span><span className="font-num">{formatCurrency(report.creditNew)}</span></div>
          <div className="flex justify-between"><span>تحصيلات آجل (كاش)</span><span className="font-num">{formatCurrency(report.creditCollectionsCash)}</span></div>
          <div className="flex justify-between"><span>تحصيلات آجل (محافظ)</span><span className="font-num">{formatCurrency(report.creditCollectionsWallet)}</span></div>
          <div className="flex justify-between font-bold col-span-2 border-t border-dashed border-black pt-1 mt-1">
            <span>صافي النقدية الداخلة للخزينة بعد المصروفات</span>
            <span className="font-num">{formatCurrency(report.netCashFlow)}</span>
          </div>
        </div>
      </div>

      {report.categoryRows.length > 0 && (
        <div className="mb-4">
          <div className="font-bold mb-1">أداء الأقسام والفئات</div>
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="border-b border-black">
                <th className="text-right p-1.5">الفئة</th>
                <th className="text-center p-1.5">المباع</th>
                <th className="text-left p-1.5">المبيعات</th>
                <th className="text-left p-1.5">التكلفة</th>
                <th className="text-left p-1.5">الربح</th>
              </tr>
            </thead>
            <tbody>
              {report.categoryRows.map((row) => (
                <tr key={row.name} className="border-b border-black/30">
                  <td className="p-1.5">{row.name}</td>
                  <td className="p-1.5 text-center font-num">{row.qtyLabel}</td>
                  <td className="p-1.5 text-left font-num">{formatCurrency(row.revenue)}</td>
                  <td className="p-1.5 text-left font-num">{formatCurrency(row.cost)}</td>
                  <td className="p-1.5 text-left font-num font-bold">{formatCurrency(row.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.expenseRows.length > 0 && (
        <div>
          <div className="font-bold mb-1">تفصيل المصروفات</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 border-t border-black pt-2">
            {report.expenseRows.map((row) => (
              <div key={row.category} className="flex justify-between">
                <span>{row.category}</span>
                <span className="font-num">{formatCurrency(row.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
