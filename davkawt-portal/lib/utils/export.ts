import * as XLSX from 'xlsx';

export function arrayToCSV(data: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
  const header = columns.map((c) => c.label).join(',');
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key];
        const str = val == null ? '' : String(val);
        // Escape commas and quotes
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(',')
  );
  return [header, ...rows].join('\n');
}

export function arrayToXLSX(data: Record<string, unknown>[], columns: { key: string; label: string }[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(
    data.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const c of columns) {
        mapped[c.label] = row[c.key] ?? '';
      }
      return mapped;
    })
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Export');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
