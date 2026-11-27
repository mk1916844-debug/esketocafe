import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Clock, TrendingUp } from 'lucide-react';
import { ExpenseRecord, SaleRecord } from '../types';
import { formatCurrency } from '../utils/format';

interface Props {
  sales: SaleRecord[];
  expenses: ExpenseRecord[];
  selectedDayStr: string;
  periodStartMs: number;
  periodEndMs: number;
  periodLabel: string;
}

interface HourlyPoint {
  hour: number;
  label: string;
  fullLabel: string;
  sales: number;
  profit: number;
  invoices: number;
}

interface DailyPoint {
  dateKey: string;
  shortLabel: string;
  dayName: string;
  fullDate: string;
  sales: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  invoices: number;
}

const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function formatLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatHourShort(hour: number): string {
  if (hour === 0) return '12 ص';
  if (hour < 12) return `${hour} ص`;
  if (hour === 12) return '12 م';
  return `${hour - 12} م`;
}

function formatHourFull(hour: number): string {
  if (hour === 0) return '12:00 صباحاً';
  if (hour < 12) return `${hour}:00 صباحاً`;
  if (hour === 12) return '12:00 ظهراً';
  return `${hour - 12}:00 مساءً`;
}

function formatCompactAxis(val: number): string {
  if (val >= 1000) {
    const k = val / 1000;
    return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`;
  }
  return String(Math.round(val));
}

const HourlyTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload: HourlyPoint }>;
}> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0].payload;
  return (
    <div
      dir="rtl"
      className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2.5 shadow-lg text-xs space-y-1 min-w-[168px]"
    >
      <div className="font-bold text-stone-900 dark:text-stone-100 border-b border-stone-100 dark:border-stone-800 pb-1">
        الساعة {pt.fullLabel}
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-stone-500 dark:text-stone-400">المبيعات:</span>
        <span className="font-num font-bold text-amber-700 dark:text-amber-400">
          {formatCurrency(pt.sales)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-stone-500 dark:text-stone-400">مجمل الربح:</span>
        <span className="font-num font-bold text-emerald-700 dark:text-emerald-400">
          {formatCurrency(pt.profit)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-stone-500 dark:text-stone-400">عدد الفواتير:</span>
        <span className="font-num font-semibold text-stone-800 dark:text-stone-200">
          {pt.invoices} فاتورة
        </span>
      </div>
    </div>
  );
};

const DailyTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload: DailyPoint }>;
}> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0].payload;
  return (
    <div
      dir="rtl"
      className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2.5 shadow-lg text-xs space-y-1 min-w-[184px]"
    >
      <div className="font-bold text-stone-900 dark:text-stone-100 border-b border-stone-100 dark:border-stone-800 pb-1">
        {pt.dayName} · <span className="font-num">{pt.fullDate}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-stone-500 dark:text-stone-400">المبيعات:</span>
        <span className="font-num font-bold text-amber-700 dark:text-amber-400">
          {formatCurrency(pt.sales)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-stone-500 dark:text-stone-400">المصروفات:</span>
        <span className="font-num font-semibold text-red-600 dark:text-red-400">
          -{formatCurrency(pt.expenses)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-stone-500 dark:text-stone-400">صافي الربح:</span>
        <span
          className={`font-num font-bold ${
            pt.netProfit >= 0
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {formatCurrency(pt.netProfit)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 pt-0.5 border-t border-stone-100 dark:border-stone-800">
        <span className="text-stone-500 dark:text-stone-400">الفواتير:</span>
        <span className="font-num font-semibold text-stone-800 dark:text-stone-200">
          {pt.invoices} فاتورة
        </span>
      </div>
    </div>
  );
};

export const SalesTrendCharts: React.FC<Props> = ({
  sales,
  expenses,
  selectedDayStr,
  periodStartMs,
  periodEndMs,
  periodLabel,
}) => {
  const [hourlyScope, setHourlyScope] = useState<'day' | 'period'>('day');
  const [trendSpan, setTrendSpan] = useState<7 | 14 | 30>(7);

  const validSales = useMemo(() => sales.filter((s) => !s.voided), [sales]);

  // 1. Hourly sales trend (Daily Activity Peak)
  const { hourlyData, peakHour, hourlyHasData } = useMemo(() => {
    const buckets: HourlyPoint[] = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: formatHourShort(h),
      fullLabel: formatHourFull(h),
      sales: 0,
      profit: 0,
      invoices: 0,
    }));

    const [y, m, d] = selectedDayStr.split('-').map(Number);
    const dayStart = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0).getTime();
    const dayEnd = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999).getTime();

    const startMs = hourlyScope === 'day' ? dayStart : periodStartMs;
    const endMs = hourlyScope === 'day' ? dayEnd : periodEndMs;

    let hasAny = false;
    for (const s of validSales) {
      const dt = new Date(s.timestamp);
      const ms = dt.getTime();
      if (ms < startMs || ms > endMs) continue;
      const h = dt.getHours();
      buckets[h].sales = Number((buckets[h].sales + s.total).toFixed(2));
      buckets[h].profit = Number((buckets[h].profit + (s.total - s.totalCost)).toFixed(2));
      buckets[h].invoices += 1;
      hasAny = true;
    }

    let best: HourlyPoint | null = null;
    for (const b of buckets) {
      if (b.sales > 0 && (!best || b.sales > best.sales)) {
        best = b;
      }
    }

    // Focus display window on active hours (default 7 AM to 11 PM, expanding if sales occur earlier/later)
    let firstHour = 7;
    let lastHour = 23;
    for (const b of buckets) {
      if (b.sales > 0) {
        if (b.hour < firstHour) firstHour = b.hour;
        if (b.hour > lastHour) lastHour = b.hour;
      }
    }

    return {
      hourlyData: buckets.slice(firstHour, lastHour + 1),
      peakHour: best,
      hourlyHasData: hasAny,
    };
  }, [validSales, selectedDayStr, hourlyScope, periodStartMs, periodEndMs]);

  // 2. Weekly / Multi-day sales trend (Last 7 / 14 / 30 days)
  const { dailyData, peakDay, dailyHasData, weeklyAvg } = useMemo(() => {
    const today = new Date();
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const map = new Map<string, DailyPoint>();
    const orderedKeys: string[] = [];

    for (let i = trendSpan - 1; i >= 0; i--) {
      const dt = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - i);
      const key = formatLocalDateKey(dt);
      const dayName = ARABIC_DAYS[dt.getDay()];
      const dd = String(dt.getDate()).padStart(2, '0');
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      orderedKeys.push(key);
      map.set(key, {
        dateKey: key,
        shortLabel: trendSpan === 7 ? dayName : `${dd}/${mm}`,
        dayName,
        fullDate: `${dd}/${mm}/${dt.getFullYear()}`,
        sales: 0,
        grossProfit: 0,
        expenses: 0,
        netProfit: 0,
        invoices: 0,
      });
    }

    let hasAny = false;
    for (const s of validSales) {
      const key = formatLocalDateKey(new Date(s.timestamp));
      const row = map.get(key);
      if (!row) continue;
      row.sales = Number((row.sales + s.total).toFixed(2));
      row.grossProfit = Number((row.grossProfit + (s.total - s.totalCost)).toFixed(2));
      row.invoices += 1;
      hasAny = true;
    }

    for (const e of expenses) {
      const key = formatLocalDateKey(new Date(e.timestamp));
      const row = map.get(key);
      if (!row) continue;
      row.expenses = Number((row.expenses + e.amount).toFixed(2));
    }

    const list: DailyPoint[] = orderedKeys.map((k) => {
      const row = map.get(k)!;
      row.netProfit = Number((row.grossProfit - row.expenses).toFixed(2));
      return row;
    });

    let best: DailyPoint | null = null;
    let sumSales = 0;
    for (const item of list) {
      sumSales += item.sales;
      if (item.sales > 0 && (!best || item.sales > best.sales)) {
        best = item;
      }
    }

    return {
      dailyData: list,
      peakDay: best,
      dailyHasData: hasAny,
      weeklyAvg: list.length > 0 ? sumSales / list.length : 0,
    };
  }, [validSales, expenses, trendSpan]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* CHART 1: DAILY HOURLY TREND & PEAK ACTIVITY */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-stone-900 dark:text-stone-100">
              <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
              <span>اتجاه المبيعات اليومي (ذروة الساعات)</span>
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-num">
              {peakHour ? (
                <>
                  ساعة الذروة:{' '}
                  <strong className="text-amber-800 dark:text-amber-400">
                    {peakHour.fullLabel}
                  </strong>{' '}
                  · {formatCurrency(peakHour.sales)} · {peakHour.invoices} فاتورة
                </>
              ) : (
                <span>
                  {hourlyScope === 'day'
                    ? `لا توجد مبيعات مسجلة ليوم ${selectedDayStr}`
                    : `لا توجد مبيعات مسجلة في (${periodLabel})`}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setHourlyScope('day')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                hourlyScope === 'day'
                  ? 'bg-stone-900 dark:bg-amber-600 text-white dark:text-stone-950'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              اليوم المحدد
            </button>
            <button
              type="button"
              onClick={() => setHourlyScope('period')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                hourlyScope === 'period'
                  ? 'bg-stone-900 dark:bg-amber-600 text-white dark:text-stone-950'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              الفترة المحددة
            </button>
          </div>
        </div>

        <div dir="ltr" className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData} margin={{ top: 8, right: 12, left: 0, bottom: 2 }}>
              <defs>
                <linearGradient id="hourlySalesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d97706" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="hourlyProfitFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                className="text-stone-200 dark:text-stone-800"
              />
              <XAxis
                dataKey="label"
                tick={{ fill: '#78716c', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={formatCompactAxis}
                tick={{ fill: '#78716c', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip content={<HourlyTooltip />} />
              <Area
                type="monotone"
                dataKey="sales"
                name="المبيعات"
                stroke="#d97706"
                strokeWidth={2.5}
                fill="url(#hourlySalesFill)"
                activeDot={{ r: 5, fill: '#d97706', strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="profit"
                name="مجمل الربح"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#hourlyProfitFill)"
                activeDot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 dark:text-stone-400 pt-1 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-600 inline-block" />
              <span>إجمالي المبيعات</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
              <span>مجمل الربح</span>
            </span>
          </div>
          {!hourlyHasData && (
            <span className="text-stone-400 dark:text-stone-500">
              يظهر المنحنى تلقائياً فور تسجيل أول فاتورة
            </span>
          )}
        </div>
      </div>

      {/* CHART 2: WEEKLY / MULTI-DAY SALES & NET PROFIT TREND */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-stone-900 dark:text-stone-100">
              <BarChart3 className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
              <span>اتجاه المبيعات الأسبوعي وصافي الربح</span>
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-num">
              {peakDay ? (
                <>
                  أعلى يوم نشاطاً:{' '}
                  <strong className="text-amber-800 dark:text-amber-400">
                    {peakDay.dayName} ({peakDay.fullDate})
                  </strong>{' '}
                  · {formatCurrency(peakDay.sales)} · متوسط يومي {formatCurrency(weeklyAvg)}
                </>
              ) : (
                <span>لا توجد مبيعات مسجلة خلال آخر {trendSpan} أيام</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {([7, 14, 30] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setTrendSpan(days)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-num transition-colors cursor-pointer ${
                  trendSpan === days
                    ? 'bg-stone-900 dark:bg-amber-600 text-white dark:text-stone-950'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {days === 7 ? '7 أيام' : days === 14 ? '14 يوم' : '30 يوم'}
              </button>
            ))}
          </div>
        </div>

        <div dir="ltr" className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dailyData} margin={{ top: 8, right: 12, left: 0, bottom: 2 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                className="text-stone-200 dark:text-stone-800"
              />
              <XAxis
                dataKey="shortLabel"
                tick={{ fill: '#78716c', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={trendSpan === 30 ? 3 : trendSpan === 14 ? 1 : 0}
              />
              <YAxis
                tickFormatter={formatCompactAxis}
                tick={{ fill: '#78716c', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip content={<DailyTooltip />} />
              <Bar
                dataKey="sales"
                name="المبيعات"
                radius={[5, 5, 0, 0]}
                maxBarSize={trendSpan === 7 ? 38 : 22}
              >
                {dailyData.map((entry) => {
                  const isPeak = peakDay && entry.dateKey === peakDay.dateKey && entry.sales > 0;
                  return (
                    <Cell
                      key={entry.dateKey}
                      fill={isPeak ? '#d97706' : '#a8a29e'}
                      fillOpacity={isPeak ? 1 : 0.72}
                    />
                  );
                })}
              </Bar>
              <Line
                type="monotone"
                dataKey="netProfit"
                name="صافي الربح"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#10b981', strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 dark:text-stone-400 pt-1 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-600 inline-block" />
              <span>يوم الذروة</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-stone-400 inline-block" />
              <span>باقي الأيام</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span>صافي الربح</span>
            </span>
          </div>
          {!dailyHasData && (
            <span className="text-stone-400 dark:text-stone-500">
              يُحدّث الرسم البياني تلقائياً مع كل يوم عمل
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
