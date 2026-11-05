# Bidrag til Hotel Kong Arthur

## Git-workflow

1. Hent den nyeste `main`, og lav en feature-branch:
   ```bash
   git switch main && git pull
   git switch -c feature/<kort-beskrivelse>
   ```
2. Commit små, sammenhængende ændringer. Hver commit skal kunne bygges og testes.
3. Push branchen, og opret en pull request mod `main`. Ingen pusher direkte til `main`.
4. Mindst én anden i gruppen reviewer. Ejeren af området skal godkende ændringer i det:

   | Område | Ejer |
   |---|---|
   | `backend/`, `db/` | Oscar, Astrid og Rosalina |
   | `frontend/` | Sebastian |
   | `docker-compose.yml`, `Dockerfile`'r, `tableau-connector/` | Astrid |
   | `api/openapi.yaml`, Swagger | Rosalina |
   | `tableau/`, `specs/` | Fælles |

   Fordelingen følger `docs/projektplan.md`.

5. Merge, når testene er grønne, og slet branchen.

## Commit-beskeder

Første linje er kort og siger, hvad der er lavet. Henvis til Spec Kit-opgaven, hvis der er en.
Brødteksten er en kort punktliste.

```
Phase 7: cocktailbar og bar-analytics (T042–T046)

- GET/POST /api/drink-sales: prisen kopieres fra drinken
- Unit-tests for DrinkService
```

## Kodestandard

- **TypeScript** i `strict`-mode, ES-moduler med `.js`-endelser i imports.
- **ESLint** (`npm run lint`) og **Prettier** (`npx prettier --check .`) skal være rene. Lint
  håndhæver lagdelingen:
  - `controller/` og `middleware/` må ikke importere `repository/`, `db/` eller `pg`.
  - `service/` må ikke importere Express, `pg`, `repository/postgres/` eller HTTP-laget.
  - `domain/` afhænger ikke af andre lag.
  - Kun `repository/postgres/` må bruge `pg`. `app.ts` og `db/` må kun importere typer derfra.
- **Ingen forretningsregler uden for `service/` og `domain/`.** Frontenden, Tableau og
  repositories beregner ikke sæson, pris, overlap eller nøgletal.
- **Test først** for forretningslogik: skriv unit-testen i `backend/tests/unit/`, se den fejle,
  og implementér bagefter.
- Kommentarer forklarer hvorfor, ikke hvad. Skriv dem på dansk som resten af koden.

## Kør det hele før en pull request

```bash
cd backend
npm ci
npm run lint && npx prettier --check . && npx tsc --noEmit && npm test
cd ..
docker-compose --profile test run --rm backend-test   # integrationstests mod PostgreSQL
```

## Tilføj en migration

1. Opret en ny fil i `backend/src/db/migrations/` med næste nummer, fx `003_add_cancelled_at.sql`.
   Filerne køres i alfabetisk rækkefølge.
2. Skriv almindelig PostgreSQL-SQL. Hver fil kører i én transaktion og registreres i
   `schema_migrations`, så den kun kører én gang.
3. Ret aldrig en migration, der allerede er merget. Lav en ny.
4. Opdatér `specs/001-hotel-analytics-platform/data-model.md`, hvis tabellerne ændres.
5. Genstart backenden. Migrationen kører automatisk ved opstart.

## Tilføj et endpoint

Eksempel: `GET /api/guests/{id}`.

1. **Kontrakt først.** Tilføj stien og eventuelle skemaer i `api/openapi.yaml`, og kopiér filen til
   `specs/001-hotel-analytics-platform/contracts/openapi.yaml`, så de to er ens. Requests og svar
   valideres mod kontrakten, så endpointet virker ikke, før det står der.
2. **Repository.** Tilføj metoden til interfacet i `repository/interfaces.ts`, og implementér den
   i `repository/postgres/`. Kun SQL og mapping fra rækker til domæneobjekter.
3. **Service.** Tilføj logikken i `service/`, fx `GuestService.get(id)`, der kaster
   `NotFoundError`. Skriv unit-testen først med et repository i hukommelsen (se
   `tests/unit/fakes.ts`).
4. **Controller.** Tilføj ruten i `controller/`. Den læser request, kalder servicen og svarer. Brug
   `asyncHandler`, så fejl ender i `middleware/error-handler.ts`, der laver statuskode og
   fejlformat.
5. **Sammenkobling.** Opret repository og service i `app.ts`, og registrér controlleren i
   `routes.ts`.
6. **Integrationstest** i `backend/tests/integration/`, så svaret også valideres mod kontrakten.
