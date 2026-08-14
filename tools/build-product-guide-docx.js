/*
 * Regenerates VISADOO_PRODUCT_REFERENCE_GUIDE.docx from the .md (keeps the Word
 * version in sync with the markdown). Small markdown -> Word converter using docx-js.
 *
 * HOW TO RUN (Windows, portable Node):
 *   cd "C:\MY WEBSITE\tools"
 *   "C:\nodejs-portable\node-v20.18.1-win-x64\npm.cmd" install docx@7.8.2   (v7 — v8 is ESM-only and breaks require)
 *   "C:\nodejs-portable\node-v20.18.1-win-x64\node.exe" build-product-guide-docx.js
 *
 * After regenerating: secret-scan both files and confirm the .docx is a valid OOXML zip.
 * (node_modules here is git-ignored.)
 */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType, ShadingType,
  Footer, PageNumber
} = require('docx');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'VISADOO_PRODUCT_REFERENCE_GUIDE.md');
const OUT = path.join(ROOT, 'VISADOO_PRODUCT_REFERENCE_GUIDE.docx');
const CONTENT_WIDTH = 9360; // US Letter, 1" margins

const md = fs.readFileSync(SRC, 'utf8');
const lines = md.split(/\r?\n/);

function inlineRuns(text, baseOpts) {
  baseOpts = baseOpts || {};
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun(Object.assign({}, baseOpts, { text: text.slice(last, m.index) })));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(new TextRun(Object.assign({}, baseOpts, { text: tok.slice(2, -2), bold: true })));
    else out.push(new TextRun(Object.assign({}, baseOpts, { text: tok.slice(1, -1), font: 'Consolas', size: 20 })));
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(new TextRun(Object.assign({}, baseOpts, { text: text.slice(last) })));
  if (!out.length) out.push(new TextRun(Object.assign({}, baseOpts, { text: text })));
  return out;
}

function splitCells(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map(c => c.trim());
}

function makeTable(block) {
  const header = splitCells(block[0]);
  const rows = block.slice(2).map(splitCells);
  const n = header.length;
  const col = Math.floor(CONTENT_WIDTH / n);
  const widths = Array(n).fill(col);
  widths[n - 1] = CONTENT_WIDTH - col * (n - 1);
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  const borders = { top: border, bottom: border, left: border, right: border };
  function cell(text, i, head) {
    return new TableCell({
      borders,
      width: { size: widths[i], type: WidthType.DXA },
      shading: head ? { fill: 'DCEAF7', type: ShadingType.CLEAR, color: 'auto' } : undefined,
      margins: { top: 60, bottom: 60, left: 110, right: 110 },
      children: [new Paragraph({ children: inlineRuns(text, head ? { bold: true } : {}), spacing: { after: 0 } })]
    });
  }
  const trows = [];
  trows.push(new TableRow({ tableHeader: true, children: header.map((t, i) => cell(t, i, true)) }));
  rows.forEach(r => { while (r.length < n) r.push(''); trows.push(new TableRow({ children: r.slice(0, n).map((t, i) => cell(t, i, false)) })); });
  return new Table({ width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: widths, rows: trows });
}

const children = [];
let i = 0;
while (i < lines.length) {
  const line = lines[i];
  const t = line.trim();
  if (t === '') { i++; continue; }
  if (t.startsWith('|')) {
    const block = [];
    while (i < lines.length && lines[i].trim().startsWith('|')) { block.push(lines[i]); i++; }
    if (block.length >= 2) { children.push(makeTable(block)); children.push(new Paragraph({ spacing: { after: 120 } })); continue; }
  }
  if (/^---+$/.test(t)) {
    children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 1 } }, spacing: { before: 80, after: 160 } }));
    i++; continue;
  }
  let h = /^(#{1,4})\s+(.*)$/.exec(t);
  if (h) {
    const level = h[1].length;
    const txt = h[2].replace(/\*\*/g, '');
    const map = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3, 4: HeadingLevel.HEADING_4 };
    children.push(new Paragraph({ heading: map[level], children: inlineRuns(txt) }));
    i++; continue;
  }
  if (/^>\s?/.test(t)) {
    children.push(new Paragraph({
      children: inlineRuns(t.replace(/^>\s?/, ''), { italics: true, color: '444444' }),
      indent: { left: 480 }, spacing: { after: 120 },
      border: { left: { style: BorderStyle.SINGLE, size: 18, color: 'B8C7DA', space: 12 } }
    }));
    i++; continue;
  }
  let b = /^\s*[-*]\s+(.*)$/.exec(line);
  if (b) { children.push(new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: inlineRuns(b[1]), spacing: { after: 40 } })); i++; continue; }
  let nm = /^\s*(\d+)\.\s+(.*)$/.exec(line);
  if (nm) { children.push(new Paragraph({ children: [new TextRun({ text: nm[1] + '.  ', bold: true })].concat(inlineRuns(nm[2])), indent: { left: 720, hanging: 360 }, spacing: { after: 40 } })); i++; continue; }
  children.push(new Paragraph({ children: inlineRuns(t), spacing: { after: 120 } }));
  i++;
}

const doc = new Document({
  creator: 'Visa Doo',
  title: 'Visa Doo — Product Reference Guide',
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 34, bold: true, font: 'Arial', color: '1F4E79' }, paragraph: { spacing: { before: 320, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 27, bold: true, font: 'Arial', color: '2E6097' }, paragraph: { spacing: { before: 260, after: 140 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 23, bold: true, font: 'Arial', color: '333333' }, paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 } },
      { id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, italics: true, font: 'Arial' }, paragraph: { spacing: { before: 120, after: 80 }, outlineLevel: 3 } }
    ]
  },
  numbering: { config: [{ reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Visa Doo — Product Reference Guide   ·   Page ', size: 18, color: '888888' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888' })] })] }) },
    children
  }]
});

Packer.toBuffer(doc).then(buf => { fs.writeFileSync(OUT, buf); console.log('WROTE', OUT, buf.length, 'bytes,', children.length, 'blocks'); });
