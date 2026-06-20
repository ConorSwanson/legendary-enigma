interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
  accent?: string;
}

export default function StatCard({ label, value, unit, icon, accent = 'text-white' }: StatCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium uppercase tracking-wide mb-3">
        {icon && <span>{icon}</span>}
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-3xl font-bold ${accent}`}>{value}</span>
        {unit && <span className="text-gray-500 text-sm">{unit}</span>}
      </div>
    </div>
  );
}
