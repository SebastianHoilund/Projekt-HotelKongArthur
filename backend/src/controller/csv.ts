type Cell = string | number | null;

// RFC 4180: tekst citeres altid, og " fordobles. Tal står uciteret, så Tableau læser dem som tal.
function cell(value: Cell): string {
  if (value === null) return '';
  if (typeof value === 'number') return String(value);
  return `"${value.replaceAll('"', '""')}"`;
}

export function toCsv<T extends object>(rows: T[], columns: (keyof T & string)[]): string {
  const lines = [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => cell(row[column] as Cell)).join(',')),
  ];
  return lines.map((line) => `${line}\r\n`).join('');
}
