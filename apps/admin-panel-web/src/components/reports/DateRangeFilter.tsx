import { Calendar } from 'lucide-react';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  groupBy: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onGroupByChange: (groupBy: string) => void;
}

const presets = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'This year', days: 365 },
];

function daysAgo(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function DateRangeFilter({
  startDate,
  endDate,
  groupBy,
  onStartDateChange,
  onEndDateChange,
  onGroupByChange,
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="h-9 rounded-md border border-admin-border-subtle bg-admin-surface px-3 text-sm text-foreground"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="h-9 rounded-md border border-admin-border-subtle bg-admin-surface px-3 text-sm text-foreground"
        />
      </div>

      <select
        value={groupBy}
        onChange={(e) => onGroupByChange(e.target.value)}
        className="h-9 rounded-md border border-admin-border-subtle bg-admin-surface px-3 text-sm text-foreground"
      >
        <option value="day">Daily</option>
        <option value="week">Weekly</option>
        <option value="month">Monthly</option>
        <option value="year">Yearly</option>
      </select>

      <div className="flex items-center gap-1">
        {presets.map((p) => (
          <button
            key={p.days}
            onClick={() => {
              onStartDateChange(daysAgo(p.days));
              onEndDateChange(today());
            }}
            className="h-9 rounded-md border border-admin-border-subtle bg-admin-surface px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
