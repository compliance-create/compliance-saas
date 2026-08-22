// 直接测 pdf2json 看 PDF 解析是否正常
const PDFParser = require('pdf2json');
const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'sample-contract-real.pdf');
const buf = fs.readFileSync(file);
console.log('File size:', buf.length);

const start = Date.now();
const parser = new PDFParser(buf, {});
parser.on('pdfParser_dataReady', (data) => {
  const elapsed = Date.now() - start;
  const text = (data.Pages ?? [])
    .map((p) => (p.Texts ?? []).map((t) => t.R?.[0]?.T ?? '').join(' '))
    .join('\n');
  console.log('elapsed:', elapsed, 'ms');
  console.log('pages:', data.Pages?.length);
  console.log('text length:', text.length);
  console.log('text preview:', decodeURIComponent(text.slice(0, 200)));
  parser.destroy();
});
parser.on('pdfParser_dataError', (err) => {
  console.error('Error:', err);
});
