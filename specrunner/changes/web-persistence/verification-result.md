# Verification Result — web-persistence — iter 1

## Verdict: failed

## Phase Results

| # | Phase | Status | Duration | Exit Code |
|---|-------|--------|----------|-----------|
| 1 | typecheck | passed | 3.3s | 0 |
| 2 | test | passed | 7.8s | 0 |
| 3 | lint | failed | 3.4s | 1 |
| 4 | build | skipped | — | — |

## Phase: typecheck

```
Scope: 7 of 8 workspace projects
packages/shared check-types$ tsc --noEmit
packages/shared check-types: Done
packages/resource check-types$ tsc --noEmit
packages/crm check-types$ tsc --noEmit
packages/catalog check-types$ tsc --noEmit
packages/scheduling check-types$ tsc --noEmit
packages/crm check-types: Done
packages/catalog check-types: Done
packages/scheduling check-types: Done
packages/resource check-types: Done
packages/db check-types$ tsc --noEmit
packages/db check-types: Done
apps/web check-types$ tsc --noEmit
apps/web check-types: Done

```

## Phase: test

```
Scope: 7 of 8 workspace projects
packages/shared test$ vitest run
packages/shared test:  RUN  v2.1.9 packages/shared
packages/shared test:  ✓ src/event.test.ts (6 tests) 1ms
packages/shared test:  ✓ src/in-memory-event-bus.test.ts (10 tests) 4ms
packages/shared test:  ✓ src/money.test.ts (16 tests) 3ms
packages/shared test:  ✓ src/id.test.ts (9 tests) 3ms
packages/shared test:  ✓ src/duration.test.ts (12 tests) 3ms
packages/shared test:  ✓ src/time-range.test.ts (18 tests) 3ms
packages/shared test:  Test Files  6 passed (6)
packages/shared test:       Tests  71 passed (71)
packages/shared test:    Start at  04:19:08
packages/shared test:    Duration  245ms (transform 118ms, setup 0ms, collect 197ms, tests 18ms, environment 1ms, prepare 341ms)
packages/shared test: Done
packages/catalog test$ vitest run
packages/resource test$ vitest run
packages/crm test$ vitest run
packages/scheduling test$ vitest run
packages/catalog test:  RUN  v2.1.9 packages/catalog
packages/crm test:  RUN  v2.1.9 packages/crm
packages/resource test:  RUN  v2.1.9 packages/resource
packages/scheduling test:  RUN  v2.1.9 packages/scheduling
packages/crm test:  ✓ src/contact-info.test.ts (7 tests) 4ms
packages/resource test:  ✓ src/availability.test.ts (23 tests) 5ms
packages/resource test:  ✓ src/daily-time-range.test.ts (17 tests) 8ms
packages/scheduling test:  ✓ src/booking.test.ts (22 tests) 7ms
packages/scheduling test:  ✓ src/can-accommodate.test.ts (9 tests) 3ms
packages/scheduling test:  ✓ src/in-memory-booking-repository.test.ts (11 tests) 4ms
packages/catalog test:  ✓ src/service.test.ts (13 tests) 10ms
packages/catalog test:  ✓ src/in-memory-service-repository.test.ts (6 tests) 4ms
packages/crm test:  ✓ src/in-memory-customer-repository.test.ts (6 tests) 3ms
packages/crm test:  ✓ src/customer.test.ts (13 tests) 3ms
packages/resource test:  ✓ src/resource.test.ts (11 tests) 4ms
packages/resource test:  ✓ src/in-memory-resource-repository.test.ts (6 tests) 4ms
packages/catalog test:  Test Files  2 passed (2)
packages/catalog test:       Tests  19 passed (19)
packages/catalog test:    Start at  04:19:08
packages/catalog test:    Duration  915ms (transform 98ms, setup 0ms, collect 180ms, tests 14ms, environment 0ms, prepare 487ms)
packages/crm test:  Test Files  3 passed (3)
packages/crm test:       Tests  26 passed (26)
packages/crm test:    Start at  04:19:08
packages/crm test:    Duration  929ms (transform 120ms, setup 0ms, collect 383ms, tests 10ms, environment 0ms, prepare 690ms)
packages/resource test:  Test Files  4 passed (4)
packages/resource test:       Tests  57 passed (57)
packages/resource test:    Start at  04:19:08
packages/resource test:    Duration  929ms (transform 167ms, setup 0ms, collect 587ms, tests 21ms, environment 0ms, prepare 783ms)
packages/scheduling test:  ✓ src/booking-status.test.ts (12 tests) 2ms
packages/resource test: Done
packages/catalog test: Done
packages/crm test: Done
packages/scheduling test:  ✓ src/available-slots.test.ts (12 tests) 6ms
packages/scheduling test:  Test Files  5 passed (5)
packages/scheduling test:       Tests  66 passed (66)
packages/scheduling test:    Start at  04:19:08
packages/scheduling test:    Duration  976ms (transform 132ms, setup 0ms, collect 483ms, tests 22ms, environment 1ms, prepare 971ms)
packages/scheduling test: Done
packages/db test$ vitest run
packages/db test:  RUN  v2.1.9 packages/db
packages/db test:  ✓ src/ensure-schema.test.ts (3 tests) 2569ms
packages/db test:    ✓ ensureSchema > 4 テーブル（customers, resources, services, bookings）が作成される 1464ms
packages/db test:    ✓ ensureSchema > 2 回実行してもエラーが発生しない（冪等） 602ms
packages/db test:    ✓ ensureSchema > ensureSchema 後に Drizzle repo が正常に動作する（Customer save → findById） 502ms
packages/db test:  ✓ src/drizzle-resource-repository.test.ts (5 tests) 3361ms
packages/db test:    ✓ DrizzleResourceRepository > save した Resource を findById で全フィールド一致で取得できる 1430ms
packages/db test:    ✓ DrizzleResourceRepository > 未保存の id で findById すると null が返る 567ms
packages/db test:    ✓ DrizzleResourceRepository > 複数の Resource を save し、list が全件返す 489ms
packages/db test:    ✓ DrizzleResourceRepository > 同一 id で再 save すると既存データが更新される（upsert） 440ms
packages/db test:    ✓ DrizzleResourceRepository > 行 → Resource の再構成が capacity >= 1 の不変条件を createResource 経由で通す 433ms
packages/db test:  ✓ src/drizzle-booking-repository.test.ts (6 tests) 3923ms
packages/db test:    ✓ DrizzleBookingRepository > save した Booking を findById で全フィールド一致で取得できる 1529ms
packages/db test:    ✓ DrizzleBookingRepository > 未保存の id で findById すると null が返る 582ms
packages/db test:    ✓ DrizzleBookingRepository > 複数の Booking を save し、list が全件返す 570ms
packages/db test:    ✓ DrizzleBookingRepository > 同一 id で再 save すると既存データが更新される（upsert） 455ms
packages/db test:    ✓ DrizzleBookingRepository > findActiveByResource が指定 resource の active のみ返す 379ms
packages/db test:    ✓ DrizzleBookingRepository > 2026年の epoch ms (1_800_000_000_000) が欠損なく往復する 408ms
packages/db test:  ✓ src/drizzle-customer-repository.test.ts (7 tests) 4212ms
packages/db test:    ✓ DrizzleCustomerRepository > save した Customer を findById で全フィールド一致で取得できる 1400ms
packages/db test:    ✓ DrizzleCustomerRepository > 未保存の id で findById すると null が返る 598ms
packages/db test:    ✓ DrizzleCustomerRepository > 複数の Customer を save し、list が全件返す 499ms
packages/db test:    ✓ DrizzleCustomerRepository > 同一 id で再 save すると既存データが更新される（upsert） 513ms
packages/db test:    ✓ DrizzleCustomerRepository > 行 → Customer の再構成が集約不変条件を満たす > phone のみの Customer を save → findById で再構成すると ContactInfo が不変条件を満たす 471ms
packages/db test:    ✓ DrizzleCustomerRepository > 行 → Customer の再構成が集約不変条件を満たす > email のみの Customer を save → findById で再構成すると ContactInfo が不変条件を満たす 383ms
packages/db test:    ✓ DrizzleCustomerRepository > 行 → Customer の再構成が集約不変条件を満たす > phone と email の両方を持つ Customer を save → findById で再構成すると ContactInfo が不変条件を満たす 347ms
packages/db test:  ✓ src/drizzle-service-repository.test.ts (8 tests) 4458ms
packages/db test:    ✓ DrizzleServiceRepository > save した Service を findById で全フィールド一致で取得できる 1470ms
packages/db test:    ✓ DrizzleServiceRepository > 未保存の id で findById すると null が返る 577ms
packages/db test:    ✓ DrizzleServiceRepository > 複数の Service を save し、list が全件返す 496ms
packages/db test:    ✓ DrizzleServiceRepository > 同一 id で再 save すると既存データが更新される（upsert） 460ms
packages/db test:    ✓ DrizzleServiceRepository > duration が往復で保たれる（ofMilliseconds 経由で再構成） 403ms
packages/db test:    ✓ DrizzleServiceRepository > price が往復で保たれる（createMoney 経由で再構成） 376ms
packages/db test:    ✓ DrizzleServiceRepository > resourceKinds が往復で保たれる（非空配列） 350ms
packages/db test:    ✓ DrizzleServiceRepository > resourceKinds が空配列の場合も往復する 325ms
packages/db test:  Test Files  5 passed (5)
packages/db test:       Tests  29 passed (29)
packages/db test:    Start at  04:19:09
packages/db test:    Duration  4.93s (transform 162ms, setup 0ms, collect 1.38s, tests 18.52s, environment 0ms, prepare 249ms)
packages/db test: Done
apps/web test$ vitest run
apps/web test: [33mThe CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.[39m
apps/web test:  RUN  v2.1.9 apps/web
apps/web test:  ✓ lib/parse-service-input.test.ts (17 tests) 5ms
apps/web test:  ✓ lib/parse-customer-input.test.ts (11 tests) 7ms
apps/web test:  ✓ lib/parse-resource-input.test.ts (14 tests) 5ms
apps/web test:  ✓ app/customers/actions.test.ts (4 tests) 4ms
apps/web test:  ✓ app/resources/actions.test.ts (4 tests) 5ms
apps/web test:  ✓ lib/create-booking-use-case.test.ts (6 tests) 3ms
apps/web test:  ✓ app/bookings/actions.test.ts (8 tests) 5ms
apps/web test:  ✓ lib/persistence-mode.test.ts (4 tests) 1ms
apps/web test:  ✓ lib/booking-transitions.test.ts (10 tests) 2ms
apps/web test:  ✓ lib/parse-booking-input.test.ts (8 tests) 4ms
apps/web test:  ✓ app/services/actions.test.ts (3 tests) 4ms
apps/web test:  ✓ lib/dashboard.test.ts (2 tests) 2ms
apps/web test:  Test Files  12 passed (12)
apps/web test:       Tests  91 passed (91)
apps/web test:    Start at  04:19:14
apps/web test:    Duration  562ms (transform 338ms, setup 0ms, collect 959ms, tests 47ms, environment 1ms, prepare 723ms)
apps/web test: Done

```

## Phase: lint

Step 'lint' failed

```
Scope: 7 of 8 workspace projects
packages/shared lint$ eslint .
packages/shared lint: Done
packages/resource lint$ eslint .
packages/catalog lint$ eslint .
packages/crm lint$ eslint .
packages/scheduling lint$ eslint .
packages/resource lint: Done
packages/catalog lint: Done
packages/crm lint: Done
packages/scheduling lint: Done
packages/db lint$ eslint .
packages/db lint: packages/db/src/client.ts
packages/db lint:   9:40  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
packages/db lint: ✖ 1 problem (1 error, 0 warnings)
packages/db lint: Failed
packages/db:
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @koma/db@ lint: `eslint .`
Exit status 1

```

## Phase: build

_(skipped — previous command failed)_
