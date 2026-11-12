const fs = require('fs');
const path = require('path');

function generateActionPlanXlsx(rows, outputPath) {
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Action Plan" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const strings = [];
  const stringMap = new Map();
  function getStrIdx(s) {
    const str = String(s ?? '');
    if (stringMap.has(str)) return stringMap.get(str);
    const idx = strings.length;
    strings.push(str);
    stringMap.set(str, idx);
    return idx;
  }

  let sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>`;
  rows.forEach((row, rIdx) => {
    const rNum = rIdx + 1;
    sheet1Xml += `<row r="${rNum}">`;
    row.forEach((val, cIdx) => {
      const colLetter = String.fromCharCode(65 + cIdx);
      if (val !== undefined && val !== null && String(val) !== '') {
        const strIdx = getStrIdx(val);
        sheet1Xml += `<c r="${colLetter}${rNum}" t="s"><v>${strIdx}</v></c>`;
      }
    });
    sheet1Xml += `</row>`;
  });
  sheet1Xml += `</sheetData></worksheet>`;

  let sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">`;
  strings.forEach(s => {
    const escaped = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    sharedStringsXml += `<si><t>${escaped}</t></si>`;
  });
  sharedStringsXml += `</sst>`;

  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
    crcTable[n] = c;
  }
  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
    return (crc ^ -1) >>> 0;
  }

  const files = [
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: rootRelsXml },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
    { name: 'xl/workbook.xml', content: workbookXml },
    { name: 'xl/worksheets/sheet1.xml', content: sheet1Xml },
    { name: 'xl/sharedStrings.xml', content: sharedStringsXml }
  ];

  const fileEntries = [];
  let offset = 0;
  for (const f of files) {
    const data = Buffer.from(f.content, 'utf8');
    const nameBuf = Buffer.from(f.name, 'utf8');
    const crc = crc32(data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    fileEntries.push({ nameBuf, data, localHeader, crc, offset, length: data.length });
    offset += localHeader.length + nameBuf.length + data.length;
  }

  const cdEntries = [];
  let cdSize = 0;
  for (const entry of fileEntries) {
    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0);
    cdHeader.writeUInt16LE(20, 4);
    cdHeader.writeUInt16LE(20, 6);
    cdHeader.writeUInt16LE(0x0800, 8);
    cdHeader.writeUInt32LE(entry.crc, 16);
    cdHeader.writeUInt32LE(entry.length, 20);
    cdHeader.writeUInt32LE(entry.length, 24);
    cdHeader.writeUInt16LE(entry.nameBuf.length, 28);
    cdHeader.writeUInt16LE(0, 30);
    cdHeader.writeUInt16LE(0, 32);
    cdHeader.writeUInt16LE(0, 34);
    cdHeader.writeUInt16LE(0, 36);
    cdHeader.writeUInt32LE(0, 38);
    cdHeader.writeUInt32LE(entry.offset, 42);
    cdEntries.push(cdHeader, entry.nameBuf);
    cdSize += cdHeader.length + entry.nameBuf.length;
  }

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(fileEntries.length, 8);
  eocd.writeUInt16LE(fileEntries.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(offset, 16);

  const chunks = [];
  for (const entry of fileEntries) {
    chunks.push(entry.localHeader, entry.nameBuf, entry.data);
  }
  chunks.push(...cdEntries, eocd);
  const finalBuffer = Buffer.concat(chunks);

  fs.writeFileSync(outputPath, finalBuffer);
  console.log(`Generated ${outputPath} (${finalBuffer.length} bytes)`);
}

const templateRows = [
  ['S.No', 'Tasks ', 'Start Date', 'End Date', 'This Week Plan', 'Status ', 'Total Completed'],
  ['', '', '', '', '', '', 'So Far'],
  ['1', 'Prepare the test case for 3rd party integration and interface of the bank software ', '', '', '', '', ''],
  ['1.1', 'Understand the functionality and purpose of each integration, then create test cases for each third-party system and bank application integrated with the CBS.', '2026-11-09', '2026-11-14', '10', '190+ 3rd party integration and interface ', '88'],
  ['2', 'Familiarization Training (Main Bank)', '2026-11-09', '2026-11-14', '0.05', '', '0.95'],
  ['3', 'Environment Preparation (Main Bank)', '2026-10-09', '2026-11-14', '0.01', '', '0.11'],
  ['4', 'Familiarization Training (Subsidiaries Bank)', '2026-11-09', '2026-11-14', '0.05', '', '0.95'],
  ['5', 'Environment Preparation (Subsidiaries Bank)', '2026-11-09', '2026-11-14', '0.3', '', '0.45']
];

const dest = path.resolve(__dirname, '..', 'sample_action_plan.xlsx');
generateActionPlanXlsx(templateRows, dest);

