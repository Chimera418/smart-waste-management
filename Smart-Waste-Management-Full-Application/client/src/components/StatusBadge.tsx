const STYLES: Record<string, string> = {
  submitted: 'bg-sky-50 text-sky-700 border-sky-200',
  under_review: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  assigned: 'bg-amber-50 text-amber-800 border-amber-200',
  accepted: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  en_route: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-purple-50 text-purple-700 border-purple-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-rose-50 text-rose-700 border-rose-200'
};

export function StatusBadge({ value }: { value: string }) {
  const cls = STYLES[value] || 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {value.replace(/_/g, ' ')}
    </span>
  );
}
