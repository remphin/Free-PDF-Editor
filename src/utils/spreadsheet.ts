import * as XLSX from 'xlsx';

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: string[][];
  totalRows: number;
}

export function normalizeCellValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') {
    return Number.isInteger(val) ? String(val) : String(Number(val.toFixed(4)));
  }
  return String(val).trim();
}

export function parseWorkbookBytes(buffer: ArrayBuffer | Uint8Array): ParsedSheet[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheets: ParsedSheet[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;
    const rawGrid = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (rawGrid.length === 0) {
      sheets.push({ name: sheetName, headers: [], rows: [], totalRows: 0 });
      continue;
    }

    const maxCols = rawGrid.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0);
    const normalizedGrid = rawGrid.map((row) => {
      const cells: string[] = [];
      for (let c = 0; c < maxCols; c += 1) {
        cells.push(normalizeCellValue(Array.isArray(row) ? row[c] : ''));
      }
      return cells;
    });

    const [firstRow, ...restRows] = normalizedGrid;
    const headers = firstRow.map((cell, idx) => cell || `Col ${idx + 1}`);
    sheets.push({
      name: sheetName,
      headers,
      rows: restRows,
      totalRows: restRows.length,
    });
  }

  return sheets;
}

export function buildSheetHtmlTable(sheet: ParsedSheet, maxRows = 250): string {
  const displayRows = sheet.rows.slice(0, maxRows);
  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const headerCells = sheet.headers
    .map(
      (h) =>
        `<th style="border:1px solid #cbd5e1;background:#f1f5f9;color:#0f172a;padding:6px 8px;text-align:left;font-weight:600;font-size:11px;">${esc(h)}</th>`,
    )
    .join('');

  const bodyRows = displayRows
    .map((row, idx) => {
      const bg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
      const cells = row
        .map(
          (cell) =>
            `<td style="border:1px solid #e2e8f0;padding:5px 8px;color:#1e293b;font-size:11px;background:${bg};">${esc(cell)}</td>`,
        )
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
    <div style="margin-bottom:20px;">
      <h2 style="font-size:14px;font-weight:700;color:#0f172a;margin:0 0 8px 0;">${esc(sheet.name)}</h2>
      <table style="width:100%;border-collapse:collapse;table-layout:auto;">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

export function createSampleWorkbookBytes(lang: 'tr' | 'en'): Uint8Array {
  const wb = XLSX.utils.book_new();
  const data =
    lang === 'tr'
      ? [
          ['Ürün Kodu', 'Ürün Adı', 'Kategori', 'Adet', 'Birim Fiyat (₺)', 'Toplam (₺)'],
          ['PRD-101', 'A4 Lazer Kağıt (500\'lü)', 'Ofis Sarf', 45, 165, 7425],
          ['PRD-102', 'Termal Barkod Rulosu', 'Lojistik', 120, 48, 5760],
          ['PRD-103', 'Çift Taraflı Dosya Klasörü', 'Arşiv', 80, 92, 7360],
          ['PRD-104', 'Mürekkep Kartuş Seti', 'Yazıcı', 18, 840, 15120],
          ['PRD-105', 'USB-C Çoklayıcı Hub', 'Donanım', 12, 1150, 13800],
        ]
      : [
          ['SKU', 'Item Name', 'Category', 'Qty', 'Unit Price ($)', 'Total ($)'],
          ['PRD-101', 'A4 Laser Paper (500 Sheets)', 'Office Supply', 45, 6.5, 292.5],
          ['PRD-102', 'Thermal Barcode Roll', 'Logistics', 120, 2.2, 264.0],
          ['PRD-103', 'Archival Lever Arch Binder', 'Archive', 80, 4.1, 328.0],
          ['PRD-104', 'Pigment Ink Cartridge Set', 'Printing', 18, 34.0, 612.0],
          ['PRD-105', 'USB-C Multiport Hub', 'Hardware', 12, 42.0, 504.0],
        ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, lang === 'tr' ? 'Stok_Raporu' : 'Inventory_Report');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new Uint8Array(out);
}
