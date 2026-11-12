/**
 * Standalone Script to generate a valid Excel (.xlsx) Action Plan
 * Uses Node's built-in zlib - Zero external packages needed!
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create a minimalist ZIP file in pure JS
function createZip(files) {
  const fileEntries = [];
  let offset = 0;

  for (const file of files) {
    const data = Buffer.from(file.content, 'utf8');
    const nameBuf = Buffer.from(file.name, 'utf8');
    const crc = crc32(data);

    // Local file header (30 bytes + name length + data length)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4);         // version needed (2.0)
    localHeader.writeUInt16LE(0x0800, 6);     // flags (UTF-8)
    localHeader.writeUInt16LE(0, 8);          // compression (0 = store)
    localHeader.writeUInt16LE(0, 10);         // time
    localHeader.writeUInt16LE(0, 12);         // date
    localHeader.writeUInt32LE(crc, 14);       // crc32
    localHeader.writeUInt32LE(data.length, 18); // compressed size
    localHeader.writeUInt32LE(data.length, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26); // name length
    localHeader.writeUInt16LE(0, 28);         // extra field length

    const localRecord = Buffer.concat([localHeader, nameBuf, data]);

    fileEntries.push({
      nameBuf,
      data,
      crc,
      offset,
      length: data.length
    });

    offset += localRecord.length;
  }

  // Central directory
  const cdEntries = [];
  let cdSize = 0;

  for (const entry of fileEntries) {
    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0); // central dir signature
    cdHeader.writeUInt16LE(20, 4);          // version made by
    cdHeader.writeUInt16LE(20, 6);          // version needed
    cdHeader.writeUInt16LE(0x0800, 8);      // flags (UTF-8)
    cdHeader.writeUInt16LE(0, 10);          // compression
    cdHeader.writeUInt16LE(0, 12);          // time
    cdHeader.writeUInt16LE(0, 14);          // date
    cdHeader.writeUInt32LE(entry.crc, 16);  // crc32
    cdHeader.writeUInt32LE(entry.length, 20); // compressed size
    cdHeader.writeUInt32LE(entry.length, 24); // uncompressed size
    cdHeader.writeUInt16LE(entry.nameBuf.length, 28); // name length
    cdHeader.writeUInt16LE(0, 30);          // extra len
    cdHeader.writeUInt16LE(0, 32);          // comment len
    cdHeader.writeUInt16LE(0, 34);          // disk number
    cdHeader.writeUInt16LE(0, 36);          // internal attributes
    cdHeader.writeUInt32LE(0, 38);          // external attributes
    cdHeader.writeUInt32LE(entry.offset, 42); // local header offset

    const cdRecord = Buffer.concat([cdHeader, entry.nameBuf]);
    cdEntries.push(cdRecord);
    cdSize += cdRecord.length;
  }

  // End of central directory record
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4);           // disk number
  eocd.writeUInt16LE(0, 6);           // disk where central dir starts
  eocd.writeUInt16LE(fileEntries.length, 8);  // number of central dir records on this disk
  eocd.writeUInt16LE(fileEntries.length, 10); // total number of central dir records
  eocd.writeUInt32LE(cdSize, 12);     // size of central directory
  eocd.writeUInt32LE(offset, 16);     // offset of start of central directory
  eocd.writeUInt16LE(0, 20);          // comment length

  // Combine local records
  const allChunks = [];
  for (const entry of fileEntries) {
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(entry.crc, 14);
    localHeader.writeUInt32LE(entry.length, 18);
    localHeader.writeUInt32LE(entry.length, 22);
    localHeader.writeUInt16LE(entry.nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    allChunks.push(localHeader, entry.nameBuf, entry.data);
  }

  allChunks.push(...cdEntries, eocd);
  return Buffer.concat(allChunks);
}

// CRC32 implementation
function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (~crc) >>> 0;
}

// XML Content for Excel
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
    <sheet name="Master Action Plan" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

// Sample Action Plan Data (with exact user template columns: ID, Description, Impact, Mitigation, Owner, Due, Status, Start, End, Responsible)
const sampleRows = [
  ["ID", "Description Risk Registor and Action Log ", "Impact", "Mitigation / next step", "Owner", "Due", "Status", "Start ", "End ", "Responsible "],
  ["R-01", "DLM Process Cycles ", "High", "The Bank DLM cycles will be completed by November 10, 2026. Discuss the updated plan and approach for environment preparation with the Bank.", "Core system , DB and project team ", "Nov 06,2026", "Open", "2026-02-11", "2026-02-11", "Dagnu- Action plan for space reclamation (DB)"],
  ["R-03", "IBM WebSphere Liberty 25.x to 26.x ", "High", "INLAKS will communicate with the Bank to use the recommended version of IBM WebSphere Liberty 26.x.", "Web team ", "Nov 06,2026", "Open", "2026-02-11", "2026-02-11", "Meseret- confirmed and share the test result of the properly function Ws Liberty"],
  ["A-01", "ModelBank Security Check & Baseline Verification", "High", "Execute comprehensive security checks on AIX OS level, application server security configurations, secure DB listener ports, and access credentials.", "Security & Systems Team", "", "Open", "2026-11-11", "2026-11-12", "Meseret, Dawit, Sabona"],
  ["A-02", "ModelBank Installation Step 1: TAFJ Framework on AIX", "High", "Install and configure TAFJ runtime framework on the AIX environment; set up environment paths, Java/TAFJ variables, and licensing.", "Core System & Infrastructure Team", "", "Open", "2026-11-13", "2026-11-13", "Meseret, Dawit, Sabona"],
  ["A-03", "ModelBank Installation Step 2: IBM WebSphere Liberty on AIX", "High", "Install and configure WebSphere Liberty application server on AIX; deploy ModelBank WAR/EAR archives, set JVM options, and configure HTTP/HTTPS endpoints.", "Web & Middleware Team", "", "Open", "2026-11-14", "2026-11-14", "Meseret, Dawit, Sabona"],
  ["A-04", "ModelBank Installation Step 3: Oracle DB Connection", "High", "Configure Oracle JDBC drivers, datasource configuration, database connection pooling, and verify end-to-end database connectivity from AIX to Oracle DB.", "Security & Systems Team", "", "Open", "2026-11-16", "2026-11-17", "Meseret, Dawit, Sabona"],
  ["R-07", "CBE need to confirm and provide the timeline for 4 application servers and 2 live database and 1 RO database availability.", "High", "CBE will provision the environment based on the shared sizing document.", "DB team ", "Nov 06,2026", "Open", "2026-02-11", "2026-05-11", "Meseret and Eyobed"]
];

const strings = [];
const stringMap = new Map();

function getStringIndex(str) {
  if (stringMap.has(str)) return stringMap.get(str);
  const idx = strings.length;
  strings.push(str);
  stringMap.set(str, idx);
  return idx;
}

let sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>`;

sampleRows.forEach((row, rIdx) => {
  const rowNum = rIdx + 1;
  sheetXml += `<row r="${rowNum}">`;
  row.forEach((cellVal, cIdx) => {
    const colLetter = String.fromCharCode(65 + cIdx);
    const cellRef = `${colLetter}${rowNum}`;
    const strIdx = getStringIndex(cellVal);
    sheetXml += `<c r="${cellRef}" t="s"><v>${strIdx}</v></c>`;
  });
  sheetXml += `</row>`;
});

sheetXml += `</sheetData></worksheet>`;

let sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">`;

strings.forEach(s => {
  // Escape XML characters
  const escaped = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  sharedStringsXml += `<si><t>${escaped}</t></si>`;
});
sharedStringsXml += `</sst>`;

const zipData = createZip([
  { name: '[Content_Types].xml', content: contentTypesXml },
  { name: '_rels/.rels', content: rootRelsXml },
  { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
  { name: 'xl/workbook.xml', content: workbookXml },
  { name: 'xl/worksheets/sheet1.xml', content: sheetXml },
  { name: 'xl/sharedStrings.xml', content: sharedStringsXml }
]);

const outputPath = path.join(__dirname, '..', 'sample_action_plan.xlsx');
fs.writeFileSync(outputPath, zipData);
console.log('✅ Generated sample Excel file at:', outputPath);

