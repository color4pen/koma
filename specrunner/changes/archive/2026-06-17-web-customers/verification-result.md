# Verification Result — web-customers — iter 1

## Verdict: passed

## Phase Results

| # | Phase | Status | Duration | Exit Code |
|---|-------|--------|----------|-----------|
| 1 | typecheck | passed | 2.6s | 0 |
| 2 | test | passed | 5.4s | 0 |
| 3 | lint | passed | 3.2s | 0 |
| 4 | build | passed | 7.1s | 0 |

## Phase: typecheck

```
Scope: 7 of 8 workspace projects
packages/shared check-types$ tsc --noEmit
packages/shared check-types: Done
packages/resource check-types$ tsc --noEmit
packages/catalog check-types$ tsc --noEmit
packages/crm check-types$ tsc --noEmit
packages/scheduling check-types$ tsc --noEmit
packages/catalog check-types: Done
packages/resource check-types: Done
packages/crm check-types: Done
packages/scheduling check-types: Done
apps/web check-types$ tsc --noEmit
packages/db check-types$ tsc --noEmit
packages/db check-types: Done
apps/web check-types: Done

```

## Phase: test

```
Scope: 7 of 8 workspace projects
packages/shared test$ vitest run
packages/shared test:  RUN  v2.1.9 packages/shared
packages/shared test:  ✓ src/in-memory-event-bus.test.ts (10 tests) 5ms
packages/shared test:  ✓ src/event.test.ts (6 tests) 2ms
packages/shared test:  ✓ src/duration.test.ts (12 tests) 3ms
packages/shared test:  ✓ src/money.test.ts (16 tests) 4ms
packages/shared test:  ✓ src/time-range.test.ts (18 tests) 7ms
packages/shared test:  ✓ src/id.test.ts (9 tests) 7ms
packages/shared test:  Test Files  6 passed (6)
packages/shared test:       Tests  71 passed (71)
packages/shared test:    Start at  23:41:10
packages/shared test:    Duration  273ms (transform 88ms, setup 0ms, collect 160ms, tests 29ms, environment 1ms, prepare 474ms)
packages/shared test: Done
packages/crm test$ vitest run
packages/catalog test$ vitest run
packages/resource test$ vitest run
packages/scheduling test$ vitest run
packages/resource test:  RUN  v2.1.9 packages/resource
packages/catalog test:  RUN  v2.1.9 packages/catalog
packages/scheduling test:  RUN  v2.1.9 packages/scheduling
packages/crm test:  RUN  v2.1.9 packages/crm
packages/resource test:  ✓ src/daily-time-range.test.ts (17 tests) 3ms
packages/resource test:  ✓ src/availability.test.ts (23 tests) 5ms
packages/scheduling test:  ✓ src/booking.test.ts (22 tests) 4ms
packages/scheduling test:  ✓ src/available-slots.test.ts (12 tests) 5ms
packages/scheduling test:  ✓ src/can-accommodate.test.ts (9 tests) 2ms
packages/scheduling test:  ✓ src/in-memory-booking-repository.test.ts (11 tests) 7ms
packages/catalog test:  ✓ src/in-memory-service-repository.test.ts (6 tests) 4ms
packages/catalog test:  ✓ src/service.test.ts (13 tests) 8ms
packages/crm test:  ✓ src/contact-info.test.ts (7 tests) 6ms
packages/resource test:  ✓ src/in-memory-resource-repository.test.ts (6 tests) 9ms
packages/resource test:  ✓ src/resource.test.ts (11 tests) 3ms
packages/catalog test:  Test Files  2 passed (2)
packages/catalog test:       Tests  19 passed (19)
packages/catalog test:    Start at  23:41:10
packages/catalog test:    Duration  938ms (transform 147ms, setup 0ms, collect 417ms, tests 12ms, environment 0ms, prepare 299ms)
packages/resource test:  Test Files  4 passed (4)
packages/resource test:       Tests  57 passed (57)
packages/resource test:    Start at  23:41:10
packages/resource test:    Duration  963ms (transform 648ms, setup 0ms, collect 1.38s, tests 20ms, environment 3ms, prepare 1.40s)
packages/catalog test: Done
packages/resource test: Done
packages/crm test:  ✓ src/customer.test.ts (13 tests) 3ms
packages/scheduling test:  ✓ src/booking-status.test.ts (12 tests) 3ms
packages/crm test:  ✓ src/in-memory-customer-repository.test.ts (6 tests) 3ms
packages/crm test:  Test Files  3 passed (3)
packages/crm test:       Tests  26 passed (26)
packages/crm test:    Start at  23:41:10
packages/crm test:    Duration  868ms (transform 198ms, setup 0ms, collect 489ms, tests 12ms, environment 0ms, prepare 385ms)
packages/scheduling test:  Test Files  5 passed (5)
packages/scheduling test:       Tests  66 passed (66)
packages/scheduling test:    Start at  23:41:10
packages/scheduling test:    Duration  915ms (transform 139ms, setup 0ms, collect 392ms, tests 21ms, environment 1ms, prepare 814ms)
packages/crm test: Done
packages/scheduling test: Done
apps/web test$ vitest run
packages/db test$ vitest run
apps/web test: [33mThe CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.[39m
packages/db test:  RUN  v2.1.9 packages/db
apps/web test:  RUN  v2.1.9 apps/web
apps/web test:  ✓ lib/parse-customer-input.test.ts (11 tests) 4ms
apps/web test:  ✓ app/customers/actions.test.ts (4 tests) 4ms
apps/web test:  Test Files  2 passed (2)
apps/web test:       Tests  15 passed (15)
apps/web test:    Start at  23:41:11
apps/web test:    Duration  407ms (transform 70ms, setup 0ms, collect 142ms, tests 7ms, environment 0ms, prepare 87ms)
apps/web test: Done
packages/db test:  ✓ src/drizzle-customer-repository.test.ts (7 tests) 2469ms
packages/db test:    ✓ DrizzleCustomerRepository > save した Customer を findById で全フィールド一致で取得できる 542ms
packages/db test:    ✓ DrizzleCustomerRepository > 未保存の id で findById すると null が返る 332ms
packages/db test:    ✓ DrizzleCustomerRepository > 複数の Customer を save し、list が全件返す 323ms
packages/db test:    ✓ DrizzleCustomerRepository > 同一 id で再 save すると既存データが更新される（upsert） 324ms
packages/db test:    ✓ DrizzleCustomerRepository > 行 → Customer の再構成が集約不変条件を満たす > phone のみの Customer を save → findById で再構成すると ContactInfo が不変条件を満たす 316ms
packages/db test:    ✓ DrizzleCustomerRepository > 行 → Customer の再構成が集約不変条件を満たす > email のみの Customer を save → findById で再構成すると ContactInfo が不変条件を満たす 315ms
packages/db test:    ✓ DrizzleCustomerRepository > 行 → Customer の再構成が集約不変条件を満たす > phone と email の両方を持つ Customer を save → findById で再構成すると ContactInfo が不変条件を満たす 316ms
packages/db test:  Test Files  1 passed (1)
packages/db test:       Tests  7 passed (7)
packages/db test:    Start at  23:41:11
packages/db test:    Duration  3.06s (transform 79ms, setup 0ms, collect 266ms, tests 2.47s, environment 0ms, prepare 54ms)
packages/db test: Done

```

## Phase: lint

```
Scope: 7 of 8 workspace projects
packages/shared lint$ eslint .
packages/shared lint: Done
packages/catalog lint$ eslint .
packages/resource lint$ eslint .
packages/crm lint$ eslint .
packages/scheduling lint$ eslint .
packages/catalog lint: Done
packages/crm lint: Done
packages/resource lint: Done
packages/scheduling lint: Done
apps/web lint$ next lint
packages/db lint$ eslint .
apps/web lint: `next lint` is deprecated and will be removed in Next.js 16.
apps/web lint: For new projects, use create-next-app to choose your preferred linter.
apps/web lint: For existing projects, migrate to the ESLint CLI:
apps/web lint: npx @next/codemod@canary next-lint-to-eslint-cli .
packages/db lint: Done
apps/web lint:  ⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
apps/web lint:  We detected multiple lockfiles and selected the directory of ~/Documents/GitHub/koma/pnpm-lock.yaml as the root directory.
apps/web lint:  To silence this warning, set `outputFileTracingRoot` in your Next.js config, or consider removing one of the lockfiles if it's not needed.
apps/web lint:    See https://nextjs.org/docs/app/api-reference/config/next-config-js/output#caveats for more information.
apps/web lint:  Detected additional lockfiles: 
apps/web lint:    * pnpm-lock.yaml
apps/web lint: ✔ No ESLint warnings or errors
apps/web lint: Done

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
apps/web build:  ✓ Compiled successfully in 667ms
apps/web build:    Linting and checking validity of types ...
apps/web build:    Collecting page data ...
apps/web build:    Generating static pages (0/5) ...
apps/web build:    Generating static pages (1/5) 
apps/web build:    Generating static pages (2/5) 
apps/web build:    Generating static pages (3/5) 
apps/web build:  ✓ Generating static pages (5/5)
apps/web build:    Finalizing page optimization ...
apps/web build:    Collecting build traces ...
apps/web build: Route (app)                                 Size  First Load JS
apps/web build: ┌ ○ /                                      127 B         103 kB
apps/web build: ├ ○ /_not-found                            993 B         103 kB
apps/web build: └ ○ /customers                             970 B         103 kB
apps/web build: + First Load JS shared by all             102 kB
apps/web build:   ├ chunks/285-933c438dfbb98efd.js       46.4 kB
apps/web build:   ├ chunks/f5184d75-27b7240eb4153f0c.js  54.2 kB
apps/web build:   └ other shared chunks (total)          1.88 kB
apps/web build: ○  (Static)  prerendered as static content
apps/web build: Done

```
