# Verification Result — shared-kernel — iter 1

## Verdict: failed

## Phase Results

| # | Phase | Status | Duration | Exit Code |
|---|-------|--------|----------|-----------|
| 1 | typecheck | passed | 0.8s | 0 |
| 2 | test | passed | 0.7s | 0 |
| 3 | lint | failed | 3.8s | 1 |
| 4 | build | skipped | — | — |

## Phase: typecheck

```
Scope: 2 of 3 workspace projects
apps/web check-types$ tsc --noEmit
packages/shared check-types$ tsc --noEmit
packages/shared check-types: Done
apps/web check-types: Done

```

## Phase: test

```
Scope: 2 of 3 workspace projects
packages/shared test$ vitest run
packages/shared test:  RUN  v2.1.9 packages/shared
packages/shared test:  ✓ src/money.test.ts (16 tests) 3ms
packages/shared test:  ✓ src/duration.test.ts (12 tests) 3ms
packages/shared test:  ✓ src/id.test.ts (9 tests) 3ms
packages/shared test:  ✓ src/time-range.test.ts (18 tests) 3ms
packages/shared test:  Test Files  4 passed (4)
packages/shared test:       Tests  55 passed (55)
packages/shared test:    Start at  19:44:55
packages/shared test:    Duration  309ms (transform 80ms, setup 0ms, collect 104ms, tests 13ms, environment 0ms, prepare 243ms)
packages/shared test: Done

```

## Phase: lint

Step 'lint' failed

```
Scope: 2 of 3 workspace projects
apps/web lint$ next lint
packages/shared lint$ eslint .
packages/shared lint: Done
apps/web lint: `next lint` is deprecated and will be removed in Next.js 16.
apps/web lint: For new projects, use create-next-app to choose your preferred linter.
apps/web lint: For existing projects, migrate to the ESLint CLI:
apps/web lint: npx @next/codemod@canary next-lint-to-eslint-cli .
apps/web lint:  ⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
apps/web lint:  We detected multiple lockfiles and selected the directory of ~/Documents/GitHub/koma/pnpm-lock.yaml as the root directory.
apps/web lint:  To silence this warning, set `outputFileTracingRoot` in your Next.js config, or consider removing one of the lockfiles if it's not needed.
apps/web lint:    See https://nextjs.org/docs/app/api-reference/config/next-config-js/output#caveats for more information.
apps/web lint:  Detected additional lockfiles: 
apps/web lint:    * pnpm-lock.yaml
apps/web lint: ? How would you like to configure ESLint? https://nextjs.org/docs/app/api-reference/config/eslint
apps/web lint: [?25l❯  Strict (recommended)
apps/web lint:    Base
apps/web lint:  ⚠ If you set up ESLint yourself, we recommend adding the Next.js ESLint plugin. See https://nextjs.org/docs/app/api-reference/config/eslint#migrating-existing-config
apps/web lint:    Cancel
apps/web lint: Failed
apps/web:
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @koma/web@ lint: `next lint`
Exit status 1

```

## Phase: build

_(skipped — previous command failed)_
