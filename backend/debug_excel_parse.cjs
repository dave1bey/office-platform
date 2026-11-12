const fs = require('fs');
const zlib = require('zlib');

const buf = fs.readFileSync('C:/Users/HP/.gemini/antigravity/brain/fbeb2f47-596a-40b1-9967-ecae2e0b5177/.user_uploaded/media_1794418980523_b67de6d4.xlsx');

let offset = 0;
let sharedStringsXml = null;
let sheetXml = null;

while (offset < buf.length - 30) {
  const sig = buf.readUInt32LE(offset);
  if (sig !== 0x04034b50) break;
  const comp = buf.readUInt16LE(offset + 8);
  const compSize = buf.readUInt32LE(offset + 18);
  const nameLen = buf.readUInt16LE(offset + 26);
  const extraLen = buf.readUInt16LE(offset + 28);
  const name = buf.toString('utf8', offset + 30, offset + 30 + nameLen);
  const dataStart = offset + 30 + nameLen + extraLen;
  const raw = buf.slice(dataStart, dataStart + compSize);
  let d = comp === 0 ? raw : zlib.inflateRawSync(raw);
  if (name.includes('sharedStrings.xml')) sharedStringsXml = d.toString('utf8');
  if (name.includes('sheet1.xml')) sheetXml = d.toString('utf8');
  offset = dataStart + compSize;
}

const strings = [];
if (sharedStringsXml) {
  const siRegex = /<si>([\s\S]*?)<\/si>/g;
  let match;
  while ((match = siRegex.exec(sharedStringsXml)) !== null) {
    const tMatches = [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)];
    const text = tMatches.map(m => m[1]).join('');
    strings.push(text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
  }
}

console.log('Shared Strings Count:', strings.length);

const rowRegex = /<row[^>]*>([\s\S]*?)<\/row>/g;
let rMatch;
let rowIdx = 0;
while ((rMatch = rowRegex.exec(sheetXml)) !== null) {
  const rowContent = rMatch[1];
  const cRegex = /<c\s+r="([A-Z]+)\d+"(?:\s+t="([^"]+)")?[^>]*>(?:<v>([\s\S]*?)<\/v>)?<\/c>/g;
  const row = {};
  let cMatch;
  while ((cMatch = cRegex.exec(rowContent)) !== null) {
    const col = cMatch[1];
    const type = cMatch[2];
    const val = cMatch[3];
    if (type === 's' && val !== undefined) {
      row[col] = strings[parseInt(val)] || '';
    } else {
      row[col] = val || '';
    }
  }
  console.log(`Row ${rowIdx}:`, JSON.stringify(row));
  rowIdx++;
}

