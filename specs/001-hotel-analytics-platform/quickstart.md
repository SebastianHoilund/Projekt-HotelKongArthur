# Quickstart & valideringsscenarier

**Feature**: `001-hotel-analytics-platform` | **Plan**: [plan.md](plan.md) | **Kontrakt**: [contracts/openapi.yaml](contracts/openapi.yaml) | **Datamodel**: [data-model.md](data-model.md)

Denne guide beviser end-to-end, at systemet opfylder spec'en. Scenarierne bruges i Converge-tjekket.

## Forudsætninger

- Docker Desktop (Compose v2) og Git
- Tableau Desktop 2023.1+ (Tableau for Students-licens) til scenarie 8
- `curl` og evt. `jq`
- Ledige porte: 3000 (API), 8080 (frontend), 8081 (Swagger UI)

## Start

```bash
git clone <repo-url> && cd Projekt-HotelKongArthur
docker-compose up --build
```

Forventet:
- `db` bliver `healthy` før `backend` starter (se `docker-compose ps`).
- Backend-loggen viser: migrationer kørt, seed: 1000 bookinger, 30 drinks, 30 salg.
- `wdc-build` afslutter med exit 0, og `tableau-connector/dist/*.taco` findes.
- Hele opstarten tager under 2 minutter (SC-006).

| URL | Forventet |
|---|---|
| http://localhost:8080 | Bookingliste med 1.000 bookinger |
| http://localhost:8081 | Swagger UI med "Hotel Kong Arthur API" |
| http://localhost:3000/api/health | `{"status":"ok"}` |

## Scenarier

### 1. Seed og referencedata (US2, US3 · FR-005, FR-013 · SC-002, SC-007)

```bash
curl -s localhost:3000/api/room-types | jq 'length, (map(.roomCount)|add), (map(.roomCount*.maxGuests)|add)'
# 8, 214, 428
curl -s 'localhost:3000/api/bookings?year=2026' | jq 'length, (map(.nights)|add)'
# 1000, 5379
curl -s localhost:3000/api/drinks | jq 'group_by(.category) | map({(.[0].category): length}) | add'
# {"Cocktail":20,"Coffee":10}
```

Overlap = 0 verificeres af integrationstesten `tests/integration/seed.test.ts`.

### 2. Nøgletal for 2026 (US4 · FR-011 · NFR-007)

```bash
curl -s -w '\n%{time_total}s\n' 'localhost:3000/api/analytics/summary?year=2026' | jq .
```

Forventet: `availableNights = 78110`, `nightsSold = 5379`, `occupancyRate ≈ 6.89`, `adr = revenue / 5379`, `revpar = revenue / 78110`, `satisfaction.responses = 705` og `satisfaction.average = 3.87`. Svartid under 1 s.

Tjek også `/api/analytics/occupancy`, `/revenue/room-types` (8 rækker, `rank` 1–8), `/revenue/countries` og `/satisfaction`.

### 3. Opret booking med beregnet pris (US1, US2 · FR-003, FR-004 · AS US2-2)

```bash
curl -si -X POST localhost:3000/api/bookings -H 'Content-Type: application/json' -d '{
  "guest": {"firstName":"Anna","familyName":"Jensen","country":"Denmark"},
  "roomType":"Standard Double","checkIn":"2026-07-15","checkOut":"2026-07-20","guests":2}'
```

Forventet: `201`, `Location: /api/bookings/<id>`, `season = "high"`, `nights = 5`, `price = 8000`, `priceIsManual = false`, `roomNumber` mellem 301 og 358.

Sæsongrænser: `checkIn 2026-12-20` → `high`. `checkIn 2026-12-10` → `low`.

### 4. Validering og fejl (Edge cases · NFR-009)

| Request | Forventet |
|---|---|
| `checkOut` = `checkIn` | `400 VALIDATION_ERROR` |
| `guests: 2` på `Standard Single` | `400` |
| `roomType: "Penthouse"` | `400` |
| tomt `firstName` | `400` |
| `GET/PUT/DELETE /api/bookings/999999` | `404 NOT_FOUND` |
| `GET /api/analytics/summary?year=2030` | `200` med 0-værdier (ingen `500`, ingen `NaN`) |

### 5. Overlap og fuld type (US1 AS-5 · FR-017 · SC-007)

1. Opret 6 bookinger på `LOFT Suite` 2026-03-10 → 2026-03-13 (der er 6 LOFT-værelser). Alle `201` med forskellige værelser 801–806.
2. Opret en 7. i 2026-03-12 → 2026-03-14 → `409 CONFLICT`.
3. Opret en booking 2026-03-13 → 2026-03-15 → `201`. Udtjekningsdag = indtjekningsdag er tilladt.

(Seedede LOFT-bookinger i perioden kan give 409 tidligere. Testen vælger en periode uden seed-bookinger.)

### 6. Opdatér og slet (US1 AS-2, AS-3 · clarifications 1–2)

1. `PUT` booking fra scenarie 3 med nye datoer og samme type → samme `roomNumber`, ny pris efter taksten.
2. `PUT` med `"price": 5000` → `priceIsManual = true`, `price = 5000`.
3. `PUT` med ændrede datoer uden `price` → prisen genberegnes, `priceIsManual = false`.
4. `DELETE` → `204`. `GET` → `404`. `summary.revenue` falder med bookingens pris.

### 7. Barsalg (US5 · FR-007, FR-012)

```bash
curl -s 'localhost:3000/api/analytics/bar?year=2026' | jq '.totals, .categorySplit'
curl -s -X POST localhost:3000/api/drink-sales -H 'Content-Type: application/json' -d '{"drinkId":1,"units":3}'
curl -s 'localhost:3000/api/analytics/bar?year=2026' | jq '.totals'
```

Forventet: `totals.revenue` = Σ(`Price (DKK)` × `Units Sold`) fra CSV'en. Efter POST stiger den med 3 × drinkens pris og `units` med 3. `revenueShare` og `unitShare` summerer til 100.

### 8. Tableau live via WDC 3.0 (US6 · FR-015 · SC-003–SC-005)

1. Start Tableau Desktop med connectoren:
   - macOS: `open -a "Tableau Desktop 2025.1" --args -DConnectPluginsPath="$PWD/tableau-connector/dist" -DDisableVerifyConnectorPluginSignature=true`
   - Windows: `"C:\Program Files\Tableau\Tableau 2025.1\bin\tableau.exe" -DConnectPluginsPath=<repo>\tableau-connector\dist -DDisableVerifyConnectorPluginSignature=true`
2. *Connect → To a Server → Hotel Kong Arthur (WDC)*. Vælg år 2026 og URL `http://localhost:3000`.
3. Forventet: 8 tabeller (`bookings_fact`, `kpi_summary`, `revenue_room_type_season`, `revenue_country`, `occupancy_period`, `satisfaction_room_type`, `bar_drinks`, `bar_summary`).
4. Åbn `tableau/hotel-kong-arthur.twb`. Notér årets indtjening og LOFT Suite / `high`.
5. Opret i frontenden: LOFT Suite, 2026-12-20 → 2026-12-30, 4 personer, land fx `Norway`.
6. Tableau: *Data → Refresh*. Forventet: årets indtjening, LOFT Suite `high` og Norge stiger hver med præcis **40.000 DKK** (US6 AS-1).

**Backup uden WDC**: `curl -o bookings.csv 'localhost:3000/api/reports/bookings?year=2026&format=csv'` og åbn filen i Tableau (*Text file*).

### 9. Persistens og idempotent seed (US3 AS-2 · NFR-006)

```bash
docker-compose down && docker-compose up -d
curl -s 'localhost:3000/api/bookings?year=2026' | jq length   # 1000 + nye bookinger, ingen dubletter
docker-compose down -v && docker-compose up -d                  # nulstil → 1000 igen
```

### 10. Tests og kontrakt (NFR-010 · constitution V)

```bash
cd backend && npm ci && npm test                                    # unit
docker-compose --profile test run --rm backend-test                 # integration + responsvalidering mod openapi.yaml
```

Forventet: alle tests grønne. Ingen response afviger fra `api/openapi.yaml`.
