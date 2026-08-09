import ExcelJS from 'exceljs';

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

export async function arrayToXLSX(
  data: Record<string, unknown>[],
  columns: { key: string; label: string }[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Export');
  worksheet.columns = columns.map((column) => ({
    header: column.label,
    key: column.key,
    width: Math.max(12, Math.min(40, column.label.length + 4)),
  }));

  for (const row of data) {
    worksheet.addRow(
      Object.fromEntries(columns.map((column) => [column.key, row[column.key] ?? '']))
    );
  }

  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
