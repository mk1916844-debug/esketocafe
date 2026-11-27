import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Calculator,
  Coffee,
  Lock,
  Menu,
  Moon,
  Package,
  Receipt,
  ShieldCheck,
  Store,
  Sun,
  X,
} from 'lucide-react';
import { ActiveTab, DayClosure, SaleRecord } from './types';
import { usePosStore } from './store/usePosStore';
import { formatCurrency } from './utils/format';
import { PosScreen } from './components/PosScreen';
import { InventoryView } from './components/InventoryView';
import { ExpensesView } from './components/ExpensesView';
import { CreditLedgerView } from './components/CreditLedgerView';
import { DayClosureView } from './components/DayClosureView';
import { AdminView } from './components/AdminView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  PeriodReportPrintData,
  PrintDocument,
  ReceiptPrintView,
} from './components/ReceiptPrintView';

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'pos', label: 'شاشة البيع', icon: Store },
  { id: 'inventory', label: 'التلاجة والجرد', icon: Package },
  { id: 'expenses', label: 'المصروفات', icon: Receipt },
  { id: 'credit', label: 'حساب الآجل', icon: BookOpen },
  { id: 'closure', label: 'تقفيل اليوم', icon: Calculator },
  { id: 'admin', label: 'الإدارة', icon: ShieldCheck },
];

const THEME_STORAGE_KEY = 'bunn_esketto_theme';

function loadInitialDark(): boolean {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light') return false;
    if (saved === 'dark') return true;
  } catch {
    // ignore
  }
  return true;
}

export default function App() {
  const store = usePosStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [printDoc, setPrintDoc] = useState<PrintDocument>(null);
  const [isDark, setIsDark] = useState<boolean>(loadInitialDark);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [isDark]);

  const shiftExpenses = useMemo(
    () =>
      store.state.expenses.filter(
        (e) => e.shiftId === store.state.settings.currentShiftId
      ),
    [store.state.expenses, store.state.settings.currentShiftId]
  );

  const triggerPrint = (doc: PrintDocument) => {
    setPrintDoc(doc);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handlePrintSale = (sale: SaleRecord) => triggerPrint({ type: 'sale', sale });
  const handlePrintClosure = (closure: DayClosure) =>
    triggerPrint({ type: 'closure', closure });
  const handlePrintPeriodReport = (report: PeriodReportPrintData) =>
    triggerPrint({ type: 'period_report', report });

  const activeNav = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];

  return (
    <>
      <div className="no-print min-h-screen flex bg-[#F7F7F5] dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors">
        {/* DESKTOP SIDEBAR (RTL Right Side) */}
        <aside className="hidden md:flex w-[228px] shrink-0 flex-col border-l border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="px-4 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-stone-900 dark:bg-amber-600 text-amber-400 dark:text-stone-950 flex items-center justify-center shrink-0">
              <Coffee className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                {store.state.settings.shopName}
              </div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                نظام الكاشير والمطحنة
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-stone-900 dark:bg-amber-600 text-white dark:text-stone-950'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? 'text-amber-400 dark:text-stone-950'
                          : 'text-stone-500 dark:text-stone-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </span>
                  {item.id === 'admin' && !store.isAdminUnlocked && (
                    <Lock className="w-3.5 h-3.5 opacity-60 shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Shift Quick Readout + Theme Switch + Install Button */}
          <div className="p-3 border-t border-stone-200 dark:border-stone-800 space-y-2.5 bg-stone-50/70 dark:bg-stone-900/80">
            <div className="px-1 space-y-1 text-xs">
              <div className="flex justify-between text-stone-500 dark:text-stone-400">
                <span>مبيعات اليوم</span>
                <span className="font-num font-bold text-stone-900 dark:text-stone-100">
                  {formatCurrency(store.currentShiftSummary.totalSales)}
                </span>
              </div>
              <div className="flex justify-between text-stone-500 dark:text-stone-400">
                <span>صافي الدرج</span>
                <span className="font-num font-bold text-amber-800 dark:text-amber-400">
                  {formatCurrency(store.currentShiftSummary.expectedDrawerCash)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDark((v) => !v)}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-xs font-semibold text-stone-800 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>الوضع النهاري</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                  <span>الوضع الليلي</span>
                </>
              )}
            </button>

            <PWAInstallButton />
          </div>
        </aside>

        {/* MOBILE DRAWER */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div className="w-64 bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 flex flex-col shadow-xl">
              <div className="px-4 py-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {store.state.settings.shopName}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="p-1 text-stone-500 dark:text-stone-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 p-3 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileNavOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold cursor-pointer ${
                        isActive
                          ? 'bg-stone-900 dark:bg-amber-600 text-white dark:text-stone-950'
                          : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </span>
                      {item.id === 'admin' && !store.isAdminUnlocked && (
                        <Lock className="w-3.5 h-3.5 opacity-60" />
                      )}
                    </button>
                  );
                })}
              </nav>
              <div className="p-3 border-t border-stone-200 dark:border-stone-800 space-y-2">
                <button
                  type="button"
                  onClick={() => setIsDark((v) => !v)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-xs font-semibold text-stone-800 dark:text-stone-100 cursor-pointer"
                >
                  {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
                  <span>{isDark ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
                </button>
                <PWAInstallButton />
              </div>
            </div>
            <div
              className="flex-1 bg-black/50"
              onClick={() => setMobileNavOpen(false)}
            />
          </div>
        )}

        {/* MAIN CONTENT VIEWPORT */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Clean Single-Row Top Bar */}
          <header className="h-14 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 lg:px-6 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="md:hidden p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 cursor-pointer"
                aria-label="القائمة"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-base font-bold text-stone-900 dark:text-stone-100 whitespace-nowrap truncate">
                {activeNav.label}
              </h1>
            </div>

            <div className="hidden sm:flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
              <span className="font-num">
                فواتير اليوم:{' '}
                <strong className="text-stone-900 dark:text-stone-100">
                  {store.currentShiftSummary.salesCount}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-num">
                المصروفات:{' '}
                <strong className="text-red-700 dark:text-red-400">
                  {formatCurrency(store.currentShiftSummary.totalExpenses)}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-num">
                الخزينة:{' '}
                <strong className="text-amber-800 dark:text-amber-400">
                  {formatCurrency(store.currentShiftSummary.expectedDrawerCash)}
                </strong>
              </span>
            </div>

            <div className="shrink-0">
              {activeTab !== 'closure' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('closure')}
                  className="px-3.5 py-1.5 rounded-lg bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-500 text-white dark:text-stone-950 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
                >
                  تقفيل اليوم
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('pos')}
                  className="px-3.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
                >
                  العودة للكاشير
                </button>
              )}
            </div>
          </header>

          {/* Active Workspace Body */}
          <main className="flex-1 p-4 lg:p-5 overflow-y-auto">
            {activeTab === 'pos' && (
              <PosScreen
                categories={store.state.categories}
                products={store.state.products}
                customers={store.state.customers}
                plasticCupsStock={store.state.settings.plasticCupsStock}
                minPlasticCups={store.state.settings.minPlasticCups}
                onAddCustomer={store.addCustomer}
                onCompleteSale={store.completeSale}
                onPrintSale={handlePrintSale}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryView
                categories={store.state.categories}
                products={store.state.products}
                plasticCupsStock={store.state.settings.plasticCupsStock}
                minPlasticCups={store.state.settings.minPlasticCups}
                onRestockFridgePacks={store.restockFridgePacks}
                onRestockFridgeUnits={store.restockFridgeUnits}
                onApplyFridgeAudit={store.applyFridgeAudit}
                onAdjustPlasticCups={store.adjustPlasticCups}
              />
            )}

            {activeTab === 'expenses' && (
              <ExpensesView
                expenses={store.state.expenses}
                currentShiftId={store.state.settings.currentShiftId}
                expenseCategories={store.state.settings.expenseCategories}
                onAddExpense={store.addExpense}
                onDeleteExpense={store.deleteExpense}
                onAddExpenseCategory={store.addExpenseCategory}
              />
            )}

            {activeTab === 'credit' && (
              <CreditLedgerView
                customers={store.state.customers}
                transactions={store.state.creditTransactions}
                currentShiftId={store.state.settings.currentShiftId}
                onAddCustomer={store.addCustomer}
                onUpdateCustomer={store.updateCustomer}
                onDeleteCustomer={store.deleteCustomer}
                onAddManualCharge={store.addManualCreditCharge}
                onRecordPayment={store.recordCreditPayment}
              />
            )}

            {activeTab === 'closure' && (
              <DayClosureView
                summary={store.currentShiftSummary}
                openedAt={store.state.settings.currentShiftOpenedAt}
                shiftExpenses={shiftExpenses}
                pastClosures={store.state.closures}
                onSetOpeningCash={store.setOpeningCash}
                onCloseDay={store.closeCurrentDay}
                onPrintClosure={handlePrintClosure}
              />
            )}

            {activeTab === 'admin' && (
              <AdminView
                state={store.state}
                isAdminUnlocked={store.isAdminUnlocked}
                onVerifyAdmin={store.verifyAdminLogin}
                onLockAdmin={store.lockAdmin}
                onAddCategory={store.addCategory}
                onUpdateCategory={store.updateCategory}
                onMoveCategoryOrder={store.moveCategoryOrder}
                onDeleteCategory={store.deleteCategory}
                onAddProduct={store.addProduct}
                onUpdateProduct={store.updateProduct}
                onMoveProductOrder={store.moveProductOrder}
                onDeleteProduct={store.deleteProduct}
                onRestockCoffeeKg={store.restockCoffeeKg}
                onSetCoffeeStockKg={store.setCoffeeStockKg}
                onVoidSale={store.voidSale}
                onUpdateSettings={store.updateSettings}
                onExportBackup={store.exportBackupJson}
                onImportBackup={store.importBackupJson}
                onResetAllData={store.resetAllData}
                onPrintSale={handlePrintSale}
                onPrintClosure={handlePrintClosure}
                onPrintPeriodReport={handlePrintPeriodReport}
              />
            )}
          </main>
        </div>
      </div>

      {/* Thermal Receipt / Closure / Financial Report Print Layer */}
      <ReceiptPrintView doc={printDoc} settings={store.state.settings} />

      {/* Offline Notification Banner */}
      <OfflineIndicator />
    </>
  );
}
