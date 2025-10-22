const fs = require('fs');
const path = require('path');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/check-md.js <markdown-file>');
  process.exit(1);
}

const s = fs.readFileSync(path.resolve(file), 'utf8');
const keys = [
  'Motivation',
  'Analogy to Psychology',
  'Computation as a Resource',
  'Thinking in Tokens',
  'Scaling Laws for Thinking Time',
  "What’s for Future",
  'References',
  'Citation'
];
const result = keys.map(k => ({ key: k, present: s.includes(k) }));
console.table(result);
