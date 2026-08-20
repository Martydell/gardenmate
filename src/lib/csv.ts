import type { Plant } from '../types';

const PLANT_CSV_COLUMNS: { key: keyof Plant; header: string }[] = [
  { key: 'id', header: 'ID' },
  { key: 'nickname', header: 'Nickname' },
  { key: 'common_name', header: 'Common Name' },
  { key: 'scientific_name', header: 'Scientific Name' },
  { key: 'category', header: 'Category' },
  { key: 'status', header: 'Status' },
  { key: 'source', header: 'Source' },
  { key: 'date_acquired', header: 'Date Acquired' },
  { key: 'date_planted', header: 'Date Planted' },
  { key: 'pot_size', header: 'Pot Size' },
  { key: 'soil_type', header: 'Soil Type' },
  { key: 'last_watered', header: 'Last Watered' },
  { key: 'last_fed', header: 'Last Fed' },
  { key: 'notes', header: 'Notes' },
  { key: 'is_wishlist', header: 'Wishlist' },
  { key: 'created_at', header: 'Added On' },
];

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = Array.isArray(value) ? value.join('; ') : String(value);
  return /["\n,]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function plantsToCsv(plants: Plant[]): string {
  const header = PLANT_CSV_COLUMNS.map((col) => escapeCsvValue(col.header)).join(',');
  const rows = plants.map((plant) =>
    PLANT_CSV_COLUMNS.map((col) => escapeCsvValue(plant[col.key])).join(','),
  );
  return [header, ...rows].join('\r\n');
}

export function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
