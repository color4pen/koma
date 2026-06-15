# Verification Result — shared-kernel — iter 1

## Verdict: passed

## Phase Results

| # | Phase | Status | Duration | Exit Code |
|---|-------|--------|----------|-----------|
| 1 | typecheck | passed | 0.9s | 0 |
| 2 | test | passed | 0.8s | 0 |
| 3 | lint | passed | 1.2s | 0 |
| 4 | build | passed | 9.0s | 0 |

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
packages/shared test:  ✓ src/time-range.test.ts (18 tests) 4ms
packages/shared test:  ✓ src/duration.test.ts (12 tests) 3ms
packages/shared test:  ✓ src/money.test.ts (16 tests) 4ms
packages/shared test:  ✓ src/id.test.ts (9 tests) 3ms
packages/shared test:  Test Files  4 passed (4)
packages/shared test:       Tests  55 passed (55)
packages/shared test:    Start at  19:49:45
packages/shared test:    Duration  284ms (transform 74ms, setup 0ms, collect 113ms, tests 13ms, environment 0ms, prepare 253ms)
packages/shared test: Done

```

## Phase: lint

```
Scope: 2 of 3 workspace projects
apps/web lint$ next lint
packages/shared lint$ eslint .
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
packages/shared lint: Done
apps/web lint:  ⚠ The Next.js plugin was not detected in your ESLint configuration. See https://nextjs.org/docs/app/api-reference/config/eslint#migrating-existing-config
apps/web lint: ✔ No ESLint warnings or errors
apps/web lint: Done

```

## Phase: build

```
Scope: 2 of 3 workspace projects
apps/web build$ next build
apps/web build:  ⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
apps/web build:  We detected multiple lockfiles and selected the directory of ~/Documents/GitHub/koma/pnpm-lock.yaml as the root directory.
apps/web build:  To silence this warning, set `outputFileTracingRoot` in your Next.js config, or consider removing one of the lockfiles if it's not needed.
apps/web build:    See https://nextjs.org/docs/app/api-reference/config/next-config-js/output#caveats for more information.
apps/web build:  Detected additional lockfiles: 
apps/web build:    * pnpm-lock.yaml
apps/web build:    ▲ Next.js 15.5.19
apps/web build:    Creating an optimized production build ...
apps/web build:  ✓ Compiled successfully in 1861ms
apps/web build:    Linting and checking validity of types ...
apps/web build:  ⚠ The Next.js plugin was not detected in your ESLint configuration. See https://nextjs.org/docs/app/api-reference/config/eslint#migrating-existing-config
apps/web build:    Collecting page data ...
apps/web build:    Generating static pages (0/4) ...
apps/web build:    Generating static pages (1/4) 
apps/web build:    Generating static pages (2/4) 
apps/web build:    Generating static pages (3/4) 
apps/web build:  ✓ Generating static pages (4/4)
apps/web build:    Finalizing page optimization ...
apps/web build:    Collecting build traces ...
apps/web build: Route (app)                                 Size  First Load JS
apps/web build: ┌ ○ /                                      127 B         102 kB
apps/web build: └ ○ /_not-found                            990 B         103 kB
apps/web build: + First Load JS shared by all             102 kB
apps/web build:   ├ chunks/4557610a-fefa5be19e77ed4a.js  54.2 kB
apps/web build:   ├ chunks/785-778584e14f2dca51.js       45.8 kB
apps/web build:   └ other shared chunks (total)          1.88 kB
apps/web build: ○  (Static)  prerendered as static content
apps/web build: Done

```
