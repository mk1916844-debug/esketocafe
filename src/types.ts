export type CategoryMode = 'weight' | 'drink' | 'fridge';

export type RoastLevel = 'فاتح' | 'وسط' | 'غامق';

export type PaymentMethod = 'cash' | 'vodafone' | 'instapay' | 'credit';

export type ActiveTab = 'pos' | 'inventory' | 'expenses' | 'credit' | 'closure' | 'admin';

export interface Category {
  id: string;
  name: string;
  mode: CategoryMode;
  order: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  /** For mode === 'weight', price is per 1 KG. For drink/fridge, price is per 1 unit. */
  price: number;
  /** Cost price per 1 KG (weight) or per 1 unit (drink/fridge) for profit calculation. */
  costPrice: number;
  /** Optional roast options for weight-based coffee products */
  roastLevels?: RoastLevel[];
  /** Current stock in kilograms (for mode === 'weight') */
  stockKg?: number;
  /** Minimum stock threshold in kg for low-stock warning */
  minStockKg?: number;
  /** Current stock in single bottles/cans (for mode === 'fridge') */
  stockUnits?: number;
  /** Minimum stock threshold in single units */
  minStockUnits?: number;
  /** Number of units per shrink/carton/pallet (for mode === 'fridge') */
  unitsPerPack?: number;
  /** Arabic label for the bulk pack, e.g. 'شرنك' or 'بالتة' or 'كرتونة' */
  packLabel?: string;
  /** Optional barcode string for USB barcode scanner */
  barcode?: string;
  /** Special flag for the Ice Cup button in Fridge category */
  isIceCup?: boolean;
  /** Display sort order within its category on the POS screen */
  order?: number;
  active: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  categoryId: string;
  name: string;
  mode: CategoryMode;
  roast?: RoastLevel;
  /** Weight in grams (only for mode === 'weight') */
  weightGrams?: number;
  /** Quantity of items/bags */
  qty: number;
  /** Price per single line unit (for weight: price of the specific weightGrams; for drink/fridge: unit price) */
  unitPrice: number;
  /** Total cost for this line (qty * cost) */
  costTotal: number;
  /** Total revenue for this line */
  lineTotal: number;
  isIceCup?: boolean;
  note?: string;
}

export interface SaleRecord {
  id: string;
  receiptNo: number;
  timestamp: string;
  items: CartItem[];
  total: number;
  totalCost: number;
  paymentMethod: PaymentMethod;
  /** Amount paid immediately (for non-credit = total; for credit = partial down payment or 0) */
  paidNow: number;
  /** Payment method of the partial down payment on a credit sale */
  downPaymentMethod?: 'cash' | 'vodafone' | 'instapay';
  /** Remaining credit added to customer balance */
  creditRemaining: number;
  customerId?: string;
  customerName?: string;
  shiftId: string;
  voided?: boolean;
}

export interface ExpenseRecord {
  id: string;
  timestamp: string;
  category: string;
  description: string;
  amount: number;
  shiftId: string;
}

export interface CreditCustomer {
  id: string;
  name: string;
  phone: string;
  notes: string;
  balance: number;
  createdAt: string;
}

export interface CreditTransaction {
  id: string;
  customerId: string;
  timestamp: string;
  type: 'charge' | 'payment';
  amount: number;
  paymentMethod?: 'cash' | 'vodafone' | 'instapay';
  note: string;
  receiptNo?: number;
  shiftId: string;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  revenue: number;
  count: number;
}

export interface DayClosure {
  id: string;
  shiftId: string;
  openedAt: string;
  closedAt: string;
  openingCash: number;
  cashSales: number;
  vodafoneSales: number;
  instapaySales: number;
  creditSalesTotal: number;
  creditDownPaymentsCash: number;
  creditDownPaymentsWallet: number;
  creditCashCollections: number;
  creditWalletCollections: number;
  totalExpenses: number;
  expectedDrawerCash: number;
  actualDrawerCash: number;
  drawerDiff: number;
  totalSales: number;
  totalCost: number;
  estimatedProfit: number;
  salesCount: number;
  expensesCount: number;
  categoryBreakdown: CategoryBreakdownItem[];
  notes?: string;
}

export interface ShopSettings {
  shopName: string;
  shopSubtitle: string;
  phone: string;
  receiptFooter: string;
  adminUsername: string;
  adminPassword: string;
  adminConfigured: boolean;
  plasticCupsStock: number;
  minPlasticCups: number;
  openingCash: number;
  currentShiftId: string;
  currentShiftOpenedAt: string;
  nextReceiptNo: number;
  expenseCategories: string[];
}

export interface PosState {
  categories: Category[];
  products: Product[];
  sales: SaleRecord[];
  expenses: ExpenseRecord[];
  customers: CreditCustomer[];
  creditTransactions: CreditTransaction[];
  closures: DayClosure[];
  settings: ShopSettings;
}
