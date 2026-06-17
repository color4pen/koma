# Verification Result — db-customer — iter 1

## Verdict: passed

## Phase Results

| # | Phase | Status | Duration | Exit Code |
|---|-------|--------|----------|-----------|
| 1 | typecheck | passed | 2.8s | 0 |
| 2 | test | passed | 5.6s | 0 |
| 3 | lint | passed | 6.3s | 0 |
| 4 | build | passed | 9.5s | 0 |

## Phase: typecheck

```
Scope: 7 of 8 workspace projects
apps/web check-types$ tsc --noEmit
packages/shared check-types$ tsc --noEmit
packages/shared check-types: Done
apps/web check-types: Done
packages/resource check-types$ tsc --noEmit
packages/crm check-types$ tsc --noEmit
packages/catalog check-types$ tsc --noEmit
packages/scheduling check-types$ tsc --noEmit
packages/crm check-types: Done
packages/catalog check-types: Done
packages/resource check-types: Done
packages/scheduling check-types: Done
packages/db check-types$ tsc --noEmit
packages/db check-types: Done

```

## Phase: test

```
Scope: 7 of 8 workspace projects
packages/shared test$ vitest run
packages/shared test:  RUN  v2.1.9 packages/shared
packages/shared test:  ✓ src/event.test.ts (6 tests) 3ms
packages/shared test:  ✓ src/in-memory-event-bus.test.ts (10 tests) 5ms
packages/shared test:  ✓ src/id.test.ts (9 tests) 3ms
packages/shared test:  ✓ src/money.test.ts (16 tests) 3ms
packages/shared test:  ✓ src/time-range.test.ts (18 tests) 3ms
packages/shared test:  ✓ src/duration.test.ts (12 tests) 5ms
packages/shared test:  Test Files  6 passed (6)
packages/shared test:       Tests  71 passed (71)
packages/shared test:    Start at  22:37:00
packages/shared test:    Duration  273ms (transform 109ms, setup 0ms, collect 183ms, tests 23ms, environment 1ms, prepare 346ms)
packages/shared test: Done
packages/crm test$ vitest run
packages/resource test$ vitest run
packages/scheduling test$ vitest run
packages/catalog test$ vitest run
packages/resource test:  RUN  v2.1.9 packages/resource
packages/catalog test:  RUN  v2.1.9 packages/catalog
packages/scheduling test:  RUN  v2.1.9 packages/scheduling
packages/crm test:  RUN  v2.1.9 packages/crm
packages/resource test:  ✓ src/in-memory-resource-repository.test.ts (6 tests) 5ms
packages/resource test:  ✓ src/resource.test.ts (11 tests) 6ms
packages/resource test:  ✓ src/availability.test.ts (23 tests) 16ms
packages/resource test:  ✓ src/daily-time-range.test.ts (17 tests) 21ms
packages/catalog test:  ✓ src/in-memory-service-repository.test.ts (6 tests) 4ms
packages/crm test:  ✓ src/customer.test.ts (13 tests) 6ms
packages/crm test:  ✓ src/in-memory-customer-repository.test.ts (6 tests) 4ms
packages/scheduling test:  ✓ src/booking-status.test.ts (12 tests) 7ms
packages/resource test:  Test Files  4 passed (4)
packages/resource test:       Tests  57 passed (57)
packages/resource test:    Start at  22:37:00
packages/resource test:    Duration  1.02s (transform 216ms, setup 0ms, collect 434ms, tests 47ms, environment 32ms, prepare 832ms)
packages/catalog test:  ✓ src/service.test.ts (13 tests) 47ms
packages/crm test:  ✓ src/contact-info.test.ts (7 tests) 27ms
packages/catalog test:  Test Files  2 passed (2)
packages/catalog test:       Tests  19 passed (19)
packages/catalog test:    Start at  22:37:00
packages/catalog test:    Duration  1.09s (transform 109ms, setup 0ms, collect 269ms, tests 51ms, environment 0ms, prepare 364ms)
packages/crm test:  Test Files  3 passed (3)
packages/crm test:       Tests  26 passed (26)
packages/crm test:    Start at  22:37:00
packages/crm test:    Duration  1.10s (transform 209ms, setup 0ms, collect 354ms, tests 37ms, environment 0ms, prepare 691ms)
packages/catalog test: Done
packages/resource test: Done
packages/crm test: Done
packages/scheduling test:  ✓ src/available-slots.test.ts (12 tests) 5ms
packages/scheduling test:  ✓ src/booking.test.ts (22 tests) 6ms
packages/scheduling test:  ✓ src/can-accommodate.test.ts (9 tests) 11ms
packages/scheduling test:  ✓ src/in-memory-booking-repository.test.ts (11 tests) 8ms
packages/scheduling test:  Test Files  5 passed (5)
packages/scheduling test:       Tests  66 passed (66)
packages/scheduling test:    Start at  22:37:00
packages/scheduling test:    Duration  1.16s (transform 507ms, setup 0ms, collect 1.37s, tests 37ms, environment 1ms, prepare 1.04s)
packages/scheduling test: Done
packages/db test$ vitest run
packages/db test:  RUN  v2.1.9 packages/db
packages/db test:  ✓ src/drizzle-customer-repository.test.ts (7 tests) 2686ms
packages/db test:    ✓ DrizzleCustomerRepository > save した Customer を findById で全フィールド一致で取得できる 579ms
packages/db test:    ✓ DrizzleCustomerRepository > 未保存の id で findById すると null が返る 350ms
packages/db test:    ✓ DrizzleCustomerRepository > 複数の Customer を save し、list が全件返す 338ms
packages/db test:    ✓ DrizzleCustomerRepository > 同一 id で再 save すると既存データが更新される（upsert） 335ms
packages/db test:    ✓ DrizzleCustomerRepository > 行 → Customer の再構成が集約不変条件を満たす > phone のみの Customer を save → findById で再構成すると ContactInfo が不変条件を満たす 356ms
packages/db test:    ✓ DrizzleCustomerRepository > 行 → Customer の再構成が集約不変条件を満たす > email のみの Customer を save → findById で再構成すると ContactInfo が不変条件を満たす 361ms
packages/db test:    ✓ DrizzleCustomerRepository > 行 → Customer の再構成が集約不変条件を満たす > phone と email の両方を持つ Customer を save → findById で再構成すると ContactInfo が不変条件を満たす 366ms
packages/db test:  Test Files  1 passed (1)
packages/db test:       Tests  7 passed (7)
packages/db test:    Start at  22:37:02
packages/db test:    Duration  3.15s (transform 46ms, setup 0ms, collect 249ms, tests 2.69s, environment 0ms, prepare 55ms)
packages/db test: Done

```

## Phase: lint

```
Scope: 7 of 8 workspace projects
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
packages/catalog lint$ eslint .
packages/crm lint$ eslint .
packages/resource lint$ eslint .
packages/scheduling lint$ eslint .
packages/catalog lint: Done
packages/crm lint: Done
packages/resource lint: Done
packages/scheduling lint: Done
packages/db lint$ eslint .
packages/db lint: Done

```

## Phase: build

```
Scope: 7 of 8 workspace projects
apps/web build$ next build
apps/web build:  ⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
apps/web build:  We detected multiple lockfiles and selected the directory of ~/Documents/GitHub/koma/pnpm-lock.yaml as the root directory.
apps/web build:  To silence this warning, set `outputFileTracingRoot` in your Next.js config, or consider removing one of the lockfiles if it's not needed.
apps/web build:    See https://nextjs.org/docs/app/api-reference/config/next-config-js/output#caveats for more information.
apps/web build:  Detected additional lockfiles: 
apps/web build:    * pnpm-lock.yaml
apps/web build:    ▲ Next.js 15.5.19
apps/web build:    Creating an optimized production build ...
apps/web build:  ✓ Compiled successfully in 2.0s
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
