# Verification Result — auth-foundation — iter 1

## Verdict: passed

## Phase Results

| # | Phase | Status | Duration | Exit Code |
|---|-------|--------|----------|-----------|
| 1 | typecheck | passed | 4.3s | 0 |
| 2 | test | passed | 10.3s | 0 |
| 3 | lint | passed | 4.5s | 0 |
| 4 | build | passed | 8.6s | 0 |

## Phase: typecheck

```
Scope: 8 of 9 workspace projects
packages/shared check-types$ tsc --noEmit
packages/shared check-types: Done
packages/catalog check-types$ tsc --noEmit
packages/crm check-types$ tsc --noEmit
packages/iam check-types$ tsc --noEmit
packages/resource check-types$ tsc --noEmit
packages/iam check-types: Done
packages/crm check-types: Done
packages/catalog check-types: Done
packages/scheduling check-types$ tsc --noEmit
packages/resource check-types: Done
packages/scheduling check-types: Done
packages/db check-types$ tsc --noEmit
packages/db check-types: Done
apps/web check-types$ tsc --noEmit
apps/web check-types: Done

```

## Phase: test

```
Scope: 8 of 9 workspace projects
packages/shared test$ vitest run
packages/shared test:  RUN  v2.1.9 packages/shared
packages/shared test:  ✓ src/event.test.ts (6 tests) 1ms
packages/shared test:  ✓ src/id.test.ts (9 tests) 3ms
packages/shared test:  ✓ src/money.test.ts (16 tests) 3ms
packages/shared test:  ✓ src/in-memory-event-bus.test.ts (10 tests) 4ms
packages/shared test:  ✓ src/duration.test.ts (12 tests) 3ms
packages/shared test:  ✓ src/time-range.test.ts (18 tests) 3ms
packages/shared test:  Test Files  6 passed (6)
packages/shared test:       Tests  71 passed (71)
packages/shared test:    Start at  10:30:50
packages/shared test:    Duration  282ms (transform 141ms, setup 0ms, collect 223ms, tests 18ms, environment 1ms, prepare 420ms)
packages/shared test: Done
packages/catalog test$ vitest run
packages/crm test$ vitest run
packages/iam test$ vitest run
packages/resource test$ vitest run
packages/crm test:  RUN  v2.1.9 packages/crm
packages/resource test:  RUN  v2.1.9 packages/resource
packages/catalog test:  RUN  v2.1.9 packages/catalog
packages/iam test:  RUN  v2.1.9 packages/iam
packages/resource test:  ✓ src/daily-time-range.test.ts (17 tests) 3ms
packages/resource test:  ✓ src/availability.test.ts (23 tests) 98ms
packages/iam test:  ✓ src/role.test.ts (7 tests) 2ms
packages/crm test:  ✓ src/customer.test.ts (13 tests) 3ms
packages/crm test:  ✓ src/in-memory-customer-repository.test.ts (6 tests) 3ms
packages/catalog test:  ✓ src/in-memory-service-repository.test.ts (6 tests) 4ms
packages/catalog test:  ✓ src/service.test.ts (13 tests) 6ms
packages/iam test:  ✓ src/in-memory-user-repository.test.ts (8 tests) 4ms
packages/crm test:  ✓ src/contact-info.test.ts (7 tests) 2ms
packages/crm test:  Test Files  3 passed (3)
packages/crm test:       Tests  26 passed (26)
packages/crm test:    Start at  10:30:50
packages/crm test:    Duration  1.14s (transform 198ms, setup 0ms, collect 570ms, tests 8ms, environment 89ms, prepare 326ms)
packages/catalog test:  Test Files  2 passed (2)
packages/catalog test:       Tests  19 passed (19)
packages/catalog test:    Start at  10:30:50
packages/catalog test:    Duration  1.15s (transform 113ms, setup 0ms, collect 197ms, tests 10ms, environment 0ms, prepare 353ms)
packages/iam test:  ✓ src/user.test.ts (9 tests) 3ms
packages/crm test: Done
packages/scheduling test$ vitest run
packages/iam test:  Test Files  3 passed (3)
packages/iam test:       Tests  24 passed (24)
packages/iam test:    Start at  10:30:50
packages/iam test:    Duration  1.16s (transform 260ms, setup 0ms, collect 472ms, tests 9ms, environment 0ms, prepare 517ms)
packages/resource test:  ✓ src/resource.test.ts (11 tests) 7ms
packages/resource test:  ✓ src/in-memory-resource-repository.test.ts (6 tests) 4ms
packages/resource test:  Test Files  4 passed (4)
packages/resource test:       Tests  57 passed (57)
packages/resource test:    Start at  10:30:50
packages/resource test:    Duration  1.19s (transform 291ms, setup 0ms, collect 603ms, tests 112ms, environment 1ms, prepare 1.06s)
packages/catalog test: Done
packages/iam test: Done
packages/resource test: Done
packages/scheduling test:  RUN  v2.1.9 packages/scheduling
packages/scheduling test:  ✓ src/booking-status.test.ts (12 tests) 3ms
packages/scheduling test:  ✓ src/can-accommodate.test.ts (9 tests) 2ms
packages/scheduling test:  ✓ src/booking.test.ts (22 tests) 4ms
packages/scheduling test:  ✓ src/available-slots.test.ts (12 tests) 3ms
packages/scheduling test:  ✓ src/in-memory-booking-repository.test.ts (11 tests) 5ms
packages/scheduling test:  Test Files  5 passed (5)
packages/scheduling test:       Tests  66 passed (66)
packages/scheduling test:    Start at  10:30:52
packages/scheduling test:    Duration  287ms (transform 143ms, setup 0ms, collect 260ms, tests 18ms, environment 1ms, prepare 327ms)
packages/scheduling test: Done
packages/db test$ vitest run
packages/db test:  RUN  v2.1.9 packages/db
packages/db test:  ✓ src/ensure-schema.test.ts (3 tests) 3328ms
packages/db test:    ✓ ensureSchema > 4 テーブル（customers, resources, services, bookings）が作成される 1941ms
packages/db test:    ✓ ensureSchema > 2 回実行してもエラーが発生しない（冪等） 728ms
packages/db test:    ✓ ensureSchema > ensureSchema 後に Drizzle repo が正常に動作する（Customer save → findById） 658ms
packages/db test:  ✓ src/drizzle-resource-repository.test.ts (5 tests) 4849ms
packages/db test:    ✓ DrizzleResourceRepository > save した Resource を findById で全フィールド一致で取得できる 2090ms
packages/db test:    ✓ DrizzleResourceRepository > 未保存の id で findById すると null が返る 865ms
packages/db test:    ✓ DrizzleResourceRepository > 複数の Resource を save し、list が全件返す 720ms
packages/db test:    ✓ DrizzleResourceRepository > 同一 id で再 save すると既存データが更新される（upsert） 625ms
packages/db test:    ✓ DrizzleResourceRepository > 行 → Resource の再構成が capacity >= 1 の不変条件を createResource 経由で通す 548ms
packages/db test:  ✓ src/drizzle-booking-repository.test.ts (6 tests) 4873ms
packages/db test:    ✓ DrizzleBookingRepository > save した Booking を findById で全フィールド一致で取得できる 1904ms
packages/db test:    ✓ DrizzleBookingRepository > 未保存の id で findById すると null が返る 736ms
packages/db test:    ✓ DrizzleBookingRepository > 複数の Booking を save し、list が全件返す 641ms
packages/db test:    ✓ DrizzleBookingRepository > 同一 id で再 save すると既存データが更新される（upsert） 583ms
packages/db test:    ✓ DrizzleBookingRepository > findActiveByResource が指定 resource の active のみ返す 559ms
packages/db test:    ✓ DrizzleBookingRepository > 2026年の epoch ms (1_800_000_000_000) が欠損なく往復する 450ms
packages/db test:  ✓ src/drizzle-customer-repository.test.ts (7 tests) 5298ms
packages/db test:    ✓ DrizzleCustomerRepository > save した Customer を findById で全フィールド一致で取得できる 1979ms
packages/db test:    ✓ DrizzleCustomerRepository > 未保存の id で findById すると null が返る 726ms
packages/db test:    ✓ DrizzleCustomerRepository > 複数の Customer を save し、list が全件返す 676ms
packages/db test:    ✓ DrizzleCustomerRepository > 同一 id で再 save すると既存データが更新される（upsert） 565ms
packages/db test:    ✓ DrizzleCustomerRepository > 行 → Customer の再構成が集約不変条件を満たす > phone のみの Customer を save → findById で再構成すると ContactInfo が不変条件を満たす 540ms
packages/db test:    ✓ DrizzleCustomerRepository > 行 → Customer の再構成が集約不変条件を満たす > email のみの Customer を save → findById で再構成すると ContactInfo が不変条件を満たす 468ms
packages/db test:    ✓ DrizzleCustomerRepository > 行 → Customer の再構成が集約不変条件を満たす > phone と email の両方を持つ Customer を save → findById で再構成すると ContactInfo が不変条件を満たす 344ms
packages/db test:  ✓ src/drizzle-service-repository.test.ts (8 tests) 5597ms
packages/db test:    ✓ DrizzleServiceRepository > save した Service を findById で全フィールド一致で取得できる 1948ms
packages/db test:    ✓ DrizzleServiceRepository > 未保存の id で findById すると null が返る 730ms
packages/db test:    ✓ DrizzleServiceRepository > 複数の Service を save し、list が全件返す 606ms
packages/db test:    ✓ DrizzleServiceRepository > 同一 id で再 save すると既存データが更新される（upsert） 573ms
packages/db test:    ✓ DrizzleServiceRepository > duration が往復で保たれる（ofMilliseconds 経由で再構成） 565ms
packages/db test:    ✓ DrizzleServiceRepository > price が往復で保たれる（createMoney 経由で再構成） 440ms
packages/db test:    ✓ DrizzleServiceRepository > resourceKinds が往復で保たれる（非空配列） 401ms
packages/db test:    ✓ DrizzleServiceRepository > resourceKinds が空配列の場合も往復する 333ms
packages/db test:  Test Files  5 passed (5)
packages/db test:       Tests  29 passed (29)
packages/db test:    Start at  10:30:52
packages/db test:    Duration  6.12s (transform 169ms, setup 0ms, collect 1.52s, tests 23.94s, environment 1ms, prepare 303ms)
packages/db test: Done
apps/web test$ vitest run
apps/web test: [33mThe CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.[39m
apps/web test:  RUN  v2.1.9 apps/web
apps/web test:  ✓ lib/parse-service-input.test.ts (17 tests) 5ms
apps/web test:  ✓ lib/parse-customer-input.test.ts (11 tests) 4ms
apps/web test:  ✓ lib/parse-resource-input.test.ts (14 tests) 4ms
apps/web test:  ✓ app/customers/actions.test.ts (4 tests) 5ms
apps/web test:  ✓ app/resources/actions.test.ts (4 tests) 8ms
apps/web test:  ✓ lib/create-booking-use-case.test.ts (6 tests) 3ms
apps/web test:  ✓ app/bookings/actions.test.ts (8 tests) 7ms
apps/web test:  ✓ lib/auth-config.test.ts (10 tests) 3ms
apps/web test:  ✓ lib/parse-booking-input.test.ts (8 tests) 6ms
apps/web test:  ✓ lib/session.test.ts (8 tests) 13ms
apps/web test:  ✓ lib/dashboard.test.ts (2 tests) 3ms
apps/web test:  ✓ app/services/actions.test.ts (3 tests) 4ms
apps/web test:  ✓ lib/booking-transitions.test.ts (10 tests) 2ms
apps/web test:  ✓ lib/composition-root.test.ts (5 tests) 49ms
apps/web test:  ✓ lib/persistence-mode.test.ts (4 tests) 3ms
apps/web test:  ✓ lib/password.test.ts (6 tests) 256ms
apps/web test:  ✓ lib/authenticate.test.ts (4 tests) 292ms
apps/web test:  Test Files  17 passed (17)
apps/web test:       Tests  124 passed (124)
apps/web test:    Start at  10:30:58
apps/web test:    Duration  1.05s (transform 551ms, setup 0ms, collect 1.51s, tests 666ms, environment 2ms, prepare 1.08s)
apps/web test: Done

```

## Phase: lint

```
Scope: 8 of 9 workspace projects
packages/shared lint$ eslint .
packages/shared lint: Done
packages/catalog lint$ eslint .
packages/crm lint$ eslint .
packages/iam lint$ eslint .
packages/resource lint$ eslint .
packages/catalog lint: Done
packages/crm lint: Done
packages/scheduling lint$ eslint .
packages/iam lint: Done
packages/resource lint: Done
packages/scheduling lint: Done
packages/db lint$ eslint .
packages/db lint: Done
apps/web lint$ next lint
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
apps/web lint: ✔ No ESLint warnings or errors
apps/web lint: Done

```

## Phase: build

```
Scope: 8 of 9 workspace projects
apps/web build$ next build
apps/web build:  ⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
apps/web build:  We detected multiple lockfiles and selected the directory of ~/Documents/GitHub/koma/pnpm-lock.yaml as the root directory.
apps/web build:  To silence this warning, set `outputFileTracingRoot` in your Next.js config, or consider removing one of the lockfiles if it's not needed.
apps/web build:    See https://nextjs.org/docs/app/api-reference/config/next-config-js/output#caveats for more information.
apps/web build:  Detected additional lockfiles: 
apps/web build:    * pnpm-lock.yaml
apps/web build:    ▲ Next.js 15.5.19
apps/web build:    Creating an optimized production build ...
apps/web build:  ✓ Compiled successfully in 1036ms
apps/web build:    Linting and checking validity of types ...
apps/web build:    Collecting page data ...
apps/web build:    Generating static pages (0/8) ...
apps/web build:    Generating static pages (2/8) 
apps/web build:    Generating static pages (4/8) 
apps/web build:    Generating static pages (6/8) 
apps/web build:  ✓ Generating static pages (8/8)
apps/web build:    Finalizing page optimization ...
apps/web build:    Collecting build traces ...
apps/web build: Route (app)                                 Size  First Load JS
apps/web build: ┌ ○ /                                      164 B         106 kB
apps/web build: ├ ○ /_not-found                            992 B         103 kB
apps/web build: ├ ○ /bookings                            1.42 kB         104 kB
apps/web build: ├ ○ /customers                             962 B         103 kB
apps/web build: ├ ○ /resources                             932 B         103 kB
apps/web build: └ ○ /services                            1.03 kB         104 kB
apps/web build: + First Load JS shared by all             102 kB
apps/web build:   ├ chunks/285-933c438dfbb98efd.js       46.4 kB
apps/web build:   ├ chunks/f5184d75-27b7240eb4153f0c.js  54.2 kB
apps/web build:   └ other shared chunks (total)          1.88 kB
apps/web build: ○  (Static)  prerendered as static content
apps/web build: Done

```
