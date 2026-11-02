# Tasks: Hotel Kong Arthur – Drift, Booking & Dataanalyse-Platform

**Input**: Design documents from `specs/001-hotel-analytics-platform/`

**Updated**: 2026-11-02 — tillægsopgave uge 2: Phase 2B (PostgreSQL i stedet for MySQL) og Phase 8B (US7, nøgletal i frontenden) er tilføjet. Constitution v2.0.0.

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/openapi.yaml ✓, quickstart.md ✓, constitution.md ✓

**Tests**: Spec (NFR-010) og constitution (V) kræver automatiserede unit-tests af forretningslogik og kontrakttest mod OpenAPI. Tests inkluderes.

**Organization**: Tasks er grupperet efter user story for at muliggøre uafhængig implementering og test af hver story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/`, `tableau-connector/`
- API-kontrakt: `api/openapi.yaml`
- Data: `hotel_bookings_2026.csv`, `drinks_menu_with_sales.csv`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Projekt-initialisering, Docker-opsætning og grundlæggende mappestruktur

- [ ] T001 Create project root structure per plan.md: `backend/`, `frontend/`, `tableau-connector/`, `tableau/`, `api/`, `.env.example`, `docker-compose.yml`, `README.md`, `CONTRIBUTE.md`
  - Delvist: `api/`, `.env.example`, `docker-compose.yml` og mapperne `backend/`, `frontend/`, `tableau-connector/` findes. Mangler: `tableau/`, `CONTRIBUTE.md`
- [X] T002 Initialize Node.js/TypeScript project in `backend/`: `backend/package.json` with dependencies (`express`, `mysql2`, `zod`, `express-openapi-validator`, `cors`, `csv-parse`, `pino`) and devDependencies (`typescript`, `vitest`, `supertest`, `eslint`, `prettier`, `@types/*`), `backend/tsconfig.json`, `backend/vitest.config.ts`, `backend/eslint.config.js`
- [X] T003 [P] Copy OpenAPI contract from `specs/001-hotel-analytics-platform/contracts/openapi.yaml` to `api/openapi.yaml` (the binding contract read by backend and swagger-ui)
- [X] T004 [P] Create `.env.example` with MySQL credentials (`MYSQL_HOST=db`, `MYSQL_PORT=3306`, `MYSQL_USER=hotel`, `MYSQL_PASSWORD=hotel`, `MYSQL_DATABASE=hotel_kong_arthur`, `PORT=3000`) and `backend/src/config/env.ts` to load them
- [X] T005 [P] Create `docker-compose.yml` with services: `db` (mysql:8.4, healthcheck `mysqladmin ping`, named volume `mysql-data`, port NOT published), `backend` (build `./backend`, host port 3000, `depends_on: db: condition: service_healthy`, bind-mount CSV files read-only to `/app/data` and `./api/openapi.yaml` to `/app/openapi.yaml`, `restart: on-failure`), `frontend` (build `./frontend`, host port 8080, `depends_on: backend: condition: service_healthy`), `swagger-ui` (`swaggerapi/swagger-ui`, host port 8081, `SWAGGER_JSON=/spec/openapi.yaml`, bind-mount `./api`), `wdc-build` (build `./tableau-connector`, engangsjob), `backend-test` (compose profile `test`, target `test`, `depends_on: db: condition: service_healthy`). Network: `hotel-net`
- [X] T006 [P] Create `backend/Dockerfile` as multi-stage: build stage (`node:22-alpine`, `npm ci`, `npx tsc`) and runtime stage (`node:22-alpine`, copy dist + node_modules, healthcheck `wget -qO- http://localhost:3000/api/health`, `CMD ["node", "dist/server.js"]`). Add target `test` for integration tests

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database-skema, migrationer, Express-app med middleware, fejlhåndtering og domænemoduler. SKAL være færdig før nogen user story kan starte.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create domain types in `backend/src/domain/types.ts`: interfaces for `RoomType`, `Room`, `Guest`, `Booking`, `Drink`, `DrinkSale`, DTOs for input/output
- [X] T008 [P] Create domain error classes in `backend/src/domain/errors.ts`: `DomainError` (base), `ValidationError` (→ 400), `NotFoundError` (→ 404), `ConflictError` (→ 409)
- [X] T009 [P] Create seasons module in `backend/src/domain/seasons.ts`: function `determineSeason(checkIn: Date): 'low' | 'mid' | 'high'` implementing season rules from reference-data.md (`low`: Jan 1–Feb 28 and Nov 1–Dec 15; `mid`: Mar 1–May 31 and Sep 1–Oct 31; `high`: Jun 1–Aug 31 and Dec 16–Dec 31)
- [X] T010 [P] Create constants in `backend/src/domain/constants.ts`: `CAPACITY_ROOMS = 214`, `ROOM_TYPES` array with all 8 types (name, maxGuests, roomCount, rates per season from reference-data.md §2), season day counts (`low: 104`, `mid: 153`, `high: 108`), month day counts for 2026
- [X] T011 [P] Create zod validation schemas in `backend/src/domain/schemas.ts`: `bookingInputSchema` (guest with firstName/familyName/country all non-empty max 100 chars, roomType enum of 8 types, checkIn/checkOut as date strings, guests 1–4, optional price > 0, optional satisfaction 1–5 or null), `drinkSaleInputSchema` (drinkId ≥ 1, units ≥ 1, optional soldAt)
- [X] T012 Create SQL migration `backend/src/db/migrations/001_schema.sql`: tables `room_type` (id INT AUTO_INCREMENT PK, name VARCHAR(40) UNIQUE NOT NULL, max_guests TINYINT NOT NULL, room_count SMALLINT NOT NULL, rate_low/rate_mid/rate_high DECIMAL(8,2) NOT NULL), `room` (id INT AUTO_INCREMENT PK, number SMALLINT UNIQUE NOT NULL, room_type_id INT FK NOT NULL), `guest` (id INT AUTO_INCREMENT PK, first_name VARCHAR(100) NOT NULL, family_name VARCHAR(100) NOT NULL, country VARCHAR(100) NOT NULL, INDEX on country), `booking` (id INT AUTO_INCREMENT PK, guest_id INT FK NOT NULL, room_id INT FK NOT NULL, check_in DATE NOT NULL, check_out DATE NOT NULL, nights SMALLINT NOT NULL, guests TINYINT NOT NULL, season ENUM('low','mid','high') NOT NULL, year SMALLINT NOT NULL, price DECIMAL(10,2) NOT NULL, price_is_manual BOOLEAN NOT NULL DEFAULT FALSE, satisfaction TINYINT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX(room_id, check_in, check_out), INDEX(year), INDEX(guest_id)), `drink` (id INT AUTO_INCREMENT PK, name VARCHAR(100) UNIQUE NOT NULL, category ENUM('Cocktail','Coffee') NOT NULL, unit_price DECIMAL(8,2) NOT NULL), `drink_sale` (id INT AUTO_INCREMENT PK, drink_id INT FK NOT NULL, units INT NOT NULL, unit_price DECIMAL(8,2) NOT NULL, sold_at DATETIME NOT NULL, year SMALLINT NOT NULL, bartender VARCHAR(100) NOT NULL DEFAULT 'Helene Christine', INDEX(year)), `schema_migrations` (version VARCHAR(50) PK, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP). All InnoDB, utf8mb4
- [X] T013 Create SQL migration `backend/src/db/migrations/002_reference_data.sql`: INSERT the 8 room_types with exact names (`Standard Single`, `Grand Lit`, `Standard Double`, `Superior Double`, `Junior Suite`, `Spa Executive`, `Suite`, `LOFT Suite`), max_guests (1,2,2,2,3,2,4,4), room_count (44,30,58,40,16,12,8,6), rates from reference-data.md §2. INSERT 214 rooms with numbers: 101–144 (type 1), 201–230 (type 2), 301–358 (type 3), 401–440 (type 4), 501–516 (type 5), 601–612 (type 6), 701–708 (type 7), 801–806 (type 8)
- [X] T014 Create migration runner in `backend/src/db/migrate.ts`: read `db/migrations/*.sql` in order, check `schema_migrations` for applied versions, execute unapplied in order, record version
- [X] T015 Create MySQL connection pool in `backend/src/repository/mysql/pool.ts`: `mysql2/promise` createPool using config from `env.ts`, with `waitForConnections: true`, `connectionLimit: 10`, `decimalNumbers: true`
- [X] T016 Create repository interfaces in `backend/src/repository/interfaces.ts`: `BookingRepository` (findAll, findById, findByRoomInPeriod, create, update, delete, count), `GuestRepository` (create, update, deleteOrphaned), `RoomRepository` (findByType, findByNumber, findAll), `RoomTypeRepository` (findAll, findById, findByName), `DrinkRepository` (findAll, findById), `DrinkSaleRepository` (findAll, create), `UnitOfWork` (withTransaction(fn))
- [X] T017 [P] Implement `UnitOfWork` in `backend/src/repository/mysql/unit-of-work.mysql.ts`: `withTransaction` gets connection, BEGIN, passes connection to callback, COMMIT on success, ROLLBACK on error
- [X] T018 [P] Implement `RoomTypeRepository` in `backend/src/repository/mysql/room-type.mysql.ts`: `findAll` (SELECT all), `findById`, `findByName`
- [X] T019 [P] Implement `RoomRepository` in `backend/src/repository/mysql/room.mysql.ts`: `findByType` (SELECT WHERE room_type_id, with FOR UPDATE option for transactional room assignment), `findByNumber`, `findAll` with optional roomType and availability filters
- [X] T020 [P] Implement `GuestRepository` in `backend/src/repository/mysql/guest.mysql.ts`: `create` (INSERT), `update`, `deleteOrphaned` (DELETE guest WHERE id = ? AND NOT EXISTS booking)
- [X] T021 [P] Implement `DrinkRepository` in `backend/src/repository/mysql/drink.mysql.ts`: `findAll` (with optional category filter), `findById`
- [X] T022 Create Express app with wiring in `backend/src/app.ts`: create Express instance, apply JSON body parser, CORS (allow localhost:8080 and localhost:8081), OpenAPI validator middleware (`backend/src/middleware/openapi-validator.ts` using `express-openapi-validator` with request validation enabled), mount routes, error handler middleware
- [X] T023 [P] Create error handler middleware in `backend/src/middleware/error-handler.ts`: catch `DomainError` subtypes → `ValidationError` → 400 `{error:{code:"VALIDATION_ERROR",message}}`, `NotFoundError` → 404, `ConflictError` → 409. OpenAPI validation errors → 400. Unknown → 500 `INTERNAL`. JSON format per R-15
- [X] T024 [P] Create OpenAPI validator middleware in `backend/src/middleware/openapi-validator.ts`: configure `express-openapi-validator` with apiSpec path `/app/openapi.yaml`, `validateRequests: true`, `validateResponses: false` (true only in test)
- [X] T025 Create routes in `backend/src/routes.ts`: mount all controller routes under `/api` (health, bookings, room-types, rooms, drinks, drink-sales, analytics/*, reports/*)
  - Kun `/api/health` er monteret nu. Hver controller monteres i `routes.ts` og `app.ts`, når dens task laves
- [X] T026 [P] Create health controller in `backend/src/controller/health.controller.ts`: `GET /api/health` → `{status: "ok"}` (optionally ping DB pool)
- [X] T027 Create server entry point in `backend/src/server.ts`: import pool, run `migrate()`, run `seed()`, create app with DI wiring (instantiate all repositories with pool, all services with repositories, all controllers with services), `app.listen(PORT)` with pino logging
  - Wiring ligger i `createApp` i `app.ts` (jf. plan.md), så integrationstests kan genbruge den. `seed()` kobles på i `server.ts` med T037

**Checkpoint**: Foundation ready — database schema, migrations, Express app with middleware, domain modules, repository layer all in place. User story implementation can now begin.

---

## Phase 2B: Databaseskift til PostgreSQL (Blocking Prerequisites)

**Purpose**: Kunden har fravalgt MySQL (tillægsopgave uge 2). Phase 1 og 2 blev lavet mod MySQL, så T004, T005, T012–T015 og T017–T021 skal omskrives til PostgreSQL. Repository-interfaces, domæne, middleware og controllere er uændrede. Se research R-17 og data-model.md.

**⚠️ CRITICAL**: Skal være færdig før Phase 3, så der ikke skrives flere repositories mod MySQL. Lav først git-tagget `v1.0-mysql` på `main`, så uge 1-versionen kan vises til præsentationen.

- [X] T059 [P] Update `docker-compose.yml`: `db` service → `postgres:17` with `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` from `${DB_USER:-hotel}`/`${DB_PASSWORD:-hotel}`/`${DB_NAME:-hotel_kong_arthur}`, healthcheck `pg_isready -h 127.0.0.1 -U <user> -d <db>`, named volume `pg-data:/var/lib/postgresql/data` (replaces `mysql-data`), port NOT published. Rename backend env vars `MYSQL_*` → `DB_HOST`, `DB_PORT` (5432), `DB_USER`, `DB_PASSWORD`, `DB_NAME` in `backend` and `backend-test`. Update `.env.example` accordingly (drop `MYSQL_ROOT_PASSWORD`)
- [X] T060 [P] Rewrite `db/init/01-test-database.sql` for PostgreSQL: `CREATE USER hotel_test WITH PASSWORD 'hotel_test'; CREATE DATABASE hotel_kong_arthur_test OWNER hotel_test;`
- [X] T061 [P] Update `backend/src/config/env.ts`: replace `env.mysql` with `env.db` (`host`, `port` default 5432, `user`, `password`, `database`) read from `DB_*`
- [X] T062 Update `backend/package.json`: remove `mysql2`, add `pg` and devDependency `@types/pg`, regenerate `package-lock.json`. Update `backend/eslint.config.js` comments/rules if they mention `mysql2`
- [X] T063 Rewrite `backend/src/db/migrations/001_schema.sql` for PostgreSQL per data-model.md: `INTEGER GENERATED BY DEFAULT AS IDENTITY` PKs, `SMALLINT` instead of `TINYINT`, `NUMERIC` instead of `DECIMAL`, `TIMESTAMP` instead of `DATETIME`, `TEXT` + `CHECK` instead of `ENUM`, `created_at`/`updated_at` default `now()` (no `ON UPDATE`), separate `CREATE INDEX` statements, same FKs and indexes
  - Tilføjet: indexes på `room.room_type_id` og `drink_sale.drink_id`, fordi PostgreSQL ikke selv indekserer fremmednøgler
- [X] T064 Rewrite `backend/src/db/migrations/002_reference_data.sql` for PostgreSQL: same 8 `room_type` rows with explicit ids, then `SELECT setval(pg_get_serial_sequence('room_type', 'id'), 8)`, and 214 rooms via `generate_series(1, 58)` joined on `room_count` (numbers 101–144 … 801–806)
- [X] T065 Create `backend/src/repository/postgres/pool.ts`: `pg` `Pool` from `env.db` (`max: 10`), type parsers so `NUMERIC` (OID 1700) → `number` and `DATE` (OID 1082) stays `'YYYY-MM-DD'` string, `createMigrationClient()` and `pingDatabase(pool)`
  - Tilføjet: `connectionTimeoutMillis: 5000` og en `error`-lytter på pool'en. Uden dem hang requests, og backenden crashede, når databasen forsvandt (fundet under T070)
- [X] T066 Update `backend/src/db/migrate.ts` to use `createMigrationClient()` from `repository/postgres/pool.ts`: each migration file runs inside `BEGIN`/`COMMIT` (DDL is transactional in PostgreSQL), `ROLLBACK` on error, versions recorded in `schema_migrations` with `$1` placeholders
- [X] T067 Create `backend/src/repository/postgres/unit-of-work.postgres.ts`: `withTransaction` via `pool.connect()`, `BEGIN`, callback, `COMMIT`/`ROLLBACK`, `release()`. Export `executor(pool, tx)` returning the transaction's `PoolClient` or the pool
- [X] T068 [P] Port repositories to `backend/src/repository/postgres/`: `room-type.postgres.ts`, `room.postgres.ts` (`FOR UPDATE OF r`, availability with `NOT EXISTS`), `guest.postgres.ts` (`INSERT … RETURNING id`), `drink.postgres.ts`. Use `$1, $2, …` placeholders. Same interfaces as before (`repository/interfaces.ts` unchanged)
- [X] T069 Update wiring in `backend/src/app.ts` and `backend/src/server.ts` to the postgres pool, then delete `backend/src/repository/mysql/`. Verify no file imports `mysql2` and `npx tsc --noEmit` + `npx eslint .` pass
- [X] T070 Validate the switch: `docker-compose down -v && docker-compose up --build db backend frontend swagger-ui` → `db` and `backend` healthy, both migrations run once (not again after restart), 8 room types / 214 rooms / 428 guests in the database, `GET /api/health` → 200, `docker-compose --profile test run --rm backend-test` connects to `hotel_kong_arthur_test`

**Checkpoint**: Backend kører mod PostgreSQL med samme API og samme repository-interfaces. MySQL bruges ingen steder.

---

## Phase 3: User Story 2 – Værelsestyper, Kapacitet og Sæsonpriser (Priority: P1)

**Goal**: Systemet repræsenterer de 8 værelsestyper med kapacitet, sæsontakster og 214 værelser. Endpoints for room-types og rooms er tilgængelige.

**Independent Test**: `GET /api/room-types` returnerer 8 typer med korrekte takster. Sum = 214 værelser, 428 gæster.

> US2 implementeres først, fordi booking-CRUD (US1) afhænger af room-types og pricing.

### Tests for User Story 2

- [X] T028 [P] [US2] Unit test for season determination in `backend/tests/unit/seasons.test.ts`: test all season boundaries (Jan 1 → low, Feb 28 → low, Mar 1 → mid, May 31 → mid, Jun 1 → high, Aug 31 → high, Sep 1 → mid, Oct 31 → mid, Nov 1 → low, Dec 15 → low, Dec 16 → high, Dec 31 → high). Specifically: Jul 15 → high, Dec 20 → high, Dec 10 → low (acceptance scenario US2-3)
- [X] T029 [P] [US2] Unit test for pricing in `backend/tests/unit/pricing.test.ts`: test `calculatePrice(roomType, season, nights)` → Standard Double, high, 5 nights = 8000 DKK (acceptance scenario US2-2). Test all 8 types × 3 seasons. Test manual price passthrough

### Implementation for User Story 2

- [X] T030 [P] [US2] Create `PricingService` in `backend/src/service/pricing.service.ts`: `calculatePrice(roomTypeName, checkIn, nights, manualPrice?)` → uses `determineSeason(checkIn)`, looks up rate from room type, returns `{price, season, priceIsManual}`. Rule: rate × nights unless manualPrice > 0
  - Signatur: `calculatePrice(roomType: RoomType, checkIn, nights, manualPrice?)`. Taksterne kommer fra `RoomType` (databasen), så `BookingService` slår typen op én gang og bruger den til både kapacitetstjek og pris. Synkron og uden afhængigheder
- [X] T031 [US2] Create `RoomService` in `backend/src/service/room.service.ts`: `listRoomTypes()`, `getRoomType(id)`, `listRooms(filters?)` with availability check (find rooms not overlapping period). Depends on RoomTypeRepository, RoomRepository
  - Tilføjet: `tests/unit/room.service.test.ts`. `availableFrom` og `availableTo` skal angives sammen, og perioden skal være mindst én nat (ellers 400)
- [X] T032 [US2] Create `RoomController` in `backend/src/controller/room.controller.ts`: `GET /api/room-types` → array of 8 RoomType objects with `{id, name, maxGuests, roomCount, rates: {low, mid, high}}`. `GET /api/room-types/:id` → single type or 404. `GET /api/rooms` → 214 rooms with optional `?roomType=` and `?availableFrom=&availableTo=` filters
  - Testet mod kørende stack med `validateResponses: true`. Fundet: validatoren godkendte ikke-eksisterende datoer (2026-02-30 → 500). Rettet med `ajvFormats: { mode: 'full' }` i `middleware/openapi-validator.ts` (T024)

**Checkpoint**: Alle 8 værelsestyper med korrekte takster er tilgængelige. Sæsonudledning og prisberegning er unit-testet.

---

## Phase 4: User Story 1 – Administration af Bookinger (Booking-CRUD) (Priority: P1) 🎯 MVP

**Goal**: Receptionist og eksterne systemer kan oprette, se, redigere og slette bookinger med automatisk værelsestildeling, sæsonudledning, prisberegning og overlapkontrol.

**Independent Test**: POST en booking → 201 med beregnet pris og tildelt værelse. GET → booking vises. PUT → opdateret. DELETE → 204. Overlap → 409.

### Tests for User Story 1

- [ ] T033 [P] [US1] Unit test for BookingService in `backend/tests/unit/booking.service.test.ts`: test validation (checkOut ≤ checkIn → error, guests > maxGuests → error, unknown roomType → error, empty guest names → error), test room assignment (picks lowest available room number), test overlap detection (overlapping periods rejected, checkout=checkin allowed), test update (same room kept if type unchanged and available, new room if type changed, 409 if none available), test price recalculation on date/type change without manual price, test manual price preserved when provided

### Implementation for User Story 1

- [ ] T034 [US1] Implement `BookingRepository` in `backend/src/repository/postgres/booking.postgres.ts` (`$n` placeholders, `INSERT … RETURNING id`, `UPDATE` sets `updated_at = now()`): `findAll(filters)` with JOINs to guest/room/room_type (ordered by check_in DESC), `findById(id)` with JOINs, `findByRoomInPeriod(roomId, checkIn, checkOut, excludeBookingId?)` for overlap check (`check_in < :checkOut AND check_out > :checkIn`), `create(data, connection)`, `update(id, data, connection)`, `delete(id, connection)`, `count()`
- [ ] T035 [US1] Create `BookingService` in `backend/src/service/booking.service.ts`: implements full booking lifecycle:
  - `create(input)`: validate with zod schema, validate roomType exists and guests ≤ maxGuests, validate checkOut > checkIn, determine season/year/nights, calculate price (or use manual), call `assignRoom()` in transaction → INSERT guest + INSERT booking, return full booking
  - `update(id, input)`: find existing booking or 404, validate input, if roomType unchanged and current room available in new period → keep room, else find new room or 409. If dates/type changed without new manual price → recalculate. Update guest + booking in transaction
  - `delete(id)`: find or 404, DELETE booking, DELETE orphaned guest, in transaction
  - `assignRoom(roomTypeName, checkIn, checkOut, excludeBookingId?, preferredRoomId?, connection)`: SELECT rooms FOR UPDATE, find all bookings overlapping period, pick lowest available room number (prefer preferredRoomId if available), throw ConflictError if none available
  - All writes use `UnitOfWork.withTransaction` for atomicity (FR-017, NFR-008)
- [ ] T036 [US1] Create `BookingController` in `backend/src/controller/booking.controller.ts`: `GET /api/bookings` (optional ?year, ?roomType, ?country, ?season filters), `GET /api/bookings/:id`, `POST /api/bookings` → 201 + Location header, `PUT /api/bookings/:id` → 200, `DELETE /api/bookings/:id` → 204. Map DomainErrors to status codes via error middleware
- [ ] T037 [US1] Create CSV seed module in `backend/src/db/seed.ts`: if `booking` table is empty → parse `hotel_bookings_2026.csv` (csv-parse): for each row create guest, look up room by `Room Number`, map all CSV columns to booking fields (Season from CSV, price_is_manual = TRUE for all seeded bookings, Satisfaction empty → NULL). Parse `drinks_menu_with_sales.csv`: create drink + drink_sale (units = Units Sold, sold_at = 2026-12-31T23:59:59, unit_price = drink.unit_price). All in one transaction. Validate zero overlaps before commit. Log counts with pino

**Checkpoint**: Booking-CRUD er fuldt funktionel. Receptionist kan oprette, se, redigere og slette bookinger. Sæson, pris og værelse beregnes korrekt. Overlap forhindres. Seeddata indlæses.

---

## Phase 5: User Story 3 – Gæster, Landefordeling og Historisk Datagrundlag (Priority: P1)

**Goal**: 1.000 historiske bookinger og 30 drikkevarer er indlæst fra opstart. Landefordeling kan forespørges.

**Independent Test**: Efter opstart: `GET /api/bookings?year=2026` → 1000 bookinger. `GET /api/drinks` → 30 (20 Cocktail, 10 Coffee). Genstart bevarer data.

> US3's seed er implementeret i T037 (fase 4). Denne fase tilføjer det analytics-endpoint der mangler.

### Implementation for User Story 3

- [ ] T038 [US3] Extend analytics to include country distribution: the endpoint `GET /api/analytics/revenue/countries?year=` (implemented in Phase 6/US4 via T041) covers US3's requirement for country-based booking/nights/revenue breakdown. Mark US3 as covered by T037 (seed) + T041 (revenue/countries endpoint in US4)

**Checkpoint**: Historisk datagrundlag indlæst. Landefordeling tilgængelig via analytics (US4).

---

## Phase 6: User Story 4 – Hotel-Nøgletal & Indtjeningsanalyse (Priority: P1)

**Goal**: Alle hotel-nøgletal (årets indtjening, belægningsgrad, ADR, RevPAR, ALOS, tilfredshed, indtjening pr. type/sæson, indtjening pr. land, top-typer, top-lande) er tilgængelige via API.

**Independent Test**: `GET /api/analytics/summary?year=2026` → availableNights=78110, nightsSold=5379, occupancyRate≈6.89. Revenue/room-types → 8 typer med rank. Revenue/countries → lande rangeret.

### Tests for User Story 4

- [ ] T039 [P] [US4] Unit test for AnalyticsService in `backend/tests/unit/analytics.service.test.ts`: test summary calculation (revenue = Σprice, occupancy = nights/availableNights×100, ADR = revenue/nights, RevPAR = revenue/availableNights, ALOS = AVG(nights)). Test division by zero (0 bookings → all 0, no NaN). Test satisfaction average (only non-null, 0 responses → average 0). Test revenue by room type (groups by type and season, rank by total revenue). Test revenue by country (rank by revenue, includes bookings/nights/guests count). Test occupancy by season (low 104 days, mid 153 days, high 108 days × 214 rooms) and by month

### Implementation for User Story 4

- [ ] T040 [US4] Create `AnalyticsService` in `backend/src/service/analytics.service.ts`: pure functions that take booking/drink-sale rows and compute:
  - `getSummary(bookings[], year)`: totalRevenue, totalBookings, nightsSold, availableNights (214 × daysInYear), occupancyRate, ADR, RevPAR, ALOS, satisfaction {average, responses}. Division by zero → 0
  - `getRevenueByRoomType(bookings[])`: group by roomType, then by season (low/mid/high). Revenue, bookings, nights per cell. Rank 1–8 by total revenue descending. All 8 types always present (0 if no bookings)
  - `getRevenueByCountry(bookings[])`: group by country. Revenue, bookings, nights, guests. Rank by revenue descending
  - `getOccupancy(bookings[], year)`: total, bySeason (3 rows), byMonth (12 rows). availableNights = 214 × days in period. occupancyRate = nightsSold / availableNights × 100
  - `getSatisfaction(bookings[])`: overall {average over non-null, responses count}, byRoomType (same per type, all 8 present)
- [ ] T041 [US4] Create `AnalyticsController` in `backend/src/controller/analytics.controller.ts`:
  - `GET /api/analytics/summary?year=` → Summary object
  - `GET /api/analytics/occupancy?year=` → Occupancy with total, bySeason, byMonth
  - `GET /api/analytics/revenue/room-types?year=` → array of 8 RoomTypeRevenue with rank, total, bySeason
  - `GET /api/analytics/revenue/countries?year=` → array of CountryRevenue with rank
  - `GET /api/analytics/satisfaction?year=` → SatisfactionReport with overall and byRoomType
  - All endpoints use BookingRepository.findAll(year) → AnalyticsService pure functions → JSON. No caching

**Checkpoint**: Alle hotel-nøgletal er tilgængelige. Belægningsgrad 2026 ≈ 6,89%. ADR, RevPAR, ALOS beregnes korrekt. Indtjening pr. type/sæson og pr. land rangeres.

---

## Phase 7: User Story 5 – Cocktailbar & Helene Christines Salgsanalyse (Priority: P2)

**Goal**: Barens 30 drinks vises, nye salg kan registreres, og barens nøgletal (total, omsætning pr. drink, cocktail/kaffe-fordeling) beregnes.

**Independent Test**: `GET /api/analytics/bar?year=2026` → totals, 30 drinks, categorySplit summerer til 100%. POST drink-sale → totals stiger.

### Implementation for User Story 5

- [ ] T042 [P] [US5] Implement `DrinkSaleRepository` in `backend/src/repository/postgres/drink-sale.postgres.ts` (`sold_at` returned as ISO date-time string): `findAll(filters)` with JOIN to drink (ordered by sold_at DESC), `create(data)` → INSERT with unit_price copied from drink.unit_price at sale time
- [ ] T043 [US5] Create `DrinkService` in `backend/src/service/drink.service.ts`: `listDrinks(category?)`, `getDrink(id)`, `listSales(filters)`, `createSale(input)` → validate drinkId exists (or NotFoundError 404), validate units ≥ 1, copy unit_price from drink, default soldAt to now, derive year from soldAt, insert
- [ ] T044 [US5] Create `DrinkController` in `backend/src/controller/drink.controller.ts`: `GET /api/drinks` (?category), `GET /api/drinks/:id`, `GET /api/drink-sales` (?year, ?drinkId), `POST /api/drink-sales` → 201 + Location
- [ ] T045 [US5] Add bar analytics to `AnalyticsService` in `backend/src/service/analytics.service.ts`: `getBarAnalytics(drinkSales[], drinks[], year)` → bartender: "Helene Christine", totals {revenue: Σ(units×unitPrice), units: Σunits}, drinks (all 30 with drinkId, name, category, unitPrice, units, revenue, sorted by revenue DESC), categorySplit [{category: "Cocktail", revenue, units, revenueShare%, unitShare%}, {category: "Coffee", ...}] where shares sum to 100
- [ ] T046 [US5] Add bar analytics endpoint to `AnalyticsController`: `GET /api/analytics/bar?year=` → BarAnalytics object

**Checkpoint**: Cocktailbar-nøgletal fungerer. Helene Christines totalsalg, omsætning pr. drink og procentfordeling beregnes korrekt.

---

## Phase 8: User Story 6 – Live-Data Pipeline til Interaktivt Tableau Dashboard (Priority: P2)

**Goal**: Rapport-endpoints leverer fakta-tabeller til Tableau. WDC 3.0-connector pakkes. Tableau-workbook er klar.

**Independent Test**: Opret booking i frontend → `GET /api/reports/bookings?year=2026` → ny booking med i fakta-tabellen. CSV-backup fungerer.

### Implementation for User Story 6

- [ ] T047 [P] [US6] Create `ReportService` in `backend/src/service/report.service.ts`: `getBookingsReport(year)` → array of BookingFact (bookingId, year, month (from checkIn), season, checkIn, checkOut, roomType, roomNumber, country, guests, nights, price, satisfaction). `getDrinkSalesReport(year)` → array of DrinkSaleFact (saleId, year, soldAt, drinkName, category, units, unitPrice, revenue, bartender)
- [ ] T048 [US6] Create `ReportController` in `backend/src/controller/report.controller.ts`: `GET /api/reports/bookings?year=&format=` → JSON array of BookingFact or CSV (text/csv with header row). `GET /api/reports/drink-sales?year=&format=` → JSON array of DrinkSaleFact or CSV. CSV serialization: comma-separated, quoted strings
- [ ] T049 [US6] Create frontend booking-UI in `frontend/`: `frontend/Dockerfile` (nginx:alpine, copy static files), `frontend/nginx.conf` (serve `/` → static files, `location /api/ { proxy_pass http://backend:3000; }`), `frontend/index.html` (booking list table + create/edit form + delete button), `frontend/css/styles.css`, `frontend/js/api.js` (fetch wrapper for /api/* endpoints), `frontend/js/bookings.js` (UI logic: load bookings, render table, handle create/edit/delete forms, show validation errors — NO business rules, price/season/room come from API response)
  - Delvist: `frontend/Dockerfile` og `frontend/nginx.conf` er lavet. Mangler: selve booking-UI'et
- [ ] T050 [P] [US6] Create Tableau WDC 3.0 connector scaffold in `tableau-connector/`: `tableau-connector/package.json` (dependency: `@tableau/taco-toolkit`), `tableau-connector/Dockerfile` (node:22, npm ci, taco build && taco pack → dist/*.taco, exit 0), `tableau-connector/connector.json` (name: "Hotel Kong Arthur", allowed URLs: http://localhost:3000), `tableau-connector/app/` (simple UI: year input default 2026, backend URL default http://localhost:3000), `tableau-connector/handlers/fetcher.ts` (calls GET /api/reports/bookings, /api/analytics/summary, /api/analytics/revenue/room-types, /api/analytics/revenue/countries, /api/analytics/occupancy, /api/analytics/satisfaction, /api/analytics/bar), `tableau-connector/handlers/parser.ts` (maps JSON to 8 Tableau tables: bookings_fact, kpi_summary, revenue_room_type_season, revenue_country, occupancy_period, satisfaction_room_type, bar_drinks, bar_summary with schema definitions)
  - Delvist: `tableau-connector/Dockerfile` er lavet (pakker ved kørsel og kopierer `.taco` til den bind-mountede `dist/`). Mangler: selve connectoren
- [ ] T051 [P] [US6] Configure Tableau Desktop workbook in `tableau/hotel-kong-arthur.twb`: Connect to backend via WDC 3.0 (or CSV report fallback), create interactive dashboards covering all required visuals (country distribution map/chart, revenue by room type and season, top room types/countries, hotel KPI cards [total revenue, occupancy %, satisfaction, ADR, RevPAR, ALOS], and cocktail bar dashboard [Helene Christine total sales, revenue per drink, cocktail vs. coffee % split]). Include Tableau guide in `tableau/README.md` with data source refresh instructions

**Checkpoint**: Rapport-endpoints leverer fakta-tabeller. Frontend viser bookinger med CRUD. WDC-connector pakkes. Alt data er live via REST API.

---

## Phase 8B: User Story 7 – Nøgletal i Frontenden direkte fra API'et (Priority: P1)

**Goal**: Hotellets og barens nøgletal kan aflæses i frontend-prototypen og læses direkte som JSON i API'et, uden Tableau (tillægsopgave uge 2). Dækker FR-002, FR-019 og SC-008.

**Independent Test**: Åbn `http://localhost:8080/analytics.html`, vælg 2026, og sammenlign hver værdi med `/api/analytics/*` (quickstart scenarie 11).

> API-delen af kravet er dækket af T041 og T046 (analytics-endpoints i kontrakten). Denne fase tilføjer visningen.

### Implementation for User Story 7

- [ ] T071 [US7] Create `frontend/analytics.html`: year selector (default 2026), sections for KPI cards (revenue, occupancy, ADR, RevPAR, ALOS, satisfaction), occupancy by season and month, revenue by room type × season with rank, revenue by country with rank, satisfaction by room type, and bar (Helene Christine totals, revenue per drink, Cocktail/Coffee split in %). Add navigation links between `index.html` and `analytics.html`
- [ ] T072 [US7] Create `frontend/js/analytics.js`: on load and on year change call `GET /api/analytics/summary`, `/occupancy`, `/revenue/room-types`, `/revenue/countries`, `/satisfaction` and `/bar` via `frontend/js/api.js`, render cards and tables. Only formatting (DKK, %, decimals) is allowed in the frontend — NO calculations. Show 0 values for years without data and an error message if the API fails
- [ ] T073 [P] [US7] Add styles for KPI cards and analytics tables in `frontend/css/styles.css`
- [ ] T074 [US7] Validate quickstart scenario 11: values match the API for 2026, a new 40.000 DKK booking increases revenue by exactly 40.000 DKK after reload, 2030 shows 0 values

**Checkpoint**: Alle nøgletal fra SC-004 og SC-005 kan aflæses i frontenden og er identiske med API'ets svar (SC-008).

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Integration tests, dokumentation, oprydning og kvalitetskontrol

- [ ] T052 [P] Create integration test for seed in `backend/tests/integration/seed.test.ts`: verify 1000 bookings, 5379 total nights, 0 overlaps, 8 room types with sum 214 rooms/428 guests, 30 drinks (20 Cocktail, 10 Coffee), 30 drink_sales. Verify occupancy ≈ 6.89%
- [ ] T053 [P] Create integration test for booking API in `backend/tests/integration/bookings.api.test.ts`: POST valid booking → 201 with correct season/price/room, POST invalid → 400, POST overlap → 409, GET → list, GET/:id → single, PUT → updated, DELETE → 204 then 404. Enable `validateResponses: true` in openapi-validator for contract compliance
- [ ] T054 [P] Create integration test for analytics API in `backend/tests/integration/analytics.api.test.ts`: summary returns correct structure, occupancy returns bySeason/byMonth, revenue/room-types returns 8 entries with ranks, revenue/countries ranked, satisfaction with responses count, bar with 30 drinks and categorySplit summing to 100. All validated against OpenAPI schema
- [ ] T055 Write `README.md` at repository root: project description, architecture diagram (mermaid matching plan.md), prerequisites (Docker, Node.js optional for local dev, Tableau Desktop for WDC), quick start (`git clone && docker-compose up`), URL table (8080 frontend, 8081 Swagger, 3000 API), request flow explanation (frontend → nginx → Express controller → service → repository → PostgreSQL → response), the frontend analytics page, the MySQL → PostgreSQL switch as the concrete example of substitutability (tillægsspørgsmål 5), layer responsibilities and substitutability explanation, domain definitions (seasons, rates, capacity), testing instructions, Tableau WDC setup instructions, and a dedicated SWA Exam Preparation section answering all 10 Tillægsspørgsmål (architecture, request flow, 3-tier boundaries, business logic placement, substitutability, REST design, OpenAPI contract, Docker orchestration/startup/persistence, static-to-live pipeline, AI ownership/decisions)
- [ ] T056 [P] Write `CONTRIBUTE.md` at repository root: git workflow (branch + PR), coding standards (TypeScript, ESLint/Prettier), commit message format, how to add a migration, how to add an endpoint (controller → service → repository pattern)
- [ ] T057 [P] ESLint/Prettier configuration and lint pass: configure `backend/eslint.config.js` with TypeScript rules including `import/no-restricted-paths` (enforce layer boundaries: controller cannot import repository, service cannot import express/pg; only `repository/postgres` may import `pg`), run `npx eslint --fix` and `npx prettier --write` on all source files
- [ ] T058 Run quickstart.md validation: execute all 10 scenarios from `specs/001-hotel-analytics-platform/quickstart.md` against running system and verify expected results

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **PostgreSQL (Phase 2B)**: Depends on Phase 2 and the `v1.0-mysql` git tag — BLOCKS all user stories
- **US2 (Phase 3)**: Depends on Phase 2B — BLOCKS US1 (booking-CRUD needs room types and pricing)
- **US1 (Phase 4)**: Depends on US2 (Phase 3) — uses PricingService and room assignment
- **US3 (Phase 5)**: Depends on US1 (Phase 4) — seed is in T037, country analytics in US4
- **US4 (Phase 6)**: Depends on US1 (Phase 4) — analytics uses booking data
- **US5 (Phase 7)**: Depends on Foundational (Phase 2) — independent of hotel bookings
- **US6 (Phase 8)**: Depends on US1 + US4 + US5 — report endpoints need all data and analytics
- **US7 (Phase 8B)**: Depends on US4 + US5 (analytics endpoints) and T049 (frontend base and `api.js`)
- **Polish (Phase 9)**: Depends on all user stories

### User Story Dependencies

- **US2 (P1)**: Can start after Foundational — No dependencies on other stories
- **US1 (P1)**: Depends on US2 (needs room types and pricing)
- **US3 (P1)**: Covered by US1 seed (T037) + US4 analytics (T041)
- **US4 (P1)**: Can start after US1 — reads booking data, independent analytics logic
- **US5 (P2)**: Can start after Foundational — independent of hotel bookings
- **US6 (P2)**: Depends on US1 + US4 + US5 (report endpoints need all services)
- **US7 (P1)**: Depends on US4 + US5 endpoints and T049. Independent of Tableau (US6)

### Within Each User Story

- Tests FIRST, ensure they FAIL before implementation
- Domain/types before services
- Services before controllers
- Repository implementations before services that use them
- Commit after each task or logical group

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003, T004, T005, T006)
- Phase 2B: Docker/config (T059, T060, T061) can run in parallel with the backend port (T062–T068)
- All Foundational tasks marked [P] can run in parallel (T008, T009, T010, T011, T017–T021, T023, T024, T026)
- US2 tests (T028, T029) can run in parallel
- US5 can run in parallel with US4 (after Phase 2)
- US6 frontend (T049), WDC (T050), and report service (T047) can start in parallel

---

## Parallel Example: Phase 2 (Foundational)

```text
# Launch all parallel domain modules together:
Task: "T008 Create domain errors in backend/src/domain/errors.ts"
Task: "T009 Create seasons module in backend/src/domain/seasons.ts"
Task: "T010 Create constants in backend/src/domain/constants.ts"
Task: "T011 Create zod schemas in backend/src/domain/schemas.ts"

# Launch all parallel repository implementations together (after T016):
Task: "T017 Implement UnitOfWork in backend/src/repository/mysql/unit-of-work.mysql.ts"
Task: "T018 Implement RoomTypeRepository in backend/src/repository/mysql/room-type.mysql.ts"
Task: "T019 Implement RoomRepository in backend/src/repository/mysql/room.mysql.ts"
Task: "T020 Implement GuestRepository in backend/src/repository/mysql/guest.mysql.ts"
Task: "T021 Implement DrinkRepository in backend/src/repository/mysql/drink.mysql.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1+2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 2 (room types + pricing)
4. Complete Phase 4: User Story 1 (booking-CRUD + seed)
5. **STOP and VALIDATE**: Bookings work, seed loads 1000 bookings, overlap rejected
6. Deploy/demo if ready — receptionist can manage bookings

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US2 → Room types and pricing verified
3. US1 → Booking-CRUD + seed → **MVP!** Demo bookings
4. US4 → Hotel analytics → Demo nøgletal
5. US5 → Cocktailbar → Demo barsalg (kan køre parallelt med US4)
6. US6 → Reports + Frontend + Tableau → Full demo
7. Polish → Tests, docs, lint

### Parallel Team Strategy

With 4 developers (Oscar, Sebastian, Astrid, Rosalina):

1. Team completes Setup + Foundational together
2. Phase 2B (PostgreSQL): Astrid T059–T061 (Docker og config), Oscar T062–T070 (backend). Rosalina tjekker, at kontrakten er uændret
3. Once Phase 2B is done:
   - Developer A: US2 → US1 (critical path)
   - Developer B: US5 (independent cocktailbar track)
4. After US1 complete:
   - Developer A: US4 (hotel analytics)
   - Developer C: US6 frontend (T049), then US7 analytics page (T071–T074)
   - Developer D: US6 WDC connector (T050) & Tableau Desktop workbook/dashboard configuration (T051)
5. Polish phase: all contribute to tests, docs, README (ensuring active git commits from all 4 members per NFR-014)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All file paths, constraints, and validation rules reference spec.md, data-model.md, contracts/openapi.yaml, and reference-data.md
- Constraint values quoted verbatim: 214 rooms, 428 guests, 78110 available nights, 8 room types, 3 seasons, capacity NEVER scaled

