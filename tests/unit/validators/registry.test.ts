import { describe, it, expect } from 'vitest';
import { validatorRegistry, getValidator } from '@/validators/registry';
import { ARCHETYPES } from '@/types';

describe('validatorRegistry', () => {
  it('has at least one validator per archetype', () => {
    for (const archetype of ARCHETYPES) {
      const found = [...validatorRegistry.values()].some((v) => v.archetype === archetype);
      expect(found, `archetype '${archetype}' has no registered validator`).toBe(true);
    }
  });

  it('registers all expected validator IDs', () => {
    const expectedIds = [
      'validator.partition.equalAreas',
      'validator.partition.equalCount',
      'validator.identify.exactIndex',
      'validator.label.matchTarget',
      'validator.make.foldAndShade',
      'validator.make.halvingByLine',
      'validator.compare.relation',
      'validator.benchmark.sortToZone',
      'validator.order.sequence',
      'validator.snap_match.allPairs',
      'validator.equal_or_not.areaTolerance',
      'validator.placement.snapTolerance',
      'validator.placement.snap8',
      'validator.explain_your_order.sequence',
    ];
    for (const id of expectedIds) {
      expect(validatorRegistry.has(id), `missing: ${id}`).toBe(true);
    }
  });

  it('getValidator returns correct registration', () => {
    const reg = getValidator('validator.partition.equalAreas');
    expect(reg).toBeDefined();
    expect(reg?.archetype).toBe('partition');
    expect(reg?.variant).toBe('equalAreas');
  });

  it('getValidator returns undefined for unknown id', () => {
    expect(getValidator('validator.unknown.foo')).toBeUndefined();
  });

  it('all IDs follow validator.<archetype>.<variant> pattern', () => {
    for (const [id] of validatorRegistry) {
      expect(id).toMatch(/^validator\.[a-z_]+\.[a-zA-Z0-9]+$/);
    }
  });
});
