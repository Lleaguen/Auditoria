/**
 * Generador de archivos .xlsx sin dependencias externas.
 * Genera un xlsx válido (Office Open XML) con múltiples hojas.
 * Funciona en el navegador usando JSZip-style zip manual con deflate nativo.
 */

type CellValue = string | number | boolean | null | undefined;
type Row = Record<string, CellValue>;

interface Sheet {
  name: string;
  rows: Row[];
}

// ── Escape XML ───────────────────────────────────────────────────────────────

function escapeXml(val: string): string {
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

// ── Convertir columna numérica a letra (0=A, 1=B, ...) ──────────────────────

function colName(idx: number): string {
  let name = '';
  let n = idx;
  do {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return name;
}

// ── Shared strings ───────────────────────────────────────────────────────────

function buildSharedStrings(sheets: Sheet[]): { xml: string; index: Map<string, number> } {
  const index = new Map<string, number>();
  const strings: string[] = [];

  for (const sheet of sheets) {
    for (const row of sheet.rows) {
      for (const val of Object.values(row)) {
        if (val === null || val === undefined) continue;
        if (typeof val !== 'number' && typeof val !== 'boolean') {
          const s = String(val);
          if (!index.has(s)) {
            index.set(s, strings.length);
            strings.push(s);
          }
        }
      }
      // Headers
      for (const key of Object.keys(row)) {
        if (!index.has(key)) {
          index.set(key, strings.length);
          strings.push(key);
        }
      }
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">
${strings.map((s) => `<si><t xml:space="preserve">${escapeXml(s)}</t></si>`).join('\n')}
</sst>`;

  return { xml, index };
}

// ── Generar XML de una hoja ──────────────────────────────────────────────────

function buildSheetXml(sheet: Sheet, ssIndex: Map<string, number>): string {
  if (sheet.rows.length === 0) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData/>
</worksheet>`;
  }

  const headers = Object.keys(sheet.rows[0]);
  const allRows: CellValue[][] = [
    headers,
    ...sheet.rows.map((r) => headers.map((h) => r[h] ?? '')),
  ];

  const rowsXml = allRows.map((row, rowIdx) => {
    const cells = row.map((val, colIdx) => {
      const ref = `${colName(colIdx)}${rowIdx + 1}`;
      if (val === null || val === undefined || val === '') {
        return `<c r="${ref}"/>`;
      }
      if (typeof val === 'number') {
        return `<c r="${ref}" t="n"><v>${val}</v></c>`;
      }
      if (typeof val === 'boolean') {
        return `<c r="${ref}" t="b"><v>${val ? 1 : 0}</v></c>`;
      }
      const s = String(val);
      const idx = ssIndex.get(s) ?? 0;
      return `<c r="${ref}" t="s"><v>${idx}</v></c>`;
    });
    return `<row r="${rowIdx + 1}">${cells.join('')}</row>`;
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>
${rowsXml.join('\n')}
</sheetData>
</worksheet>`;
}

// ── ZIP mínimo (store, sin compresión) ────────────────────────────────────────
// Implementación de ZIP format (PKZIP spec) sin dependencias

function strToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function uint32LE(n: number): Uint8Array {
  const b = new Uint8Array(4);
  b[0] = n & 0xff; b[1] = (n >> 8) & 0xff;
  b[2] = (n >> 16) & 0xff; b[3] = (n >> 24) & 0xff;
  return b;
}

function uint16LE(n: number): Uint8Array {
  const b = new Uint8Array(2);
  b[0] = n & 0xff; b[1] = (n >> 8) & 0xff;
  return b;
}

function crc32(data: Uint8Array): number {
  const table = makeCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

let _crcTable: number[] | null = null;
function makeCrcTable(): number[] {
  if (_crcTable) return _crcTable;
  _crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    _crcTable[n] = c;
  }
  return _crcTable;
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

function buildZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const localHeaders: Uint8Array[] = [];
  const centralDirs: Uint8Array[] = [];
  const offsets: number[] = [];
  let offset = 0;

  for (const file of files) {
    offsets.push(offset);
    const nameBytes = strToBytes(file.name);
    const crc = crc32(file.data);

    // Local file header
    const lh = concat(
      new Uint8Array([0x50, 0x4b, 0x03, 0x04]), // signature
      uint16LE(20),           // version needed
      uint16LE(0),            // flags
      uint16LE(0),            // compression (store)
      uint16LE(0),            // mod time
      uint16LE(0),            // mod date
      uint32LE(crc),
      uint32LE(file.data.length),
      uint32LE(file.data.length),
      uint16LE(nameBytes.length),
      uint16LE(0),            // extra length
      nameBytes,
      file.data,
    );
    localHeaders.push(lh);
    offset += lh.length;

    // Central directory entry
    const cd = concat(
      new Uint8Array([0x50, 0x4b, 0x01, 0x02]), // signature
      uint16LE(20),           // version made by
      uint16LE(20),           // version needed
      uint16LE(0),            // flags
      uint16LE(0),            // compression
      uint16LE(0),            // mod time
      uint16LE(0),            // mod date
      uint32LE(crc),
      uint32LE(file.data.length),
      uint32LE(file.data.length),
      uint16LE(nameBytes.length),
      uint16LE(0),            // extra
      uint16LE(0),            // comment
      uint16LE(0),            // disk start
      uint16LE(0),            // internal attr
      uint32LE(0),            // external attr
      uint32LE(offsets[offsets.length - 1]),
      nameBytes,
    );
    centralDirs.push(cd);
  }

  const cdOffset = offset;
  const cdSize = centralDirs.reduce((s, a) => s + a.length, 0);

  // End of central directory
  const eocd = concat(
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
    uint16LE(0),
    uint16LE(0),
    uint16LE(files.length),
    uint16LE(files.length),
    uint32LE(cdSize),
    uint32LE(cdOffset),
    uint16LE(0),
  );

  return concat(...localHeaders, ...centralDirs, eocd);
}

// ── Punto de entrada público ─────────────────────────────────────────────────

export function writeXlsx(sheets: Sheet[], filename: string): void {
  const { xml: ssXml, index: ssIndex } = buildSharedStrings(sheets);

  const sheetXmls = sheets.map((s) => buildSheetXml(s, ssIndex));

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
${sheets.map((s, i) => `<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('\n')}
</sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('\n')}
<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const files: { name: string; data: Uint8Array }[] = [
    { name: '[Content_Types].xml',       data: strToBytes(contentTypes) },
    { name: '_rels/.rels',               data: strToBytes(rootRels) },
    { name: 'xl/workbook.xml',           data: strToBytes(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels',data: strToBytes(workbookRels) },
    { name: 'xl/sharedStrings.xml',      data: strToBytes(ssXml) },
    ...sheetXmls.map((xml, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: strToBytes(xml),
    })),
  ];

  const zipBytes = buildZip(files);
  const blob = new Blob([zipBytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
