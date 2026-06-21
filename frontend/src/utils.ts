export function formatMoney(amount: number) {
  return `₹${amount.toFixed(2)}`;
}

export function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function tableStatusColor(status: string) {
  return tableStatusStyles(status).card;
}

export function tableStatusStyles(status: string) {
  switch (status) {
    case 'VACANT':
      return {
        card: 'bg-emerald-50/80 border-emerald-200/80 hover:border-emerald-400',
        badge: 'bg-emerald-100 text-emerald-800',
      };
    case 'OCCUPIED':
      return {
        card: 'bg-amber-50/80 border-amber-200/80 hover:border-amber-400',
        badge: 'bg-amber-100 text-amber-900',
      };
    case 'BILLING':
      return {
        card: 'bg-blue-50/80 border-blue-200/80 hover:border-blue-400',
        badge: 'bg-blue-100 text-blue-900',
      };
    default:
      return {
        card: 'bg-slate-100 border-slate-200',
        badge: 'bg-slate-100 text-slate-600',
      };
  }
}

export function tableStatusLabel(status: string) {
  switch (status) {
    case 'VACANT':
      return 'Vacant';
    case 'OCCUPIED':
      return 'Busy';
    case 'BILLING':
      return 'Bill';
    default:
      return status;
  }
}
