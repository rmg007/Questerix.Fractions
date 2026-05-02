import fs from 'fs';
import path from 'path';

const bundlePath = path.join(process.cwd(), 'src', 'curriculum', 'bundle.json');
const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));

let updatedCount = 0;

if (bundle.levels && bundle.levels['07']) {
  bundle.levels['07'].forEach(template => {
    const fracA = template.payload.fractionA;
    const fracB = template.payload.fractionB;

    if (fracA && fracB && fracA.startsWith('frac:') && fracB.startsWith('frac:')) {
      const [numA, denA] = fracA.replace('frac:', '').split('/').map(Number);
      const [numB, denB] = fracB.replace('frac:', '').split('/').map(Number);

      // Same numerator, different denominator comparison is the prime bait for MC-WHB-02
      if (numA === numB && denA !== denB) {
        template.misconceptionTraps = ['MC-WHB-02'];
        updatedCount++;
      }
    }
  });
}

fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2));
console.log(`Updated ${updatedCount} templates in Level 07 to use MC-WHB-02.`);
