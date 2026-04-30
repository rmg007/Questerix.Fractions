import { readFileSync, writeFileSync } from 'fs';

const newTemplates = [];

// Easy (0011-0016): 2-item pairs
const easyData = [
  { seq:'0011', prompt:'Match each fraction to the correct picture.', left:[{id:'l0',label:'1/5'},{id:'l1',label:'2/5'}], right:[{id:'r0',label:'1 of 5 parts shaded'},{id:'r1',label:'2 of 5 parts shaded'}], skills:['SK-05','SK-06'], trap:'MC-EOL-01' },
  { seq:'0012', prompt:'Connect each fraction to how many parts are shaded.', left:[{id:'l0',label:'3/5'},{id:'l1',label:'4/5'}], right:[{id:'r0',label:'3 of 5 parts shaded'},{id:'r1',label:'4 of 5 parts shaded'}], skills:['SK-05','SK-07'], trap:'MC-WHB-01' },
  { seq:'0013', prompt:'Draw a line from each fraction to its picture.', left:[{id:'l0',label:'1/3'},{id:'l1',label:'2/3'}], right:[{id:'r0',label:'1 of 3 parts shaded'},{id:'r1',label:'2 of 3 parts shaded'}], skills:['SK-06','SK-07'], trap:'MC-EOL-01' },
  { seq:'0014', prompt:'Match each fraction to the shaded shape.', left:[{id:'l0',label:'1/4'},{id:'l1',label:'3/4'}], right:[{id:'r0',label:'1 of 4 parts shaded'},{id:'r1',label:'3 of 4 parts shaded'}], skills:['SK-05','SK-06'], trap:'MC-WHB-02' },
  { seq:'0015', prompt:'Match each word to its fraction symbol.', left:[{id:'l0',label:'one fifth'},{id:'l1',label:'two fifths'}], right:[{id:'r0',label:'1/5'},{id:'r1',label:'2/5'}], skills:['SK-05','SK-07'], trap:'MC-EOL-01' },
  { seq:'0016', prompt:'Match each fraction name to the correct symbol.', left:[{id:'l0',label:'one third'},{id:'l1',label:'one quarter'}], right:[{id:'r0',label:'1/3'},{id:'r1',label:'1/4'}], skills:['SK-06','SK-07'], trap:'MC-WHB-01' },
];

for (const d of easyData) {
  const pairs = d.left.map((l, i) => ({ left: l.id, right: d.right[i].id }));
  newTemplates.push({
    id: `q:sm:L5:${d.seq}`, archetype: 'snap_match',
    prompt: { text: d.prompt, ttsKey: `tts.sm.l5.${d.seq}` },
    payload: { leftItems: d.left, rightItems: d.right },
    correctAnswer: pairs, validatorId: 'validator.snap_match.allPairs',
    skillIds: d.skills, misconceptionTraps: [d.trap], difficultyTier: 'easy'
  });
}

// Medium (0017-0023): 3-item pairs
const medData = [
  { seq:'0017', prompt:'Match each fraction symbol to the right picture.', left:[{id:'l0',label:'1/5'},{id:'l1',label:'2/5'},{id:'l2',label:'3/5'}], right:[{id:'r0',label:'1 out of 5'},{id:'r1',label:'2 out of 5'},{id:'r2',label:'3 out of 5'}], skills:['SK-05','SK-06'], trap:'MC-WHB-01' },
  { seq:'0018', prompt:'Connect each fraction to its shaded model.', left:[{id:'l0',label:'1/4'},{id:'l1',label:'2/4'},{id:'l2',label:'3/4'}], right:[{id:'r0',label:'1 of 4 shaded'},{id:'r1',label:'2 of 4 shaded'},{id:'r2',label:'3 of 4 shaded'}], skills:['SK-05','SK-07'], trap:'MC-EOL-01' },
  { seq:'0019', prompt:'Match each word to its fraction picture.', left:[{id:'l0',label:'one fifth'},{id:'l1',label:'two fifths'},{id:'l2',label:'three fifths'}], right:[{id:'r0',label:'1/5'},{id:'r1',label:'2/5'},{id:'r2',label:'3/5'}], skills:['SK-06','SK-07'], trap:'MC-WHB-02' },
  { seq:'0020', prompt:'Draw lines from each fraction to how many parts.', left:[{id:'l0',label:'1/3'},{id:'l1',label:'2/3'},{id:'l2',label:'3/3'}], right:[{id:'r0',label:'1 of 3 shaded'},{id:'r1',label:'2 of 3 shaded'},{id:'r2',label:'3 of 3 shaded'}], skills:['SK-05','SK-06'], trap:'MC-EOL-01' },
  { seq:'0021', prompt:'Match each fraction to the number line position.', left:[{id:'l0',label:'1/2'},{id:'l1',label:'1/4'},{id:'l2',label:'1/5'}], right:[{id:'r0',label:'half the bar'},{id:'r1',label:'quarter of the bar'},{id:'r2',label:'fifth of the bar'}], skills:['SK-06','SK-07'], trap:'MC-WHB-01' },
  { seq:'0022', prompt:'Connect each name to its symbol and picture.', left:[{id:'l0',label:'one half'},{id:'l1',label:'one quarter'},{id:'l2',label:'one fifth'}], right:[{id:'r0',label:'1/2'},{id:'r1',label:'1/4'},{id:'r2',label:'1/5'}], skills:['SK-05','SK-07'], trap:'MC-WHB-02' },
  { seq:'0023', prompt:'Match fractions to their shaded rectangles.', left:[{id:'l0',label:'2/5'},{id:'l1',label:'3/5'},{id:'l2',label:'4/5'}], right:[{id:'r0',label:'2 of 5 parts'},{id:'r1',label:'3 of 5 parts'},{id:'r2',label:'4 of 5 parts'}], skills:['SK-05','SK-06'], trap:'MC-EOL-01' },
];

for (const d of medData) {
  const pairs = d.left.map((l, i) => ({ left: l.id, right: d.right[i].id }));
  newTemplates.push({
    id: `q:sm:L5:${d.seq}`, archetype: 'snap_match',
    prompt: { text: d.prompt, ttsKey: `tts.sm.l5.${d.seq}` },
    payload: { leftItems: d.left, rightItems: d.right },
    correctAnswer: pairs, validatorId: 'validator.snap_match.allPairs',
    skillIds: d.skills, misconceptionTraps: [d.trap], difficultyTier: 'medium'
  });
}

// Hard (0024-0030): 3-item cross-denominator
const hardData = [
  { seq:'0024', prompt:'Match each fraction to its picture — watch the denominators!', left:[{id:'l0',label:'2/3'},{id:'l1',label:'2/4'},{id:'l2',label:'2/5'}], right:[{id:'r0',label:'2 of 3 parts shaded'},{id:'r1',label:'2 of 4 parts shaded'},{id:'r2',label:'2 of 5 parts shaded'}], skills:['SK-05','SK-06','SK-07'], trap:'MC-WHB-02' },
  { seq:'0025', prompt:'Connect each fraction to its description.', left:[{id:'l0',label:'3/4'},{id:'l1',label:'3/5'},{id:'l2',label:'3/3'}], right:[{id:'r0',label:'3 of 4 shaded'},{id:'r1',label:'3 of 5 shaded'},{id:'r2',label:'3 of 3 shaded (whole)'}], skills:['SK-05','SK-06'], trap:'MC-WHB-01' },
  { seq:'0026', prompt:'Match these tricky fractions to their pictures.', left:[{id:'l0',label:'two thirds'},{id:'l1',label:'two quarters'},{id:'l2',label:'two fifths'}], right:[{id:'r0',label:'2/3'},{id:'r1',label:'2/4'},{id:'r2',label:'2/5'}], skills:['SK-06','SK-07'], trap:'MC-EOL-01' },
  { seq:'0027', prompt:'Which picture shows each fraction? Match them.', left:[{id:'l0',label:'4/5'},{id:'l1',label:'3/5'},{id:'l2',label:'2/5'}], right:[{id:'r0',label:'4 of 5 parts'},{id:'r1',label:'3 of 5 parts'},{id:'r2',label:'2 of 5 parts'}], skills:['SK-05','SK-07'], trap:'MC-WHB-02' },
  { seq:'0028', prompt:'Match each fraction word to the right shaded shape.', left:[{id:'l0',label:'one third'},{id:'l1',label:'one quarter'},{id:'l2',label:'one fifth'}], right:[{id:'r0',label:'1/3'},{id:'r1',label:'1/4'},{id:'r2',label:'1/5'}], skills:['SK-05','SK-06'], trap:'MC-WHB-01' },
  { seq:'0029', prompt:'Connect each fraction to the number of equal parts.', left:[{id:'l0',label:'1/2'},{id:'l1',label:'2/4'},{id:'l2',label:'3/6'}], right:[{id:'r0',label:'half shaded'},{id:'r1',label:'half shaded (4 parts)'},{id:'r2',label:'half shaded (6 parts)'}], skills:['SK-06','SK-07'], trap:'MC-EOL-01' },
  { seq:'0030', prompt:'Match each fraction — some look similar, so look carefully.', left:[{id:'l0',label:'3/4'},{id:'l1',label:'4/5'},{id:'l2',label:'2/3'}], right:[{id:'r0',label:'3 of 4 shaded'},{id:'r1',label:'4 of 5 shaded'},{id:'r2',label:'2 of 3 shaded'}], skills:['SK-05','SK-06','SK-07'], trap:'MC-WHB-02' },
];

for (const d of hardData) {
  const pairs = d.left.map((l, i) => ({ left: l.id, right: d.right[i].id }));
  newTemplates.push({
    id: `q:sm:L5:${d.seq}`, archetype: 'snap_match',
    prompt: { text: d.prompt, ttsKey: `tts.sm.l5.${d.seq}` },
    payload: { leftItems: d.left, rightItems: d.right },
    correctAnswer: pairs, validatorId: 'validator.snap_match.allPairs',
    skillIds: d.skills, misconceptionTraps: [d.trap], difficultyTier: 'hard'
  });
}

console.log('Generated', newTemplates.length, 'new L5 templates');

// Update bundle.json
const bundle = JSON.parse(readFileSync('src/curriculum/bundle.json', 'utf8'));
bundle.levels['05'] = [...bundle.levels['05'], ...newTemplates];
writeFileSync('src/curriculum/bundle.json', JSON.stringify(bundle), 'utf8');
console.log('bundle.json L05 now:', bundle.levels['05'].length);

// Update v1.json
const v1 = JSON.parse(readFileSync('public/curriculum/v1.json', 'utf8'));
v1.levels['05'] = [...v1.levels['05'], ...newTemplates];
writeFileSync('public/curriculum/v1.json', JSON.stringify(v1), 'utf8');
console.log('v1.json L05 now:', v1.levels['05'].length);
