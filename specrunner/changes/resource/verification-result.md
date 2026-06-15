# Verification Result — resource — iter 1

## Verdict: passed

## Phase Results

| # | Phase | Status | Duration | Exit Code |
|---|-------|--------|----------|-----------|
| 1 | typecheck | passed | 1.4s | 0 |
| 2 | test | passed | 1.3s | 0 |
| 3 | lint | passed | 5.8s | 0 |
| 4 | build | passed | 9.1s | 0 |

## Phase: typecheck

```
Scope: 4 of 5 workspace projects
apps/web check-types$ tsc --noEmit
packages/shared check-types$ tsc --noEmit
packages/shared check-types: Done
apps/web check-types: Done
packages/crm check-types$ tsc --noEmit
packages/resource check-types$ tsc --noEmit
packages/crm check-types: Done
packages/resource check-types: Done

```

## Phase: test

```
Scope: 4 of 5 workspace projects
packages/shared test$ vitest run
packages/shared test:  RUN  v2.1.9 packages/shared
packages/shared test:  ✓ src/event.test.ts (6 tests) 2ms
packages/shared test:  ✓ src/duration.test.ts (12 tests) 4ms
packages/shared test:  ✓ src/in-memory-event-bus.test.ts (10 tests) 5ms
packages/shared test:  ✓ src/time-range.test.ts (18 tests) 3ms
packages/shared test:  ✓ src/money.test.ts (16 tests) 3ms
packages/shared test:  ✓ src/id.test.ts (9 tests) 4ms
packages/shared test:  Test Files  6 passed (6)
packages/shared test:       Tests  71 passed (71)
packages/shared test:    Start at  22:43:13
packages/shared test:    Duration  260ms (transform 124ms, setup 0ms, collect 185ms, tests 20ms, environment 2ms, prepare 337ms)
packages/shared test: Done
packages/crm test$ vitest run
packages/resource test$ vitest run
packages/crm test:  RUN  v2.1.9 packages/crm
packages/resource test:  RUN  v2.1.9 packages/resource
packages/crm test:  ✓ src/contact-info.test.ts (7 tests) 2ms
packages/resource test:  ✓ src/in-memory-resource-repository.test.ts (6 tests) 3ms
packages/resource test:  ✓ src/resource.test.ts (11 tests) 3ms
packages/resource test:  Test Files  2 passed (2)
packages/resource test:       Tests  17 passed (17)
packages/resource test:    Start at  22:43:14
packages/resource test:    Duration  415ms (transform 61ms, setup 0ms, collect 99ms, tests 6ms, environment 1ms, prepare 122ms)
packages/crm test:  ✓ src/in-memory-customer-repository.test.ts (6 tests) 3ms
packages/crm test:  ✓ src/customer.test.ts (13 tests) 4ms
packages/resource test: Done
packages/crm test:  Test Files  3 passed (3)
packages/crm test:       Tests  26 passed (26)
packages/crm test:    Start at  22:43:14
packages/crm test:    Duration  434ms (transform 79ms, setup 0ms, collect 145ms, tests 9ms, environment 0ms, prepare 278ms)
packages/crm test: Done

```

## Phase: lint

```
Scope: 4 of 5 workspace projects
apps/web lint$ next lint
packages/shared lint$ eslint .
apps/web lint: `next lint` is deprecated and will be removed in Next.js 16.
apps/web lint: For new projects, use create-next-app to choose your preferred linter.
apps/web lint: For existing projects, migrate to the ESLint CLI:
apps/web lint: npx @next/codemod@canary next-lint-to-eslint-cli .
packages/shared lint: Done
apps/web lint:  ⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
apps/web lint:  We detected multiple lockfiles and selected the directory of ~/Documents/GitHub/koma/pnpm-lock.yaml as the root directory.
apps/web lint:  To silence this warning, set `outputFileTracingRoot` in your Next.js config, or consider removing one of the lockfiles if it's not needed.
apps/web lint:    See https://nextjs.org/docs/app/api-reference/config/next-config-js/output#caveats for more information.
apps/web lint:  Detected additional lockfiles: 
apps/web lint:    * pnpm-lock.yaml
apps/web lint: ✔ No ESLint warnings or errors
apps/web lint: Done
packages/resource lint$ eslint .
packages/crm lint$ eslint .
packages/resource lint: Done
packages/crm lint: Done

```

## Phase: build

```
Scope: 4 of 5 workspace projects
apps/web build$ next build
apps/web build:  ⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
apps/web build:  We detected multiple lockfiles and selected the directory of ~/Documents/GitHub/koma/pnpm-lock.yaml as the root directory.
apps/web build:  To silence this warning, set `outputFileTracingRoot` in your Next.js config, or consider removing one of the lockfiles if it's not needed.
apps/web build:    See https://nextjs.org/docs/app/api-reference/config/next-config-js/output#caveats for more information.
apps/web build:  Detected additional lockfiles: 
apps/web build:    * pnpm-lock.yaml
apps/web build:    ▲ Next.js 15.5.19
apps/web build:    Creating an optimized production build ...
apps/web build:  ✓ Compiled successfully in 1873ms
apps/web build:    Linting and checking validity of types ...
apps/web build:    Collecting page data ...
apps/web build:    Generating static pages (0/4) ...
apps/web build:    Generating static pages (1/4) 
apps/web build:    Generating static pages (2/4) 
apps/web build:    Generating static pages (3/4) 
apps/web build:  ✓ Generating static pages (4/4)
apps/web build:    Finalizing page optimization ...
apps/web build:    Collecting build traces ...
apps/web build: Route (app)                                 Size  First Load JS
apps/web build: ┌ ○ /                                      127 B         103 kB
apps/web build: └ ○ /_not-found                            993 B         103 kB
apps/web build: + First Load JS shared by all             102 kB
apps/web build:   ├ chunks/285-933c438dfbb98efd.js       46.4 kB
apps/web build:   ├ chunks/f5184d75-27b7240eb4153f0c.js  54.2 kB
apps/web build:   └ other shared chunks (total)          1.88 kB
apps/web build: ○  (Static)  prerendered as static content
apps/web build: Done

```
