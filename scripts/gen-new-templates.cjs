const fs = require('fs');

// ===== LEVEL 6: compare, same-denominator focus =====
const l6New = [
  { id:'q:cmp:L6:1001', tier:'easy', text:'Which fraction is bigger?', fA:'frac:1/4', fB:'frac:3/4', same:true, ans:'B', sk:['SK-18'], mc:['MC-WHB-01'] },
  { id:'q:cmp:L6:1002', tier:'easy', text:'Tap the fraction that shows more.', fA:'frac:2/4', fB:'frac:1/4', same:true, ans:'A', sk:['SK-19'], mc:['MC-WHB-01'] },
  { id:'q:cmp:L6:1003', tier:'easy', text:'Pick the larger fraction.', fA:'frac:1/3', fB:'frac:2/3', same:true, ans:'B', sk:['SK-20'], mc:['MC-WHB-01'] },
  { id:'q:cmp:L6:1004', tier:'easy', text:'Which fraction shows more of the whole?', fA:'frac:3/8', fB:'frac:5/8', same:true, ans:'B', sk:['SK-21'], mc:['MC-WHB-01'] },
  { id:'q:cmp:L6:1005', tier:'medium', text:'Choose the fraction that is greater.', fA:'frac:5/8', fB:'frac:3/8', same:true, ans:'A', sk:['SK-18'], mc:['MC-WHB-01'] },
  { id:'q:cmp:L6:1006', tier:'medium', text:'Which of these two fractions is bigger?', fA:'frac:4/6', fB:'frac:5/6', same:true, ans:'B', sk:['SK-19'], mc:['MC-WHB-01'] },
  { id:'q:cmp:L6:1007', tier:'medium', text:'Tap the bigger fraction.', fA:'frac:7/8', fB:'frac:6/8', same:true, ans:'A', sk:['SK-20'], mc:['MC-WHB-01'] },
  { id:'q:cmp:L6:1008', tier:'medium', text:'Find the fraction with the larger value.', fA:'frac:2/8', fB:'frac:5/8', same:true, ans:'B', sk:['SK-21'], mc:['MC-WHB-01'] },
  { id:'q:cmp:L6:1009', tier:'hard', text:'Which fraction is bigger?', fA:'frac:3/8', fB:'frac:1/2', same:false, ans:'B', sk:['SK-18'], mc:['MC-WHB-01'] },
  { id:'q:cmp:L6:1010', tier:'hard', text:'Pick the larger fraction.', fA:'frac:2/3', fB:'frac:3/6', same:false, ans:'A', sk:['SK-19'], mc:['MC-WHB-01','MC-EOL-01'] },
  { id:'q:cmp:L6:1011', tier:'hard', text:'Choose the fraction that is greater.', fA:'frac:1/2', fB:'frac:2/6', same:false, ans:'A', sk:['SK-20'], mc:['MC-WHB-01'] },
  { id:'q:cmp:L6:1012', tier:'hard', text:'Tap the fraction that shows more.', fA:'frac:4/8', fB:'frac:3/4', same:false, ans:'B', sk:['SK-21'], mc:['MC-WHB-01','MC-EOL-01'] },
];

const l6Templates = l6New.map(t => ({
  id: t.id,
  archetype: 'compare',
  prompt: { text: t.text, ttsKey: 'tts.cmp.l6.' + t.id.split(':')[3] },
  payload: { fractionA: t.fA, fractionB: t.fB, sameDenominator: t.same },
  correctAnswer: t.ans,
  validatorId: 'validator.compare.greaterThan',
  skillIds: t.sk,
  misconceptionTraps: t.mc,
  difficultyTier: t.tier,
}));

// ===== LEVEL 7: compare, cross-denominator =====
const l7New = [
  { id:'q:cmp:L7:1001', tier:'easy', text:'Which fraction is bigger?', fA:'frac:1/3', fB:'frac:1/6', same:false, ans:'A', sk:['SK-22'], mc:['MC-WHB-02'] },
  { id:'q:cmp:L7:1002', tier:'easy', text:'Tap the larger fraction.', fA:'frac:1/8', fB:'frac:1/2', same:false, ans:'B', sk:['SK-23'], mc:['MC-WHB-02'] },
  { id:'q:cmp:L7:1003', tier:'easy', text:'Pick the fraction that shows more.', fA:'frac:1/4', fB:'frac:1/8', same:false, ans:'A', sk:['SK-22'], mc:['MC-WHB-02'] },
  { id:'q:cmp:L7:1004', tier:'easy', text:'Which fraction shows more of the whole?', fA:'frac:1/6', fB:'frac:1/3', same:false, ans:'B', sk:['SK-23'], mc:['MC-WHB-02'] },
  { id:'q:cmp:L7:1005', tier:'medium', text:'Choose the greater fraction.', fA:'frac:2/3', fB:'frac:3/8', same:false, ans:'A', sk:['SK-22'], mc:['MC-WHB-01'] },
  { id:'q:cmp:L7:1006', tier:'medium', text:'Which fraction is bigger?', fA:'frac:3/8', fB:'frac:2/4', same:false, ans:'B', sk:['SK-23'], mc:['MC-WHB-01'] },
  { id:'q:cmp:L7:1007', tier:'medium', text:'Tap the fraction with the larger value.', fA:'frac:5/6', fB:'frac:3/4', same:false, ans:'A', sk:['SK-22'], mc:['MC-WHB-01','MC-EOL-01'] },
  { id:'q:cmp:L7:1008', tier:'medium', text:'Find the bigger fraction.', fA:'frac:2/8', fB:'frac:1/3', same:false, ans:'B', sk:['SK-23'], mc:['MC-WHB-02'] },
  { id:'q:cmp:L7:1009', tier:'hard', text:'Which fraction is bigger?', fA:'frac:5/8', fB:'frac:2/3', same:false, ans:'B', sk:['SK-22'], mc:['MC-WHB-01','MC-WHB-02'] },
  { id:'q:cmp:L7:1010', tier:'hard', text:'Pick the larger fraction.', fA:'frac:3/4', fB:'frac:5/8', same:false, ans:'A', sk:['SK-23'], mc:['MC-WHB-01'] },
  { id:'q:cmp:L7:1011', tier:'hard', text:'Choose the fraction that is greater.', fA:'frac:7/8', fB:'frac:5/6', same:false, ans:'A', sk:['SK-22'], mc:['MC-WHB-01','MC-WHB-02'] },
  { id:'q:cmp:L7:1012', tier:'hard', text:'Tap the bigger of these two.', fA:'frac:4/6', fB:'frac:5/8', same:false, ans:'A', sk:['SK-23'], mc:['MC-WHB-01'] },
];

const l7Templates = l7New.map(t => ({
  id: t.id,
  archetype: 'compare',
  prompt: { text: t.text, ttsKey: 'tts.cmp.l7.' + t.id.split(':')[3] },
  payload: { fractionA: t.fA, fractionB: t.fB, sameDenominator: t.same },
  correctAnswer: t.ans,
  validatorId: 'validator.compare.greaterThan',
  skillIds: t.sk,
  misconceptionTraps: t.mc,
  difficultyTier: t.tier,
}));

// ===== LEVEL 8: benchmark =====
const l8Specs = [
  { id:'q:bmk:L8:1001', tier:'easy', frac:'frac:1/6', dec:0.167, ans:'zero', text:'Is this fraction closest to 0, one half, or 1?', sk:['SK-25','SK-26'], mc:['MC-WHB-01'] },
  { id:'q:bmk:L8:1002', tier:'easy', frac:'frac:4/8', dec:0.5, ans:'half', text:'Where does frac:4/8 sit — near zero, near one half, or near one?', sk:['SK-27','SK-28'], mc:['MC-EOL-01'] },
  { id:'q:bmk:L8:1003', tier:'easy', frac:'frac:5/6', dec:0.833, ans:'one', text:'Pick the closest landmark for frac:5/6.', sk:['SK-25','SK-26'], mc:['MC-PRX-01'] },
  { id:'q:bmk:L8:1004', tier:'easy', frac:'frac:1/8', dec:0.125, ans:'zero', text:'Is this fraction closest to 0, one half, or 1?', sk:['SK-27','SK-28'], mc:['MC-WHB-01'] },
  { id:'q:bmk:L8:1005', tier:'medium', frac:'frac:3/8', dec:0.375, ans:'half', text:'Where does frac:3/8 sit — near zero, near one half, or near one?', sk:['SK-25','SK-26'], mc:['MC-WHB-01'] },
  { id:'q:bmk:L8:1006', tier:'medium', frac:'frac:5/8', dec:0.625, ans:'half', text:'Is this fraction closest to 0, one half, or 1?', sk:['SK-27','SK-28'], mc:['MC-PRX-01'] },
  { id:'q:bmk:L8:1007', tier:'medium', frac:'frac:6/8', dec:0.75, ans:'one', text:'Pick the closest landmark for frac:6/8.', sk:['SK-25','SK-26'], mc:['MC-PRX-01'] },
  { id:'q:bmk:L8:1008', tier:'medium', frac:'frac:2/6', dec:0.333, ans:'zero', text:'Where does frac:2/6 sit — near zero, near one half, or near one?', sk:['SK-27','SK-28'], mc:['MC-WHB-01'] },
  { id:'q:bmk:L8:1009', tier:'hard', frac:'frac:3/6', dec:0.5, ans:'half', text:'Is this fraction closest to 0, one half, or 1?', sk:['SK-25','SK-26'], mc:['MC-WHB-01','MC-EOL-01'] },
  { id:'q:bmk:L8:1010', tier:'hard', frac:'frac:4/6', dec:0.667, ans:'one', text:'Pick the closest landmark for frac:4/6.', sk:['SK-27','SK-28'], mc:['MC-PRX-01'] },
  { id:'q:bmk:L8:1011', tier:'hard', frac:'frac:7/8', dec:0.875, ans:'one', text:'Where does frac:7/8 sit — near zero, near one half, or near one?', sk:['SK-25','SK-26'], mc:['MC-PRX-01','MC-MAG-01'] },
  { id:'q:bmk:L8:1012', tier:'hard', frac:'frac:2/8', dec:0.25, ans:'zero', text:'Is this fraction closest to 0, one half, or 1?', sk:['SK-27','SK-28'], mc:['MC-WHB-01','MC-MAG-01'] },
];

const l8Templates = l8Specs.map(t => ({
  id: t.id,
  archetype: 'benchmark',
  prompt: { text: t.text, ttsKey: 'tts.bmk.l8.' + t.id.split(':')[3] },
  payload: { fractionId: t.frac, benchmarks: ['zero','half','one'], decimalValue: t.dec },
  correctAnswer: t.ans,
  validatorId: 'validator.benchmark.closestBenchmark',
  skillIds: t.sk,
  misconceptionTraps: t.mc,
  difficultyTier: t.tier,
}));

// ===== LEVEL 9: order =====
const l9Specs = [
  { id:'q:ord:L9:1001', tier:'easy', dir:'ascending', text:'Sort these fractions from least to greatest.', fracs:['frac:1/4','frac:1/3','frac:1/2'], order:['frac:1/4','frac:1/3','frac:1/2'], sk:['SK-29','SK-30'], mc:['MC-WHB-02'] },
  { id:'q:ord:L9:1002', tier:'easy', dir:'descending', text:'Arrange these fractions from biggest to smallest.', fracs:['frac:3/4','frac:1/2','frac:1/4'], order:['frac:3/4','frac:1/2','frac:1/4'], sk:['SK-30','SK-33'], mc:['MC-WHB-01'] },
  { id:'q:ord:L9:1003', tier:'easy', dir:'ascending', text:'Put these fractions in order from smallest to biggest.', fracs:['frac:1/8','frac:3/8','frac:7/8'], order:['frac:1/8','frac:3/8','frac:7/8'], sk:['SK-29','SK-31'], mc:['MC-WHB-01'] },
  { id:'q:ord:L9:1004', tier:'easy', dir:'descending', text:'Sort these fractions from biggest to smallest.', fracs:['frac:5/6','frac:2/3','frac:1/6'], order:['frac:5/6','frac:2/3','frac:1/6'], sk:['SK-30','SK-32'], mc:['MC-EOL-01'] },
  { id:'q:ord:L9:1005', tier:'medium', dir:'ascending', text:'Sort these fractions from least to greatest.', fracs:['frac:1/6','frac:1/4','frac:1/3','frac:1/2'], order:['frac:1/6','frac:1/4','frac:1/3','frac:1/2'], sk:['SK-29','SK-30'], mc:['MC-WHB-02'] },
  { id:'q:ord:L9:1006', tier:'medium', dir:'descending', text:'Arrange these fractions from biggest to smallest.', fracs:['frac:7/8','frac:3/4','frac:2/3','frac:1/2'], order:['frac:7/8','frac:3/4','frac:2/3','frac:1/2'], sk:['SK-31','SK-33'], mc:['MC-WHB-01'] },
  { id:'q:ord:L9:1007', tier:'medium', dir:'ascending', text:'Put these fractions in order from smallest to biggest.', fracs:['frac:1/8','frac:1/4','frac:3/8','frac:3/4'], order:['frac:1/8','frac:1/4','frac:3/8','frac:3/4'], sk:['SK-30','SK-32'], mc:['MC-WHB-01'] },
  { id:'q:ord:L9:1008', tier:'medium', dir:'descending', text:'Sort these fractions from biggest to smallest.', fracs:['frac:5/6','frac:5/8','frac:1/3','frac:1/8'], order:['frac:5/6','frac:5/8','frac:1/3','frac:1/8'], sk:['SK-31','SK-33'], mc:['MC-EOL-01'] },
  { id:'q:ord:L9:1009', tier:'hard', dir:'ascending', text:'Sort these fractions from least to greatest.', fracs:['frac:3/8','frac:2/6','frac:1/3','frac:1/2'], order:['frac:2/6','frac:1/3','frac:3/8','frac:1/2'], sk:['SK-29','SK-30'], mc:['MC-WHB-01','MC-MAG-01'] },
  { id:'q:ord:L9:1010', tier:'hard', dir:'descending', text:'Arrange these fractions from biggest to smallest.', fracs:['frac:7/8','frac:5/6','frac:3/4','frac:2/3'], order:['frac:7/8','frac:5/6','frac:3/4','frac:2/3'], sk:['SK-31','SK-33'], mc:['MC-WHB-01','MC-MAG-01'] },
  { id:'q:ord:L9:1011', tier:'hard', dir:'ascending', text:'Put these fractions in order from smallest to biggest.', fracs:['frac:1/6','frac:2/8','frac:3/8','frac:5/6'], order:['frac:1/6','frac:2/8','frac:3/8','frac:5/6'], sk:['SK-30','SK-32'], mc:['MC-WHB-02','MC-MAG-01'] },
  { id:'q:ord:L9:1012', tier:'hard', dir:'descending', text:'Sort these fractions from biggest to smallest.', fracs:['frac:5/8','frac:4/6','frac:3/4','frac:7/8'], order:['frac:7/8','frac:3/4','frac:4/6','frac:5/8'], sk:['SK-31','SK-33'], mc:['MC-WHB-01','MC-MAG-01'] },
];

const l9Templates = l9Specs.map(t => ({
  id: t.id,
  archetype: 'order',
  prompt: { text: t.text, ttsKey: 'tts.ord.l9.' + t.id.split(':')[3] },
  payload: { fractionIds: t.fracs, direction: t.dir, expectedOrder: t.order },
  correctAnswer: t.order,
  validatorId: 'validator.order.sequence',
  skillIds: t.sk,
  misconceptionTraps: t.mc,
  difficultyTier: t.tier,
}));

// Append to existing all.json files
function appendTemplates(levelFile, newTemplates) {
  const existing = JSON.parse(fs.readFileSync(levelFile, 'utf8'));
  const merged = existing.concat(newTemplates);
  fs.writeFileSync(levelFile, JSON.stringify(merged, null, 2));
  console.log(levelFile + ': ' + existing.length + ' -> ' + merged.length + ' (+' + newTemplates.length + ')');
}

appendTemplates('pipeline/output/level_06/all.json', l6Templates);
appendTemplates('pipeline/output/level_07/all.json', l7Templates);
appendTemplates('pipeline/output/level_08/all.json', l8Templates);
appendTemplates('pipeline/output/level_09/all.json', l9Templates);
console.log('Done. All 48 new templates appended.');
