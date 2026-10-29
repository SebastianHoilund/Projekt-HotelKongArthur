# Research: Hotel Kong Arthur – tekniske beslutninger

**Feature**: `001-hotel-analytics-platform` | **Date**: 2026-10-29 | **Plan**: [plan.md](plan.md)

Alle punkter fra Technical Context er afklaret. Der er ingen udestående `NEEDS CLARIFICATION`.

---

## R-01 Backend-sprog og framework

- **Decision**: Node.js 22 LTS + TypeScript 5 + Express 4.
- **Rationale**: Gruppen har valgt det. TypeScript giver typer på tværs af lag og DTO'er. Express er minimalt, så 3-lagsstrukturen skal laves eksplicit. Det gør lagene synlige og nemme at forklare (tillægsspørgsmål 3). WDC 3.0 SDK'et er også Node/TypeScript, så hele gruppen arbejder i ét sprog.
- **Alternatives considered**: Java/Spring Boot (giver lagene "gratis", men tungere build og mindre kontrol), NestJS (mere magi med decorators og DI, sværere at forklare), Python/FastAPI, .NET.

## R-02 Dataadgang: rå SQL med `mysql2` frem for ORM

- **Decision**: `mysql2/promise` med parametriserede forespørgsler i et håndskrevet repository-lag. Ingen ORM.
- **Rationale**: Repository-laget bliver tydeligt afgrænset, og al SQL står ét sted. Det opfylder NFR-011 (parametriserede forespørgsler). `SELECT … FOR UPDATE` og transaktioner er nemme at styre eksplicit. Ved udskiftning af databasen skal kun `repository/mysql/*` og `db/migrations` ændres.
- **Alternatives considered**: Prisma (eget migrationsformat, transaktioner med rækkelåse er mere besværlige), TypeORM / Sequelize (blander entity-modeller og dataadgang, svækker lagadskillelsen), Knex (en mellemting, men ekstra afhængighed uden stor gevinst).

## R-03 Kontrakt-først OpenAPI og validering

- **Decision**: Håndskrevet `api/openapi.yaml` (OpenAPI 3.1) er den bindende kontrakt. `express-openapi-validator` validerer alle requests i drift og alle responses i test. `swagger-ui`-containeren mountes med den samme fil.
- **Rationale**: Én fil bruges af tre ting: Swagger UI, runtime-validering og kontrakttest. Afviger implementeringen fra kontrakten, fejler testen (tillægsspørgsmål 7). Kontrakten kan skrives færdig før koden, som spec-kit-workflowet foreskriver.
- **Alternatives considered**: Generere spec fra kode med `tsoa` eller `swagger-jsdoc` (kode-først, kræver decorators/kommentarer, og kontrakten findes ikke før koden), `zod-to-openapi` (to kilder at holde synkrone).

## R-04 Inputvalidering

- **Decision**: To niveauer. (1) `express-openapi-validator` fanger strukturfejl (manglende felter, forkerte typer, datoformat) → 400. (2) `zod`-skemaer og domæneregler i service-laget (udtjekning efter indtjekning, kapacitet pr. type, gyldig værelsestype, overlap) → `ValidationError` (400) eller `ConflictError` (409).
- **Rationale**: Forretningsreglerne skal ligge i service-laget (constitution IV), så de også gælder, hvis controlleren udskiftes. Service-laget kan unit-testes uden HTTP.
- **Alternatives considered**: Kun OpenAPI-validering (forretningsregler kan ikke udtrykkes i JSON Schema), validering i controller (bryder lagdelingen).

## R-05 Overlap og samtidighed (FR-017, NFR-008)

- **Decision**: `BookingService.create/update` kører i én transaktion via `UnitOfWork.withTransaction`:
  1. `SELECT id, number FROM room WHERE room_type_id = ? ORDER BY number FOR UPDATE` låser alle værelser af typen.
  2. Hent bookinger for de værelser, der overlapper perioden (`check_in < :co AND check_out > :ci`, ekskl. bookingen selv ved update).
  3. Service vælger værelse: ved update beholdes nuværende værelse, hvis typen er uændret og værelset er ledigt. Ellers vælges laveste ledige værelsesnummer. Er intet ledigt → `ConflictError` (409).
  4. Insert/update, commit.
- **Rationale**: Låsen på værelserne af typen serialiserer samtidige bookinger på samme type, så to requests ikke kan vælge samme ledige værelse. Låsen er lille (højst 58 rækker) og påvirker ikke andre typer. Reglen og valget af værelse er ren TypeScript og kan unit-testes.
- **Alternatives considered**: Unik constraint (kan ikke udtrykke intervaloverlap i MySQL), trigger (forretningslogik i DB, i strid med constitution), `SERIALIZABLE`-isolation på hele transaktionen (risiko for deadlocks og unødigt brede låse), optimistisk retry (mere kode).

## R-06 Sæson, pris og år beregnes i service-laget og gemmes

- **Decision**: `domain/seasons.ts` indeholder sæsonperioderne fra reference-data.md (low: 01-01–02-28 og 11-01–12-15; mid: 03-01–05-31 og 09-01–10-31; high: 06-01–08-31 og 12-16–12-31), opslået på måned og dag. `room_type` i DB har `rate_low/mid/high`, seedet fra reference-data. `BookingService` udregner `season`, `nights`, `year` og `price` og gemmer dem som almindelige kolonner.
- **Rationale**: Reglerne bliver ét sted og er unit-testbare. At gemme de udledte værdier gør analytics-forespørgsler enkle og bevarer historiske værdier (CSV'ens `Season` og `Price` bevares uændret). Taksterne ligger i DB, så de kan vises via `/api/room-types`.
- **Manuel pris**: Request-feltet `price` (> 0) gemmes som manuel pris og sætter `price_is_manual = true`. Ved update, hvor datoer eller type ændres uden ny `price`, genberegnes efter taksten, og `price_is_manual = false` (clarification 2).
- **Alternatives considered**: MySQL generated columns for `nights` og `year` (lille logik i DB, men to steder at kigge), en `season`-tabel med perioder (mere fleksibel, men kun ét år er i scope).

## R-07 Placering af nøgletalsberegninger (tillægsspørgsmål 4)

- **Decision**: Repository returnerer række-niveau-data for det valgte år (én JOIN over `booking`, `guest`, `room`, `room_type`). `AnalyticsService` laver gruppering, summer, gennemsnit, procenter, rangering og division-med-nul-håndtering i TypeScript (rene funktioner).
- **Rationale**: Al nøgletalslogik er samlet i service-laget, som constitution IV kræver. Den kan unit-testes med faste rækker, f.eks. at 5.379 / 78.110 giver 6,89 %. Med ~1.000 rækker tager beregningen få millisekunder (NFR-007).
- **Kendt svaghed**: Ved hundredtusindvis af bookinger ville det være bedre at lade SQL lave `GROUP BY`. Det er et oplagt svar på tillægsspørgsmål 10.
- **Alternatives considered**: `GROUP BY` i repository (hurtigere, men formler og definitioner bliver delt mellem SQL og service), views og stored procedures (forbudt i constitution), beregning i Tableau (forbudt, og andre klienter får andre tal).

## R-08 Definitioner i nøgletal

- **Omsætning**: `SUM(price)` for bookinger med `year = ?`. Hele bookingen henføres til indtjekningens år, sæson og måned (clarification 3).
- **Belægningsgrad**: `SUM(nights) ÷ (214 × dage i perioden) × 100`. Dage: år = 365 (2026), sæson = low 104 / mid 153 / high 108, måned = antal dage i måneden. Beregnes ud fra `seasons.ts`, så summen altid passer med året.
- **ADR**: omsætning ÷ solgte nætter (0, hvis ingen nætter). **RevPAR**: omsætning ÷ tilgængelige nætter. **ALOS**: `AVG(nights)` pr. booking (0, hvis ingen).
- **Tilfredshed**: `AVG(satisfaction)` over bookinger med satisfaction ≠ NULL samt `responses` = antal. 0 svar giver `average = 0`.
- **Bar**: omsætning = `SUM(units × unit_price)` over `drink_sale` for året. Fordeling i % pr. kategori på både omsætning og enheder.
- **Afrunding**: Beløb returneres med 2 decimaler, procenter med 2 decimaler. Ingen afrunding før summering.

## R-09 Seed og migrationer (FR-013, constitution III)

- **Decision**: Backenden kører ved opstart:
  1. `migrate.ts`: kører `db/migrations/*.sql` i rækkefølge, registreret i `schema_migrations`. 002 indsætter 8 værelsestyper og 214 værelser.
  2. `seed.ts`: hvis `SELECT COUNT(*) FROM booking` = 0, parses de to CSV-filer (`csv-parse`), og alt indsættes i én transaktion. For hver booking oprettes en `guest`. `room_id` slås op fra `Room Number`. `Satisfaction` tom → NULL. Seed validerer, at der ikke er overlap, inden commit, ellers afbrydes opstarten med fejl. Drinks: én `drink`-række og én `drink_sale` (`sold_at = 2026-12-31 23:59:59`, `units = Units Sold`) pr. drink.
- **Rationale**: Idempotent: kører kun på tom DB og deler aldrig data op ved genstart. CSV-parsing i TypeScript er testbar. Filerne mountes read-only fra repo-roden, så der ikke ligger kopier.
- **Alternatives considered**: `docker-entrypoint-initdb.d` med `LOAD DATA INFILE` (kører kun på tomt volume, hvilket er fint, men værelsesopslag, guest-normalisering og overlap-validering ville kræve SQL-logik), separat seed-container (en ekstra komponent).

## R-10 Tableau-integration: Web Data Connector 3.0

- **Decision**: Et WDC 3.0-projekt (`@tableau/taco-toolkit`) i `tableau-connector/`. Fetcheren kalder backendens JSON-endpoints, parseren mapper til 8 Tableau-tabeller (se plan.md). Pakkes til `.taco` af en engangscontainer `wdc-build` og indlæses i Tableau Desktop.
- **Rationale**: Opgaven kræver, at dashboardet laves "med udgangspunkt i backendens REST API", og at data er live (tillægsspørgsmål 9). WDC 3.0 er Tableaus egen mekanisme til web-API'er: Tableau kalder REST, og refresh henter friske tal. Ingen direkte DB-adgang. SDK'et er Node/TypeScript ligesom backenden.
- **Risici og afbødning**:
  - Kræver Tableau Desktop 2023.1+ (ikke Tableau Public). Afbødning: alle bruger Tableau for Students-licens. Verificeres i task 1 af Tableau-sporet.
  - Usigneret connector kræver startflag `-DDisableVerifyConnectorPluginSignature=true` og `-DConnectPluginsPath=…`. Dokumenteres i quickstart og README.
  - Tilladte URL'er skal erklæres i `connector.json`. `http://localhost:3000` tilføjes. Den præcise syntaks verificeres mod SDK-versionen ved implement.
  - Backup: `/api/reports/bookings?format=csv` m.fl. kan hentes som fil og åbnes i Tableau, hvis WDC fejler på demomaskinen.
- **Alternatives considered**: OData-connector (indbygget i Tableau, men kræver OData-protokol med `$metadata` i Express), kun CSV-endpoints (Tableau Desktop kan ikke læse en URL direkte, så data bliver statisk), WDC 2.0 (forældet), direkte MySQL-connector (forbudt i opgave og constitution).

## R-11 Datastruktur til Tableau: fakta + færdige KPI'er

- **Decision**: `/api/reports/bookings` leverer én række pr. booking med alle dimensioner og målinger, der er udledt af backenden (`year`, `month`, `season`, `roomType`, `country`, `nights`, `price`, `satisfaction`). KPI-endpoints leverer færdige tal.
- **Rationale**: Et interaktivt dashboard kræver række-data for at kunne filtrere og vise kort. Definitionerne (sæson, hvilken måned en booking hører til, belægningsformel) bliver i backenden. Tableau summerer kun.
- **Alternatives considered**: Kun aggregerede endpoints (dashboardet kan ikke krydsfiltrere), kun fakta (så skulle belægningsgrad og ADR beregnes i Tableau).

## R-12 Frontend

- **Decision**: Vanilla HTML/CSS/JS (ES-moduler) på `nginx:alpine`. Nginx proxier `/api/` til `http://backend:3000`.
- **Rationale**: Ingen build-trin, én lille container, og det er nemt at følge et request fra klik til MySQL (tillægsspørgsmål 2). Samme origin som API'et, så CORS ikke er nødvendigt for frontenden. Frontenden indeholder ingen forretningsregler: pris, sæson og værelse kommer fra API-svaret.
- **Alternatives considered**: React/Vite (build-trin og flere afhængigheder for én side), server-renderet frontend i backenden (blander præsentationsklient og API).

## R-13 CORS

- **Decision**: `cors`-middleware i backenden tillader `http://localhost:8080` og `http://localhost:8081` (Swagger "Try it out"). Kun GET er tilladt fra andre origins.
- **Rationale**: Swagger UI kører på en anden port og kalder API'et fra browseren. WDC-handlers kører i Tableaus Node-runtime og er ikke omfattet af CORS.
- **Alternatives considered**: `origin: *` (for bredt til skrive-endpoints).

## R-14 Test

- **Decision**:
  - Unit (Vitest): `seasons`, `pricing`, `BookingService` (validering, værelsestildeling, overlap inkl. "udtjekning = indtjekning er OK", 409) og `AnalyticsService` (alle formler, division med nul). Fake repositories i hukommelsen.
  - Integration (Vitest + Supertest): mod MySQL i compose-profilen `test`, med `express-openapi-validator` `validateResponses: true`, så alle svar valideres mod kontrakten. Tjekker seed (1.000 / 30, 0 overlap, belægningsgrad ≈ 6,89 %).
- **Rationale**: Opfylder NFR-010 og constitution V. Kontrakttest sikrer overensstemmelse mellem spec og kode.
- **Alternatives considered**: Jest (langsommere med TS, kræver ts-jest), Testcontainers (ekstra afhængighed. Compose-profil genbruger den eksisterende opsætning).

## R-15 Fejlformat og statuskoder

- **Decision**: Alle fejl returneres som `{ "error": { "code": "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "INTERNAL", "message": string, "details"?: [{ "field": string, "message": string }] } }`. 200 (GET/PUT), 201 + `Location`-header (POST), 204 (DELETE), 400, 404, 409, 500 kun ved uventede fejl.
- **Rationale**: NFR-009. Ét format til frontend, eksterne systemer og test.

## R-16 Sletning af booking

- **Decision**: Hard delete (`DELETE FROM booking WHERE id = ?`). Gæsten slettes også, hvis den ikke har andre bookinger.
- **Rationale**: Spec US1-3: bookingen fjernes og indgår ikke i nøgletal, og værelset bliver ledigt. Ingen krav om historik eller fortrydelse.
- **Alternatives considered**: Soft delete med `status = cancelled` (alle forespørgsler skal huske filteret, og det er ikke efterspurgt).
