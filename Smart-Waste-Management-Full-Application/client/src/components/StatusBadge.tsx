const STYLES: Record<string, { pill: string; dot: string }> = {
  submitted: { pill: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]', dot: 'bg-[#2563EB]' },
  under_review: { pill: 'bg-[#F3F4F6] text-[#374151] border-[#D1D5DB]', dot: 'bg-[#6B7280]' },
  assigned: { pill: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]', dot: 'bg-[#D97706]' },
  accepted: { pill: 'bg-[#ECFEFF] text-[#155E75] border-[#A5F3FC]', dot: 'bg-[#0891B2]' },
  en_route: { pill: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#93C5FD]', dot: 'bg-[#2563EB]' },
  in_progress: { pill: 'bg-[#FFF7ED] text-[#9A3412] border-[#FED7AA]', dot: 'bg-[#EA580C]' },
  completed: { pill: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]', dot: 'bg-[#059669]' },
  resolved: { pill: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]', dot: 'bg-[#059669]' },
  rejected: { pill: 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]', dot: 'bg-[#DC2626]' },
  low: { pill: 'bg-[#F5F4EF] text-[#4B524E] border-[#D5D2C6]', dot: 'bg-[#6E7671]' },
  medium: { pill: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]', dot: 'bg-[#D97706]' },
  high: { pill: 'bg-[#FFEDD5] text-[#9A3412] border-[#FDBA74]', dot: 'bg-[#EA580C]' },
  critical: { pill: 'bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]', dot: 'bg-[#DC2626]' }
};

export function StatusBadge({ value }: { value: string }) {
  const cfg = STYLES[value] || {
    pill: 'bg-[#F5F4EF] text-[#4B524E] border-[#D5D2C6]',
    dot: 'bg-[#6E7671]'
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize tracking-wide ${cfg.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {value.replace(/_/g, ' ')}
    </span>
  );
}
