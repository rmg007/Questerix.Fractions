import fs from 'fs';
import path from 'path';

const bundlePath = path.join(process.cwd(), 'src', 'curriculum', 'bundle.json');
const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));

const SKILL_MAP = {
  'SK-01': 'KC-HALVES-VIS', 'SK-02': 'KC-HALVES-VIS', 'SK-03': 'KC-HALVES-VIS', 'SK-04': 'KC-HALVES-VIS', 'SK-05': 'KC-HALVES-VIS',
  'SK-07': 'KC-UNITS-VIS', 'SK-08': 'KC-UNITS-VIS', 'SK-09': 'KC-UNITS-VIS', 'SK-10': 'KC-UNITS-VIS',
  'SK-06': 'KC-SET-MODEL', 'SK-19': 'KC-SET-MODEL',
  'SK-11': 'KC-PRODUCTION-1', 'SK-12': 'KC-PRODUCTION-1', 'SK-13': 'KC-PRODUCTION-1', 'SK-14': 'KC-PRODUCTION-1',
  'SK-15': 'KC-PRODUCTION-2', 'SK-16': 'KC-PRODUCTION-2', 'SK-17': 'KC-PRODUCTION-2', 'SK-18': 'KC-PRODUCTION-2', 'SK-20': 'KC-PRODUCTION-2',
  'SK-21': 'KC-SYMBOL-BASIC', 'SK-22': 'KC-SYMBOL-BASIC', 'SK-23': 'KC-SYMBOL-BASIC',
  'SK-24': 'KC-SYMBOL-ADV', 'SK-25': 'KC-SYMBOL-ADV', 'SK-26': 'KC-SYMBOL-ADV',
  'SK-27': 'KC-MAGNITUDE', 'SK-28': 'KC-MAGNITUDE', 'SK-29': 'KC-MAGNITUDE',
  'SK-30': 'KC-ORDERING', 'SK-31': 'KC-ORDERING', 'SK-32': 'KC-ORDERING', 'SK-33': 'KC-ORDERING'
};

function getFracVal(fracStr) {
  if (!fracStr || !fracStr.startsWith('frac:')) return null;
  const [n, d] = fracStr.replace('frac:', '').split('/').map(Number);
  return n / d;
}

let skillUpdates = 0;
let trapUpdates = 0;
let bugFixes = 0;

Object.keys(bundle.levels).forEach(levelId => {
  bundle.levels[levelId].forEach(template => {
    // 1. Consolidate Skills
    const newSkillIds = new Set();
    template.skillIds.forEach(id => {
      if (SKILL_MAP[id]) {
        newSkillIds.add(SKILL_MAP[id]);
        skillUpdates++;
      } else {
        newSkillIds.add(id); // Keep if not in map (shouldn't happen for SK-NN)
      }
    });
    template.skillIds = Array.from(newSkillIds);

    // 2. Misconception Traps
    if (levelId === '07') {
      const fracA = template.payload.fractionA;
      const fracB = template.payload.fractionB;
      const vA = getFracVal(fracA);
      const vB = getFracVal(fracB);
      
      if (vA !== null && vB !== null) {
        const [numA, denA] = fracA.replace('frac:', '').split('/').map(Number);
        const [numB, denB] = fracB.replace('frac:', '').split('/').map(Number);
        
        if (numA === numB && denA !== denB) {
          template.misconceptionTraps = ['MC-WHB-02'];
        } else {
          template.misconceptionTraps = ['MC-MAG-01'];
        }
        trapUpdates++;
      }
    } else if (levelId === '08') {
      const v = getFracVal(template.payload.fractionId);
      if (v !== null) {
        // Near 0 or 1
        if (v < 0.3 || v > 0.7) {
          template.misconceptionTraps = ['MC-PRX-01'];
        } else {
          template.misconceptionTraps = ['MC-MAG-01'];
        }
        trapUpdates++;
      }
    } else if (levelId === '09') {
      // Fix expectedOrder and correctAnswer
      const fractions = template.payload.fractionIds.map(f => ({ id: f, val: getFracVal(f) }));
      const expected = fractions.sort((a, b) => 
        template.payload.direction === 'ascending' ? a.val - b.val : b.val - a.val
      ).map(f => f.id);
      
      if (JSON.stringify(expected) !== JSON.stringify(template.payload.expectedOrder)) {
        template.payload.expectedOrder = expected;
        template.correctAnswer = expected;
        bugFixes++;
      }
      
      template.misconceptionTraps = ['MC-MAG-01'];
      trapUpdates++;
    }
  });
});

fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2));
console.log(`Consolidation Complete:`);
console.log(`- Updated ${skillUpdates} skill references.`);
console.log(`- Updated ${trapUpdates} misconception traps.`);
console.log(`- Fixed ${bugFixes} bugs in Level 09.`);
