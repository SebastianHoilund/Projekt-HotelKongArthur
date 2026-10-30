# Implement-status: Docker og OpenAPI/Swagger

**Dato**: 2026-10-30 | **Ansvarsområder**: Docker og docker-compose (Astrid), OpenAPI og Swagger (Rosalina)

**Sammenlignet med**: [spec.md](spec.md), [plan.md](plan.md), [tasks.md](tasks.md), [quickstart.md](quickstart.md)

## Kort status

Docker- og OpenAPI-opsætningen er lavet og testet, men kun med en midlertidig stub-backend. Hele systemet kan ikke startes endnu, fordi backend-koden (T002 m.fl.) og Tableau-connectoren (T050) mangler.

Ændringerne er ikke committet endnu.

## Udførte steps

| # | Step | Resultat |
|---|---|---|
| 1 | Kørte `check-prerequisites.sh` og tjekkede checklisten | Fandt feature-mappen. `requirements.md` er 40/40. Ingen extension hooks |
| 2 | Læste tasks, plan, kontrakt, quickstart og projektplan og afgrænsede scope | Valgte T003, T004, T005, T006 og T024 samt Docker-delen af T001, T049 og T050 |
| 3 | Rettede ignore-filer | `.env.example` var skjult af `*.env*` i `.gitignore` og er nu undtaget. `.dockerignore` er oprettet i `backend/`, `frontend/` og `tableau-connector/` |
| 4 | Oprettede kontrakt, compose-fil, Dockerfiles, nginx-konfiguration, `env.ts` og validator-middleware | Se [Oprettede filer](#oprettede-filer) |
| 5 | Validerede compose-filen og kontrakten | `docker compose config` gik igennem. Kontrakten gav kun lint-fund om manglende `security` og `summary` samt advarsler (se [Åbne punkter](#åbne-punkter)) |
| 6 | Testede hele compose-stakken med stub-backend og falsk `taco` | Se [Testresultater](#testresultater) |
| 7 | Rettede fejl fra testen | `db` stoppede med exit 126 på et shell-script i `db/init/`. Scriptet blev erstattet af en SQL-fil |
| 8 | Ryddede op og opdaterede dokumenterne | Stub, containere, volumes og images er fjernet. `tasks.md` og `plan.md` er opdateret |

### Oprettede filer

```text
docker-compose.yml
.env.example
api/openapi.yaml
db/init/01-test-database.sql
backend/Dockerfile
backend/.dockerignore
backend/src/config/env.ts
backend/src/middleware/openapi-validator.ts
frontend/Dockerfile
frontend/.dockerignore
frontend/nginx.conf
tableau-connector/Dockerfile
tableau-connector/.dockerignore
```

Ændrede filer: `.gitignore`, `specs/001-hotel-analytics-platform/plan.md` og `specs/001-hotel-analytics-platform/tasks.md`.

## Status på tasks

| Task | Status | Bemærkning |
|---|---|---|
| T003 OpenAPI-kontrakt | ✅ Færdig | Præcis kopi af `contracts/openapi.yaml` |
| T004 `.env.example` og `env.ts` | ✅ Færdig | Tilføjet `MYSQL_ROOT_PASSWORD`, `DATA_DIR` og `OPENAPI_PATH` |
| T005 `docker-compose.yml` | ✅ Færdig | Alle 6 services |
| T006 `backend/Dockerfile` | ✅ Færdig | Stages: `build`, `test`, `runtime` |
| T024 OpenAPI-validator | ✅ Færdig | Skal kobles på i `app.ts` (T022) |
| T001 Projektstruktur | 🟡 Delvis | Mangler `tableau/` og `CONTRIBUTE.md` |
| T049 Frontend | 🟡 Delvis | Dockerfile og `nginx.conf` er lavet. Booking-UI mangler |
| T050 WDC-connector | 🟡 Delvis | Dockerfile er lavet. Selve connectoren mangler |

De øvrige tasks er uden for de to ansvarsområder og er ikke påbegyndt.

## Sammenligning med spec

| Krav | Status | Begrundelse |
|---|---|---|
| NFR-003 Kontrakt i OpenAPI, Swagger UI i container | 🟡 Delvist opfyldt | Kontrakten og Swagger UI kører. At implementeringen stemmer med kontrakten kan først vises med T053 og T054 |
| FR-014 OpenAPI og Swagger UI (via plan.md) | ✅ Opfyldt for det der findes | Alle planlagte endpoints er beskrevet i kontrakten, men de fleste er ikke implementeret |
| NFR-005 Én `docker-compose up` med styret opstartsrækkefølge | 🟡 Delvist opfyldt | Rækkefølgen `db` → `backend` → `frontend` er vist med stub. Kommandoen fejler i repoet, indtil T002 og T050 er lavet |
| NFR-006 Data overlever genstart | ✅ Infrastruktur testet | Testdata overlevede `down`/`up`, og `down -v` nulstillede. Bookinger er ikke testet, da de ikke findes endnu |
| NFR-015 Frisk clone starter uden fejl | ⏳ Ikke opfyldt endnu | Compose har defaults og kræver ingen `.env`, men en clean-clone-test kræver hele systemet |
| SC-006 Oppe inden for 2 minutter | ⏳ Ikke målt | Kan først måles med det rigtige seed af 1.000 bookinger |

## Sammenligning med plan

### Docker-arkitektur

| Service | Plan | Implementeret | Testet med stub |
|---|---|---|---|
| `db` | `mysql:8.4`, ingen host-port, healthcheck, volume `mysql-data` | Som planlagt, men healthcheck bruger TCP | ✅ Healthy. `docker port` viser ingen host-port |
| `backend` | Multi-stage, port 3000, venter på `db`, read-only mounts, `restart: on-failure` | Som planlagt | ✅ Healthy, kan se CSV-filer, kontrakt og migrationsmappe |
| `frontend` | `nginx:alpine`, port 8080, proxy af `/api/` | Som planlagt | ✅ Healthy, proxy virker |
| `swagger-ui` | Port 8081, `SWAGGER_JSON`, mount af `./api` | Som planlagt, version låst | ✅ Leverer kontrakten. Ikke åbnet i browser |
| `wdc-build` | Engangsjob, `.taco` i `tableau-connector/dist` | Som planlagt, men pakker ved kørsel | 🟡 Exit 0 med falsk `taco`. Den rigtige toolkit er ikke kørt |
| `backend-test` | Profil `test`, separat testdatabase | Som planlagt, med egen testbruger | ✅ Forbinder til `hotel_kong_arthur_test` |
| Netværk | `hotel-net` | Som planlagt | ✅ Containerne finder hinanden via service-navne |

### Afvigelser fra plan og tasks

| Afvigelse | Hvorfor | Opdateret i plan |
|---|---|---|
| Healthchecks bruger `127.0.0.1` i stedet for `localhost` | MySQLs midlertidige init-server svarer på socket, så `localhost` kan melde klar for tidligt | Ja |
| Ny fil `db/init/01-test-database.sql` | Plan og tasks kræver en separat testdatabase, men beskriver ikke hvordan den oprettes | Ja |
| Testdatabasen har egen bruger, `hotel_test` | Så scriptet ikke afhænger af værdierne i `.env` | Nej |
| `swaggerapi/swagger-ui:v5.17.14` i stedet for ingen version | Giver samme version ved hver opstart, og v5 understøtter OpenAPI 3.1 | Nej |
| `wdc-build` pakker ved kørsel | Et bind-mount skjuler det, der ligger i mappen i imaget, så filen skal skabes efter start | Nej |
| Ekstra variabler i `env.ts`: `DATA_DIR`, `OPENAPI_PATH` | Så stierne kan ændres, når koden køres uden for Docker | Nej |

### Constitution

| Princip | Status |
|---|---|
| II: OpenAPI er bindende og vises i Swagger UI-container | ✅ Sat op |
| II: Ingen klient tilgår MySQL direkte | ✅ Porten er ikke publiceret |
| III: Healthcheck, `service_healthy`, navngivet volume, internt netværk | ✅ Testet med stub |
| III: Idempotent seed ved tom database | ⏳ Afventer T037 |
| V: Endpoints verificeres mod kontrakten | ⏳ Validatoren er klar, testene afventer T053 og T054 |

## Testresultater

Testen kørte på en midlertidig kopi af compose-filen med stub-backend og falsk `taco`. Validatoren og kontrakten var de rigtige.

| Test | Resultat |
|---|---|
| `docker compose up --build` | Alle services startede i rigtig rækkefølge |
| `GET localhost:3000/api/health` | `200 {"status":"ok"}` (fra stub) |
| `GET localhost:8080/api/health` | `{"status":"ok"}` via nginx |
| `GET localhost:8081/` og `/openapi.yaml` | `200`, viser "Hotel Kong Arthur API" |
| `POST /api/bookings` uden `guest` | `400` fra validatoren |
| `POST /api/bookings` med gyldig body | Slap igennem validatoren (`201` fra stub) |
| `down` og `up` | Testdata bevaret |
| `down -v` og `up` | Tom database |
| `--profile test run backend-test` | Kører i `hotel_kong_arthur_test` med `NODE_ENV=test` |

**Ikke testet**: rigtig backend, migrationer og seed, rigtig `taco build`/`taco pack`, Swagger "Try it out" (kræver CORS fra T022) og opstart på Windows og Linux.

## Det videre forløb

Projektplanen havde lagene og booking-CRUD færdige i går (29/10), så backenden er det, der haster mest. Præsentationen er fredag 6/11 kl. 12.30.

### 1. Nu: Få arbejdet ind i repoet (Astrid, Rosalina)

1. Opret en feature-branch og commit ændringerne.
2. Åbn en PR. Rosalina bør reviewe T003 og T024, så begge ansvarsområder er dækket.

### 2. Backend-fundament: Det der får Docker til at virke (Oscar)

T002 og T007–T027. Følgende skal passe med Docker-opsætningen:

- `package.json` med scriptet `test:integration`, og `package-lock.json` skal committes.
- `tsc` skal bygge til `dist/server.js`.
- Migrationerne skal ligge i `src/db/migrations`, og `migrate.ts` skal finde dem relativt til sin egen fil. Dockerfilen kopierer dem til `dist/db/migrations`.
- `GET /api/health` (T026) skal svare, ellers bliver `backend` aldrig healthy, og `frontend` starter ikke.
- `app.ts` (T022) skal bruge `openApiValidator()` og tillade CORS fra port 8080 og 8081.
- Seed (T037) skal læse CSV-filerne fra `env.dataDir`.

### 3. Få `docker-compose up` til at køre (Astrid, og den der tager T050)

`wdc-build` stopper hele `docker-compose up --build`, indtil `tableau-connector/` har `package.json` og `package-lock.json`. Connectoren skal derfor have mindst et skelet tidligt. Når det og T002 er på plads, gentager Astrid testene ovenfor med den rigtige kode. Den rigtige `taco pack` skal også afprøves, især om `.taco`-filen ender i `dist/`.

### 4. Funktioner (hele gruppen)

| Rækkefølge | Tasks | Indhold |
|---|---|---|
| 1 | T028–T032 | Værelsestyper, sæson og pris |
| 2 | T033–T037 | Booking-CRUD og seed (MVP) |
| 3 | T038–T046 | Hotel-nøgletal og cocktailbar. Kan laves parallelt |
| 4 | T047–T051 | Rapporter, frontend, WDC-connector og Tableau-workbook |

### 5. Kontrol af kontrakten (Rosalina)

- Kør T053 og T054, som validerer alle svar mod `api/openapi.yaml`. Det er beviset for NFR-003.
- Tjek Swagger UI i en browser, også "Try it out", når CORS er på plads.
- Tilføj `summary` til `getRoomType`, `getDrink` og `listDrinkSales`.
- Hold de to kopier af kontrakten ens. `api/openapi.yaml` er den bindende, så en ændring der også skal kopieres til `contracts/openapi.yaml`.

### 6. Afslutning (alle)

1. Kør T058, alle 10 scenarier i [quickstart.md](quickstart.md).
2. Kør Converge og skriv resultatet i `specs/converge-result.md`.
3. Lav en clean-clone-test på en anden maskine, helst også Windows. Det beviser NFR-015 og SC-006.
4. Skriv README og CONTRIBUTE (T055, T056), inklusive Docker-svaret til tillægsspørgsmål 8.
5. Tjek at alle fire har reelle commits (NFR-014).

## Åbne punkter

| Punkt | Konsekvens | Ansvarlig |
|---|---|---|
| Backend-fundamentet er bagud i forhold til projektplanen | Blokerer alle user stories og test af hele systemet | Oscar |
| `tableau-connector/` mangler `package.json` | `docker-compose up --build` fejler | Tableau (fælles) |
| Tre operationer i kontrakten mangler `summary` | Kun kosmetisk i Swagger UI | Rosalina |
| Linteren melder manglende `security` på alle endpoints | Forventet, da login er uden for scope. Ingen handling | – |
| `db/init/` kører kun på et tomt volume | Hvis testdatabasen mangler på en maskine, kør `docker-compose down -v` | Alle |
