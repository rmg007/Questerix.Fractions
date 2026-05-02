import { readFileSync } from 'node:fs';

const bundle = JSON.parse(readFileSync('src/curriculum/bundle.json', 'utf8'));

const kcCounts = {};
const mcCounts = {};
let totalTemplates = 0;

for (const [lv, templates] of Object.entries(bundle.levels)) {
  for (const t of templates) {
    totalTemplates++;
    
    const skillIds = t.skillIds || t.skill_ids || [];
    for (const id of skillIds) {
      kcCounts[id] = (kcCounts[id] || 0) + 1;
    }
    
    const mcTraps = t.misconceptionTraps || t.misconception_traps || [];
    for (const id of mcTraps) {
      mcCounts[id] = (mcCounts[id] || 0) + 1;
    }
  }
}

console.log(`\nCurriculum Density Audit (Phase A.5)`);
console.log(`Total Templates: ${totalTemplates}`);
console.log(`Total Levels: ${Object.keys(bundle.levels).length}`);

console.log('\nKnowledge Component (KC) Counts:');
const sortedKCs = Object.entries(kcCounts).sort((a, b) => b[1] - a[1]);
for (const [id, count] of sortedKCs) {
  const status = count < 12 ? '[SPARSE]' : '[OK]';
  console.log(`  ${id.padEnd(6)}: ${String(count).padStart(3)} ${status}`);
}

console.log('\nMisconception (MC) Counts:');
const sortedMCs = Object.entries(mcCounts).sort((a, b) => b[1] - a[1]);
for (const [id, count] of sortedMCs) {
  const status = count < 5 ? '[SPARSE]' : '[OK]';
  console.log(`  ${id.padEnd(10)}: ${String(count).padStart(3)} ${status}`);
}

const sparseKCs = sortedKCs.filter(k => k[1] < 12).length;
const totalKCs = sortedKCs.length;
console.log(`\nSummary:`);
console.log(`- Sparse KCs (<12): ${sparseKCs} / ${totalKCs}`);
console.log(`- Sparse MCs (<5):  ${sortedMCs.filter(m => m[1] < 5).length} / ${sortedMCs.length}`);
