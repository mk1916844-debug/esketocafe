import React, { useMemo, useState } from 'react';
import { Banknote, Plus, Search, Trash2, UserPlus, Users } from 'lucide-react';
import { CreditCustomer, CreditTransaction } from '../types';
import { formatCurrency, formatDateTime, paymentMethodLabel } from '../utils/format';

interface Props {
  customers: CreditCustomer[];
  transactions: CreditTransaction[];
  currentShiftId: string;
  onAddCustomer: (name: string, phone: string, notes: string) => CreditCustomer;
  onUpdateCustomer: (id: string, updates: Partial<Pick<CreditCustomer, 'name' | 'phone' | 'notes'>>) => void;
  onDeleteCustomer: (id: string) => void;
  onAddManualCharge: (customerId: string, amount: number, note: string) => void;
  onRecordPayment: (
    customerId: string,
    amount: number,
    paymentMethod: 'cash' | 'vodafone' | 'instapay',
    note: string
  ) => void;
}

export const CreditLedgerView: React.FC<Props> = ({
  customers,
  transactions,
  currentShiftId,
  onAddCustomer,
  onDeleteCustomer,
  onAddManualCharge,
  onRecordPayment,
}) => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>(customers[0]?.id || '');
  const [showAddForm, setShowAddForm] = useState(false);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeNote, setChargeNote] = useState('');

  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'vodafone' | 'instapay'>('cash');
  const [payNote, setPayNote] = useState('');

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.notes.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const selectedCustomer =
    customers.find((c) => c.id === selectedId) || filteredCustomers[0] || null;

  const customerTransactions = useMemo(() => {
    if (!selectedCustomer) return [];
    return transactions.filter((t) => t.customerId === selectedCustomer.id);
  }, [transactions, selectedCustomer]);

  const totalReceivables = useMemo(
    () => customers.reduce((sum, c) => sum + c.balance, 0),
    [customers]
  );

  const indebtedCount = useMemo(
    () => customers.filter((c) => c.balance > 0).length,
    [customers]
  );

  const todayCollected = useMemo(
    () =>
      transactions
        .filter((t) => t.shiftId === currentShiftId && t.type === 'payment')
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions, currentShiftId]
  );

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const created = onAddCustomer(newName, newPhone, newNotes);
    setSelectedId(created.id);
    setNewName('');
    setNewPhone('');
    setNewNotes('');
    setShowAddForm(false);
  };

  const handleChargeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const amt = Number(chargeAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    onAddManualCharge(selectedCustomer.id, amt, chargeNote);
    setChargeAmount('');
    setChargeNote('');
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const amt = Number(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    onRecordPayment(selectedCustomer.id, amt, payMethod, payNote);
    setPayAmount('');
    setPayNote('');
  };

  return (
    <div className="space-y-4">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">
            إجمالي الآجل المستحق (فلوس بره)
          </div>
          <div className="text-2xl font-bold font-num text-amber-800 dark:text-amber-400 mt-1">
            {formatCurrency(totalReceivables)}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-num">
            موزعة على {indebtedCount} عميل / قهوة
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">
            تحصيلات الآجل اليوم
          </div>
          <div className="text-2xl font-bold font-num text-emerald-700 dark:text-emerald-400 mt-1">
            {formatCurrency(todayCollected)}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            تُضاف تلقائياً لحساب الدرج وتقفيل اليوم
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">
            إجمالي العملاء المسجلين
          </div>
          <div className="text-2xl font-bold font-num text-stone-900 dark:text-stone-100 mt-1">
            {customers.length}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">قهاوي وزباين دائمين</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-stone-200 dark:border-stone-800 space-y-2.5 bg-stone-50 dark:bg-stone-900/80">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">القهاوي والزباين</h2>
              <button
                type="button"
                onClick={() => setShowAddForm((v) => !v)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-900 dark:bg-amber-600 text-white dark:text-stone-950 text-xs font-semibold hover:bg-stone-800 dark:hover:bg-amber-500 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>إضافة عميل</span>
              </button>
            </div>

            {showAddForm && (
              <form
                onSubmit={handleCreateCustomer}
                className="p-3 rounded-lg bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-2"
              >
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="اسم القهوة أو الزبون *"
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 px-2.5 py-1.5 text-xs"
                  required
                />
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="رقم التليفون"
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 px-2.5 py-1.5 text-xs font-num"
                />
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="ملاحظات (مثال: بياخد بن وسط كل جمعة)"
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 px-2.5 py-1.5 text-xs"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-1.5 rounded-lg bg-amber-700 dark:bg-amber-600 text-white dark:text-stone-950 text-xs font-semibold cursor-pointer"
                  >
                    حفظ العميل
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-600 dark:text-stone-300 cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}

            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو الرقم..."
                className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 pr-9 pl-3 py-2 text-xs focus:border-amber-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-stone-800 max-h-[540px] overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="py-12 px-4 text-center text-stone-400 dark:text-stone-500 text-xs">
                لا يوجد عملاء مطابقون للبحث
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const active = selectedCustomer?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-right px-4 py-3 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      active
                        ? 'bg-amber-50/80 dark:bg-amber-950/30'
                        : 'bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                        {c.name}
                      </div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 font-num truncate mt-0.5">
                        {c.phone || 'بدون رقم'}
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <div
                        className={`text-sm font-num font-bold ${
                          c.balance > 0
                            ? 'text-amber-800 dark:text-amber-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {formatCurrency(c.balance)}
                      </div>
                      <div className="text-[11px] text-stone-400 dark:text-stone-500">
                        {c.balance > 0 ? 'مستحق عليه' : 'خالص'}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          {!selectedCustomer ? (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl py-20 text-center text-stone-500 dark:text-stone-400">
              <Users className="w-8 h-8 text-stone-300 dark:text-stone-700 mx-auto mb-2" />
              <p className="text-sm font-semibold">اختر عميلاً من القائمة أو أضف عميلاً جديداً</p>
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                    {selectedCustomer.name}
                  </h3>
                  <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    {selectedCustomer.phone && <span className="font-num">{selectedCustomer.phone}</span>}
                    {selectedCustomer.phone && selectedCustomer.notes && ' · '}
                    {selectedCustomer.notes && <span>{selectedCustomer.notes}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <div className="text-xs text-stone-500 dark:text-stone-400">الرصيد المتبقي عليه</div>
                    <div
                      className={`text-2xl font-bold font-num ${
                        selectedCustomer.balance > 0
                          ? 'text-amber-800 dark:text-amber-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {formatCurrency(selectedCustomer.balance)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteCustomer(selectedCustomer.id);
                      setSelectedId('');
                    }}
                    className="p-2 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                    title="حذف العميل وسجله"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form
                  onSubmit={handlePaySubmit}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-400">
                    <Banknote className="w-4 h-4" />
                    <span>تحصيل دفعة من الحساب</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="المبلغ المحصّل"
                      className="rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm font-num font-bold focus:border-emerald-600 focus:outline-none"
                      required
                    />
                    <select
                      value={payMethod}
                      onChange={(e) =>
                        setPayMethod(e.target.value as 'cash' | 'vodafone' | 'instapay')
                      }
                      className="rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-2.5 py-2 text-xs font-semibold"
                    >
                      <option value="cash">كاش (للدرج)</option>
                      <option value="vodafone">فودافون كاش</option>
                      <option value="instapay">إنستا باي</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    placeholder="ملاحظة (مثال: سداد دفعة الأسبوع)"
                    className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                    >
                      تسجيل التحصيل
                    </button>
                    {selectedCustomer.balance > 0 && (
                      <button
                        type="button"
                        onClick={() => setPayAmount(String(selectedCustomer.balance))}
                        className="px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer whitespace-nowrap"
                      >
                        تصفية الكل
                      </button>
                    )}
                  </div>
                </form>

                <form
                  onSubmit={handleChargeSubmit}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-400">
                    <Plus className="w-4 h-4" />
                    <span>إضافة سحب آجل مباشر</span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={chargeAmount}
                    onChange={(e) => setChargeAmount(e.target.value)}
                    placeholder="المبلغ المتبقي عليه (ج.م)"
                    className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm font-num font-bold focus:border-amber-600 focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    value={chargeNote}
                    onChange={(e) => setChargeNote(e.target.value)}
                    placeholder="البيان (مثال: 2 كيلو بن وسط ودفع نص الحساب)"
                    className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-3 py-2 text-xs"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 rounded-lg bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-500 text-white dark:text-stone-950 text-xs font-bold cursor-pointer"
                  >
                    إضافة على حساب العميل
                  </button>
                </form>
              </div>

              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    كشف الحساب التفصيلي
                  </h4>
                  <span className="text-xs text-stone-500 dark:text-stone-400 font-num">
                    {customerTransactions.length} حركة
                  </span>
                </div>

                {customerTransactions.length === 0 ? (
                  <div className="py-10 text-center text-xs text-stone-400 dark:text-stone-500">
                    لا توجد حركات مسجلة لهذا العميل بعد
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-stone-200 dark:border-stone-800 text-xs text-stone-500 dark:text-stone-400 bg-stone-50/50 dark:bg-stone-950/40">
                          <th className="text-right py-2.5 px-4 font-semibold">النوع</th>
                          <th className="text-right py-2.5 px-4 font-semibold">التفاصيل</th>
                          <th className="text-right py-2.5 px-4 font-semibold">التاريخ</th>
                          <th className="text-left py-2.5 px-4 font-semibold">المبلغ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                        {customerTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                            <td className="py-2.5 px-4 whitespace-nowrap text-xs font-bold">
                              {tx.type === 'charge' ? (
                                <span className="text-amber-800 dark:text-amber-400">سحب آجل</span>
                              ) : (
                                <span className="text-emerald-700 dark:text-emerald-400">
                                  تحصيل ({paymentMethodLabel(tx.paymentMethod || 'cash')})
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-xs text-stone-700 dark:text-stone-300">
                              {tx.note}
                            </td>
                            <td className="py-2.5 px-4 text-xs text-stone-500 dark:text-stone-400 font-num whitespace-nowrap">
                              {formatDateTime(tx.timestamp)}
                            </td>
                            <td
                              className={`py-2.5 px-4 text-left font-num font-bold whitespace-nowrap ${
                                tx.type === 'charge'
                                  ? 'text-amber-800 dark:text-amber-400'
                                  : 'text-emerald-700 dark:text-emerald-400'
                              }`}
                            >
                              {tx.type === 'charge' ? '+' : '-'}
                              {formatCurrency(tx.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
