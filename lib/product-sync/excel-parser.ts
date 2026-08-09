import * as XLSX from "xlsx";
import type { ParsedLot } from "./types";

/**
 * Parse a file downloaded from the Nirvana portal.
 *
 * The portal exports HTML disguised as XLS. Each <td> has:
 *   - bgcolor attribute  → plot is SOLD / reserved / booked / confirmed
 *   - no bgcolor         → plot is AVAILABLE (open)
 *
 * Falls back to SheetJS for genuine binary XLS/XLSX files.
 */
export async function parseAvailabilityExcel(buffer: Buffer): Promise<ParsedLot[]> {
  const header = buffer.slice(0, 500).toString("utf8");
  // Excel 2003 XML (SpreadsheetML) uses <Cell>/<Data> tags — route to binary parser (SheetJS handles it).
  const isExcel2003Xml =
    header.includes("schemas-microsoft-com:office:spreadsheet") ||
    (header.includes("<Workbook") && header.includes("<Table>"));
  if (isExcel2003Xml) return parseBinaryExcel(buffer);

  const headerLower = header.toLowerCase();
  const isHtml = headerLower.includes("<html") || headerLower.includes("<!doctype") || headerLower.includes("<table");
  if (isHtml) return parseHtmlLayout(buffer);

  return parseBinaryExcel(buffer);
}

// ── HTML parser (primary path for Nirvana portal exports) ────────────────────

function parseHtmlLayout(buffer: Buffer): ParsedLot[] {
  const html = buffer.toString("utf8");
  const results: ParsedLot[] = [];

  // Match every <td ...> ... </td> block
  // Capture optional bgcolor attribute and inner text
  const tdRegex = /<td([^>]*)>([\s\S]*?)<\/td>/gi;
  let match: RegExpExecArray | null;

  while ((match = tdRegex.exec(html)) !== null) {
    const attrs = match[1];
    const inner = match[2].replace(/<[^>]+>/g, "").trim(); // strip <b> tags etc.

    if (!inner || !isProductCode(inner)) continue;

    // No bgcolor attribute = open/available
    const hasBgColor = /bgcolor\s*=/i.test(attrs);
    results.push({ lotCode: inner, available: !hasBgColor });
  }

  const available = results.filter(r => r.available).length;
  console.log(`  [PARSER] ${results.length} lot codes — ${available} available, ${results.length - available} sold`);

  return results;
}

// ── Binary XLS/XLSX parser (fallback) ────────────────────────────────────────

function parseBinaryExcel(buffer: Buffer): ParsedLot[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellStyles: true });
  const results: ParsedLot[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");

    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = sheet[addr];
        if (!cell) continue;

        const text = String(cell.v ?? "").trim();
        if (!text || !isProductCode(text)) continue;

        const s = (cell as any).s;
        const hasFill = s && s.fgColor && s.fgColor.rgb &&
          s.fgColor.rgb.toUpperCase() !== "FFFFFF";

        results.push({ lotCode: text, available: !hasFill });
      }
    }
  }

  const available = results.filter(r => r.available).length;
  console.log(`  [PARSER] ${results.length} lot codes — ${available} available, ${results.length - available} sold`);

  return results;
}

// ── Layout HTML snapshot ──────────────────────────────────────────────────────
// Called at sync time to produce an annotated HTML table that mirrors
// the exact cell grid from the portal export (gaps, structure preserved).
// Each lot-code cell gets a CSS class (nz-avail / nz-sold) and data-lot attribute.

export function extractLayoutHtml(buffer: Buffer): string {
  const raw = buffer.toString("utf8");

  // Excel 2003 XML (SpreadsheetML): has <Table>/<Cell> tags, NOT <td> tags.
  // Must be detected before the generic HTML check so it routes to the binary parser.
  const isExcel2003Xml =
    raw.includes("schemas-microsoft-com:office:spreadsheet") ||
    (raw.includes("<Workbook") && raw.includes("<Table>"));
  if (isExcel2003Xml) return extractLayoutHtmlFromBinary(buffer);

  const isHtml =
    raw.slice(0, 300).toLowerCase().includes("<html") ||
    raw.slice(0, 300).toLowerCase().includes("<table");

  if (!isHtml) return extractLayoutHtmlFromBinary(buffer);

  // Grab from the first <table to the last </table>
  const tStart = raw.search(/<table/i);
  const tEnd   = raw.lastIndexOf("</table>") + "</table>".length;
  if (tStart < 0 || tEnd <= tStart) return "";

  let table = raw.slice(tStart, tEnd);

  // ── Pass 1: annotate each <td> ──────────────────────────────────
  table = table.replace(/<td([^>]*)>([\s\S]*?)<\/td>/gi, (_m, attrs: string, inner: string) => {
    const text     = inner.replace(/<[^>]+>/g, "").trim();
    const hasBg    = /bgcolor\s*=/i.test(attrs);
    const cleanA   = attrs.replace(/\s*bgcolor\s*=\s*["'][^"']*["']/gi, "");
    const isLot    = isProductCode(text);

    if (isLot) {
      const cls = hasBg ? "nz-sold" : "nz-avail";
      return `<td${cleanA} class="${cls}" data-lot="${text}">${text}</td>`;
    }
    if (hasBg) return `<td${cleanA} class="nz-gap"></td>`;
    if (text)  return `<td${cleanA} class="nz-label">${inner}</td>`;
    return `<td${cleanA} class="nz-empty"></td>`;
  });

  // ── Pass 2: split into rows and inject wall headers ─────────────
  // Each row is the text between <tr...> and </tr>
  const rowChunks: string[] = [];
  const trOpenRegex = /<tr[^>]*>/gi;
  const parts = table.split(/<\/tr>/i);

  // Collect { rowHtml, wallId, available, total } per row
  type RowInfo = { html: string; wallId: string | null; avail: number; total: number };
  const rows: RowInfo[] = [];

  for (const part of parts) {
    const trOpen = part.search(/<tr[^>]*>/i);
    if (trOpen < 0) continue;
    const rowHtml = part.slice(trOpen) + "</tr>";

    // Find lot codes in this row
    const lotMatches = [...rowHtml.matchAll(/data-lot="([^"]+)"/g)];
    if (lotMatches.length === 0) {
      rows.push({ html: rowHtml, wallId: null, avail: 0, total: 0 });
      continue;
    }

    const firstLot = lotMatches[0][1];
    const wallId   = firstLot.split("-")[0] ?? null;
    const avail    = (rowHtml.match(/class="nz-avail"/g) ?? []).length;
    const sold     = (rowHtml.match(/class="nz-sold"/g) ?? []).length;
    rows.push({ html: rowHtml, wallId, avail, total: avail + sold });
  }

  // Group rows by wallId, accumulating all rows per wall section.
  // Lot codes are deduplicated globally — if the portal exports the same lot twice
  // (e.g. UF appears in both a combined sheet and a separate UF sheet), only the
  // first occurrence is kept. Rows where every lot code is a duplicate are dropped.
  // This preserves legitimate multi-row wall sections (e.g. NCKL A1-S1/S10/S11).
  const wallOrder: string[] = [];
  const wallRows: Record<string, string[]> = {};
  const wallStats: Record<string, { avail: number; total: number }> = {};
  const seenLotCodes = new Set<string>();

  for (const row of rows) {
    if (!row.wallId) continue;

    const lotCodesInRow = [...row.html.matchAll(/data-lot="([^"]+)"/g)].map(m => m[1]);
    const newLotCodes   = lotCodesInRow.filter(c => !seenLotCodes.has(c));

    // All lots already seen — this row is a duplicate block, skip it entirely
    if (lotCodesInRow.length > 0 && newLotCodes.length === 0) continue;

    // Register new lot codes
    newLotCodes.forEach(c => seenLotCodes.add(c));

    // If some (but not all) lots were duplicates, blank out the duplicate cells
    let rowHtml = row.html;
    if (newLotCodes.length < lotCodesInRow.length) {
      rowHtml = row.html.replace(/<td([^>]*)data-lot="([^"]+)"([^>]*)>[^<]*<\/td>/g,
        (_m, a1, lotCode, a2) => seenLotCodes.has(lotCode) && !newLotCodes.includes(lotCode)
          ? `<td${a1}class="nz-empty"${a2}></td>`
          : _m
      );
    }

    const rowAvail = (rowHtml.match(/class="nz-avail"/g) ?? []).length;
    const rowTotal = rowAvail + (rowHtml.match(/class="nz-sold"/g) ?? []).length;

    if (!wallRows[row.wallId]) {
      wallOrder.push(row.wallId);
      wallRows[row.wallId] = [];
      wallStats[row.wallId] = { avail: 0, total: 0 };
    }
    wallRows[row.wallId].push(rowHtml);
    wallStats[row.wallId].avail += rowAvail;
    wallStats[row.wallId].total += rowTotal;
  }

  // Rebuild with one header per wall section
  const tableOpen = table.match(/^<table[^>]*>/i)?.[0] ?? "<table>";
  const out: string[] = [tableOpen];

  for (const wallId of wallOrder) {
    const stats = wallStats[wallId];
    out.push(
      `<tr class="nz-wall-header">` +
      `<td colspan="999" class="nz-wall-cell">` +
      `<span class="nz-wall-name">${wallId}</span>` +
      `<span class="nz-wall-stat">${stats.avail} available · ${stats.total} total</span>` +
      `</td></tr>`
    );
    out.push(...wallRows[wallId]);
  }

  out.push("</table>");
  return out.join("\n");
}

// ── Binary Excel layout extractor ─────────────────────────────────────────────
// Fallback for zones whose portal export is a genuine binary XLS (not HTML).
// Uses SheetJS to read the sheet preserving cell positions, then builds the
// same annotated HTML table structure as the HTML path above.

function extractLayoutHtmlFromBinary(buffer: Buffer): string {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer", cellStyles: true });
    if (!workbook.SheetNames.length) return "";

    // Collect rows across ALL sheets (each sheet = one wall section in multi-sheet exports)
    type RowInfo = { html: string; wallId: string | null; avail: number; total: number };
    const rows: RowInfo[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const ref = sheet["!ref"];
      if (!ref) continue;
      const range = XLSX.utils.decode_range(ref);

      // Build a sparse 2D grid: grid[row][col] = { text, isSold }
      type Cell = { text: string; isSold: boolean };
      const grid: Record<number, Record<number, Cell>> = {};

      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = sheet[addr];
          if (!cell) continue;
          const text = String(cell.v ?? "").trim();
          if (!text) continue;
          const s = (cell as any).s;
          const hasFill = s && s.fgColor && s.fgColor.rgb &&
            s.fgColor.rgb.toUpperCase() !== "FFFFFF" &&
            s.fgColor.rgb.toUpperCase() !== "000000";
          if (!grid[R]) grid[R] = {};
          grid[R][C] = { text, isSold: !!hasFill };
        }
      }

      for (let R = range.s.r; R <= range.e.r; R++) {
        const rowCells = grid[R];
        if (!rowCells) continue;
        let rowHtml = "<tr>";
        let avail = 0; let total = 0; let wallId: string | null = null;
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cell = rowCells[C];
          if (!cell) { rowHtml += `<td class="nz-empty"></td>`; continue; }
          const { text, isSold } = cell;
          if (isProductCode(text)) {
            const cls = isSold ? "nz-sold" : "nz-avail";
            rowHtml += `<td class="${cls}" data-lot="${text}">${text}</td>`;
            if (!wallId) wallId = text.split("-")[0] ?? null;
            if (!isSold) avail++;
            total++;
          } else {
            rowHtml += `<td class="nz-label">${text}</td>`;
          }
        }
        rowHtml += "</tr>";
        rows.push({ html: rowHtml, wallId, avail, total });
      }
    }

    // Same wall-grouping logic as HTML path
    const wallOrder: string[] = [];
    const wallRows: Record<string, string[]> = {};
    const wallStats: Record<string, { avail: number; total: number }> = {};

    for (const row of rows) {
      if (!row.wallId) continue;
      if (!wallRows[row.wallId]) {
        wallOrder.push(row.wallId);
        wallRows[row.wallId] = [];
        wallStats[row.wallId] = { avail: 0, total: 0 };
      }
      wallRows[row.wallId].push(row.html);
      wallStats[row.wallId].avail += row.avail;
      wallStats[row.wallId].total += row.total;
    }

    const out: string[] = ["<table>"];
    for (const wallId of wallOrder) {
      const stats = wallStats[wallId];
      out.push(
        `<tr class="nz-wall-header">` +
        `<td colspan="999" class="nz-wall-cell">` +
        `<span class="nz-wall-name">${wallId}</span>` +
        `<span class="nz-wall-stat">${stats.avail} available · ${stats.total} total</span>` +
        `</td></tr>`
      );
      out.push(...wallRows[wallId]);
    }
    out.push("</table>");
    return out.join("\n");
  } catch {
    return "";
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isProductCode(text: string): boolean {
  if (text.length < 3 || text.length > 30) return false;
  if (/\s/.test(text)) return false;
  // Hyphenated codes: "09-08", "3A-38", "01-378", "PD1G-L-001"
  // Must have at least one digit and a hyphen with content on both sides
  if (/^[A-Za-z0-9]+-[A-Za-z0-9-]+$/.test(text) && /[0-9]/.test(text)) return true;
  // Non-hyphenated codes: "SB58", "SA56" — must have both a letter and a digit
  if (/[A-Za-z]/.test(text) && /[0-9]/.test(text) && !/^-/.test(text)) return true;
  return false;
}
