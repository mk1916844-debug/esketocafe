import React, { useMemo, useState } from 'react';
import { Plus, Receipt, Trash2 } from 'lucide-react';
import { ExpenseRecord } from '../types';
import { formatCurrency, formatDateTime, formatTimeOnly } from '../utils/format';

interface Props {
  expenses: ExpenseRecord[];
  currentShiftId: string;
  expenseCategories: string[];
  onAddExpense: (category: string, description: string, amount: number) => void;
  onDeleteExpense: (id: string) => void;
  onAddExpenseCategory: (name: string) => void;
}

export const ExpensesView: React.FC<Props> = ({
  expenses,
  currentShiftId,
  expenseCategories,
  onAddExpense,
  onDeleteExpense,
  onAddExpenseCategory,
}) => {
  const [selectedCategory, setSelectedCategory] = useState(
    expenseCategories[0] || 'مصروفات أخرى'
  );
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);

  const shiftExpenses = useMemo(
    () => expenses.filter((e) => e.shiftId === currentShiftId),
    [expenses, currentShiftId]
  );

  const shiftTotal = useMemo(
    () => shiftExpenses.reduce((sum, e) => sum + e.amount, 0),
    [shiftExpenses]
  );

  const displayedExpenses = showAllHistory ? expenses : shiftExpenses;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amountStr);
    if (!Number.isFinite(amt) || amt <= 0) return;
    onAddExpense(selectedCategory, description, amt);
    setAmountStr('');
    setDescription('');
  };

  const handleAddCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddExpenseCategory(newCatName);
    setSelectedCategory(newCatName.trim());
    setNewCatName('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              تسجيل مصروف يومي من الدرج
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              أي مصروف يتم تسجيله هنا يُخصم تلقائياً من نقدية الدرج في شاشة تقفيل اليوم وحسابات الإدارة.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
                نوع المصروف
              </label>
              <div className="flex flex-wrap gap-1.5">
                {expenseCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-stone-900 dark:bg-amber-600 border-stone-900 dark:border-amber-600 text-white dark:text-stone-950'
                        : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                المبلغ (ج.م)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="مثال: 150"
                className="w-full h-11 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3.5 text-base font-num font-bold focus:border-amber-600 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                التفاصيل / البيان (اختياري)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="مثال: 3 كيلو لبن + سكر + أكياس بن"
                className="w-full h-10 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 text-sm focus:border-amber-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-500 text-white dark:text-stone-950 py-3 text-sm font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل المصروف وخصمه من الدرج</span>
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4">
          <form onSubmit={handleAddCat} className="flex items-center gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="إضافة بند مصروفات جديد (مثال: إيجار، غاز)..."
              className="flex-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-xs focus:border-amber-600 focus:outline-none"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-xs font-semibold text-stone-800 dark:text-stone-100 cursor-pointer whitespace-nowrap"
            >
              + إضافة بند
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              إجمالي مصروفات اليوم (الوردية الحالية)
            </div>
            <div className="text-2xl font-bold font-num text-red-700 dark:text-red-400 mt-1">
              {formatCurrency(shiftTotal)}
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-num">
              {shiftExpenses.length} حركة مسجلة اليوم · تُخصم تلقائياً عند تقفيل الدرج
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-lg">
            <button
              type="button"
              onClick={() => setShowAllHistory(false)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                !showAllHistory
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              اليوم فقط ({shiftExpenses.length})
            </button>
            <button
              type="button"
              onClick={() => setShowAllHistory(true)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                showAllHistory
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              كل السجل ({expenses.length})
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
          {displayedExpenses.length === 0 ? (
            <div className="py-16 px-4 text-center text-stone-500 dark:text-stone-400">
              <Receipt className="w-8 h-8 text-stone-300 dark:text-stone-700 mx-auto mb-2" />
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                لا توجد مصروفات مسجلة حتى الآن
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                استخدم النموذج على اليمين لتسجيل أي مصروف يخرج من الدرج.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/40 text-xs text-stone-500 dark:text-stone-400">
                    <th className="text-right py-3 px-4 font-semibold">البند والتفاصيل</th>
                    <th className="text-right py-3 px-4 font-semibold">الوقت</th>
                    <th className="text-left py-3 px-4 font-semibold">المبلغ</th>
                    <th className="text-center py-3 px-3 font-semibold w-14">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {displayedExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900 dark:text-stone-100">{exp.category}</div>
                        {exp.description !== exp.category && (
                          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                            {exp.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-stone-500 dark:text-stone-400 font-num whitespace-nowrap">
                        {showAllHistory ? formatDateTime(exp.timestamp) : formatTimeOnly(exp.timestamp)}
                      </td>
                      <td className="py-3 px-4 text-left font-num font-bold text-red-700 dark:text-red-400 whitespace-nowrap">
                        -{formatCurrency(exp.amount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(exp.id)}
                          className="p-1.5 rounded text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                          title="حذف المصروف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
