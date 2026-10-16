const fs = require('fs');
const p = 'c:/Users/Rzem/OneDrive/Bureau/clothes2/components/home-content.tsx';
const d = fs.readFileSync(p, 'utf8');
const i = d.indexOf('imageData');
console.log('IDX=' + i);
console.log(JSON.stringify(d.slice(i - 300, i + 1200)));
