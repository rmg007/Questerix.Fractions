# validators/ — Pure Answer Validators

One file per archetype. Each exports a default array of `ValidatorRegistration` objects, all aggregated by `registry.ts` into `validatorRegistry: Map<id, registration>`.

## Contract

```ts
export const fooExact: ValidatorRegistration<FooInput, FooExpected> = {
  id: 'validator.foo.exact',          // matches QuestionTemplate.validatorId
  archetype: 'foo',
  variant: 'exact',
  fn(input, expected): ValidatorResult {
    if (correct) return { outcome: 'correct', score: 1 };
    return {
      outcome: 'incorrect',
      score: 0,
      ...(detectedMC ? { detectedMisconception: detectedMC } : {}),
    };
  },
};

export default [fooExact];
```

## Rules

- **Pure functions.** No imports from `phaser`, no DOM, no IndexedDB, no `Math.random`, no `Date.now`. Same input → same output, always.
- **Naming:** `validator.<archetype>.<variant>` — used as the foreign key from `QuestionTemplate.validatorId`. Don't drift from this scheme.
- **`exactOptionalPropertyTypes`** is on. Spread `{ detectedMisconception: ... }` conditionally rather than passing `undefined`.
- **Misconception flags** are strings matching IDs in `docs/10-curriculum/misconceptions.md` (e.g. `'MC-WHB-02'`).
- **Property-based tests** are expected for non-trivial validators — see `tests/` for fast-check examples.

## Adding a new validator

1. Add typed `Input`/`Expected` interfaces.
2. Implement the registration object.
3. Export it in the file's default array.
4. Import the array into `registry.ts` and spread it into `allValidators`.
5. Add unit + property tests under the same archetype's test file.

## Parity

The pipeline (`pipeline/`) ships a Python clone of each validator. The parity test fixtures under `pipeline/fixtures/parity/` must pass against both. If you change behavior here, update the Python side too.
