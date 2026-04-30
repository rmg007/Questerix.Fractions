---
description: Grep for localStorage usage outside documented C5 exceptions — catches constraint drift
---

Run these two checks and report any surprises:

```bash
# 1. All localStorage.setItem calls in src/
grep -rn "localStorage\.setItem" src/ --include="*.ts"

# 2. All localStorage.getItem calls
grep -rn "localStorage\.getItem" src/ --include="*.ts"
```

**Permitted patterns (C5 exceptions):**
- `lastUsedStudentId` key — in `src/persistence/lastUsedStudent.ts` and `src/scenes/BootScene.ts`
- `unlockedLevels:<studentId>` and `completedLevels:<studentId>` — in `src/scenes/MenuScene.ts` and `src/scenes/LevelMapScene.ts` (known deviation, pending Dexie migration)
- `LOG` key — in `src/lib/log.ts` (debug logging filter, no PII)

**Flag any call that:**
- Uses a key not in the permitted list above
- Stores PII, progress data, or any student-identifiable information under a new key
- Appears in a file not in the permitted file list

Output: green (no surprises) or a list of new violations with file:line.
