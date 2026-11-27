export function formatCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${safe.toLocaleString('en-US', {
    minimumFractionDigits: safe % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} ج.م`;
}

export function formatNumber(value: number, decimals = 0): string {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatWeightGrams(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(3).replace(/0+$/, '')} كجم`;
  }
  return `${Math.round(grams)} جم`;
}

export function formatStockKg(kg: number): string {
  const safe = Number.isFinite(kg) ? Math.max(0, kg) : 0;
  return `${safe.toFixed(3).replace(/\.?0+$/, '') || '0'} كجم`;
}

export function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function formatTimeOnly(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function paymentMethodLabel(method: string): string {
  switch (method) {
    case 'cash':
      return 'كاش';
    case 'vodafone':
      return 'فودافون كاش';
    case 'instapay':
      return 'إنستا باي';
    case 'credit':
      return 'آجل';
    default:
      return method;
  }
}
