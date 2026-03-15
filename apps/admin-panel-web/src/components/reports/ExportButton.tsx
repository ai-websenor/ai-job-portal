import { Download } from 'lucide-react';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
}

export function ExportButton({ data, filename }: ExportButtonProps) {
  const handleExport = () => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            const str = val === null || val === undefined ? '' : String(val);
            return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
          })
          .join(','),
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      disabled={!data || data.length === 0}
      className="flex items-center gap-2 h-9 rounded-md border border-admin-border-subtle bg-admin-surface px-3 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </button>
  );
}
