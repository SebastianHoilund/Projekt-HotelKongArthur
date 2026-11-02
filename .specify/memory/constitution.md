<!--
Sync Impact Report
- 2.0.0 (MAJOR): Tillægsopgave uge 2. Databasen skiftes fra MySQL til PostgreSQL efter kundens ønske,
  og nøgletallene skal også vises i prototype-frontenden (læst fra REST API'et), ikke kun i Tableau.
  - Modified principles: I (dataadgang mod PostgreSQL), II (ingen direkte DB-adgang), III (`db`-container,
    healthcheck og volume for PostgreSQL), IV (CRUD persisteres i PostgreSQL)
  - Modified sections: Teknologistak (database, præsentationsklienter, analytics-krav, README-krav)
  - Templates requiring updates: ✅ plan-, spec- og tasks-templates er databaseneutrale og uændrede
  - Dependent artifacts: spec.md, plan.md, research.md, data-model.md, quickstart.md og tasks.md opdateres
  - Follow-up TODOs: None
- 1.2.0 (MINOR): Afstemt med spec og referencedata: berigede datafiler (datoer, år, antal personer,
  værelsesnummer), referencedata som eneste kilde til sæsoner/takster/værelser, fast kapacitet
  (aldrig skaleret), forbud mod overlappende bookinger, sæson udledt af indtjekningsdato, år på alle
  data, barsalg som transaktioner, kundetilfredshed afklaret. Ingen principper fjernet.
- 1.1.0 (MINOR): Tilføjet eksterne bookingsystemers skriveadgang, nøgletal i service-laget,
  bookingvalidering, obligatoriske analytics-krav, Tableau som leverance, `specs/`-mappe,
  kodestil. Ingen principper fjernet.
- Version change: [CONSTITUTION_VERSION] (uninitialized template) → 1.0.0
- Modified principles:
  - [PRINCIPLE_1_NAME] → I. 3-Lagsarkitektur & Ansvarsadskillelse (NON-NEGOTIABLE)
  - [PRINCIPLE_2_NAME] → II. Kontrakt- & REST-Først (OpenAPI & JSON)
  - [PRINCIPLE_3_NAME] → III. Containerisering & Single-Command Drift
  - [PRINCIPLE_4_NAME] → IV. Fra Statisk til Live Data & Centraliseret Logik
  - [PRINCIPLE_5_NAME] → V. Spec-Drevet Udvikling, Testbarhed & AI-Ejerskab
- Added sections:
  - Teknologistak & Arkitektoniske Rammer
  - Udviklingsworkflow & Kvalitetskrav
- Removed sections: None
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (Constitution Check compatible)
  - ✅ .specify/templates/spec-template.md (User stories & acceptance criteria aligned)
  - ✅ .specify/templates/tasks-template.md (Story-based task organization aligned)
- Follow-up TODOs: None
-->
# Hotel Kong Arthur Constitution

## Core Principles

### I. 3-Lagsarkitektur & Ansvarsadskillelse (NON-NEGOTIABLE)
Backenden SKAL være strengt opdelt i tre klart adskilte lag med ensrettet afhængighedsretning
(`Controller/API` → `Service/Forretningslogik` → `Repository/Dataadgang` → `PostgreSQL`):
- **Præsentationslag (`controller`)**: Håndterer udelukkende HTTP-requests/responses, input-parsing,
  statuskoder og serialisering til/fra JSON. Må IKKE indeholde forretningsberegninger eller SQL.
- **Forretningslogiklag (`service`)**: Indeholder al domænelogik, validering (f.eks. datoer,
  værelseskapacitet, overbooking), sæsonprisberegning og aggregering af nøgletal.
- **Dataadgangslag (`repository`)**: Indkapsler al kommunikation med PostgreSQL-databasen.
  Lagdelingen SKAL sikre, at databasen eller præsentationslaget (frontend/eksternt bookingsystem) kan
  udskiftes uafhængigt uden at påvirke de øvrige lag.

### II. Kontrakt- & REST-Først (OpenAPI & JSON)
Al kommunikation mellem systemets klienter (prototype-frontend, Tableau, hotellets øvrige
bookingsystemer) og backend SKAL foregå gennem et RESTful HTTP API med JSON som dataformat:
- API'et SKAL dokumenteres i en OpenAPI 3.x-specifikation, som udgør den bindende kontrakt mellem
  backend og dens konsumenter.
- OpenAPI-specifikationen SKAL udstilles interaktivt via en dedikeret Swagger UI Docker-container,
  og implementeringen SKAL til enhver tid stemme overens med kontrakten.
- Ressourcer SKAL navngives med substantiver i flertal (f.eks. `/api/bookings`, `/api/rooms`,
  `/api/drink-sales`), anvende korrekte HTTP-verber (`GET`, `POST`, `PUT`, `DELETE`) og returnere
  retvisende HTTP-statuskoder (`200`, `201`, `204`, `400`, `404`, `409`).
- Ingen ekstern klient — heller ikke Tableau — må tilgå databasen direkte uden om REST API'et.
- API'et SKAL understøtte skrivning (`POST`/`PUT`/`DELETE`) af bookinger fra eksterne
  bookingsystemer, ikke kun fra prototype-frontenden.

### III. Containerisering & Single-Command Drift
Hele systemet SKAL være fuldt containeriseret og kunne startes på enhver maskine med én enkelt
`docker-compose up`-kommando uden manuelle opsætningstrin:
- Systemet SKAL som minimum omfatte containere til `db` (PostgreSQL), `backend`, `frontend` og
  `swagger-ui` forbundet via et internt Docker-netværk.
- Opstartsrækkefølgen SKAL styres deterministisk med `healthcheck` på PostgreSQL og
  `depends_on: condition: service_healthy` for backenden.
- PostgreSQL-data SKAL persisteres i et navngivet Docker-volume, så oprettede og redigerede bookinger
  overlever genstart af containere.
- Ved første opstart på en tom database SKAL skema og historiske grunddata (værelsestyper, 214
  værelser, gæster, bookinger samt cocktail-/kaffesalg) seedes automatisk fra de berigede
  datafiler (se Teknologistak). Seeding SKAL være idempotent og må ikke duplikere data.

### IV. Fra Statisk til Live Data & Centraliseret Logik
Systemet SKAL transformere de udleverede statiske CSV/XLSX-datasæt til et levende, transaktionelt
system, hvor ændringer øjeblikkeligt slår igennem i analyserne:
- Oprettelse, redigering og sletning af bookinger (CRUD) i prototype-frontenden SKAL straks
  persisteres i PostgreSQL og afspejles i API'ets nøgletals- og rapport-endpoints.
- Tableau SKAL hente opdaterede data via backendens REST API (f.eks. gennem Web Data Connector eller
  dedikerede JSON/CSV rapport-endpoints understøttet af API-kontrakten).
- Definitioner af sæsoner (lav-, mellem- og højsæson), belægningsgrad og prisberegning SKAL være
  entydigt dokumenteret og centraliseret, så nøgletal beregnes konsistent på tværs af visninger.
  Sæsoner, takster og værelsesfordeling er fastlagt i `specs/001-hotel-analytics-platform/reference-data.md`,
  som er den eneste kilde. Sæsonen udledes af bookingens indtjekningsdato.
- Hotellets kapacitet er fast (214 værelser, 78.110 værelsesnætter om året) og SKAL ALDRIG skaleres
  eller omregnes for at påvirke belægningsgraden.
- Alle bookinger og salg har et år, og alle nøgletal SKAL kunne afgrænses til et valgt år.
- Nøgletal SKAL beregnes i backendens service-lag og udstilles via API'et. Hverken databasen
  (views/procedurer) eller Tableau må indeholde selvstændig forretningslogik for nøgletal;
  Tableau viser kun de beregnede resultater.
- Bookingvalidering SKAL ligge i service-laget. To aktive bookinger må ALDRIG overlappe på samme
  værelse (udtjekningsdagen må være næste gæsts indtjekningsdag), og antal personer må ikke
  overstige værelsestypens kapacitet. Overlap forhindres også i dataadgangslaget via transaktioner.

### V. Spec-Drevet Udvikling, Testbarhed & AI-Ejerskab
Udviklingen SKAL følge GitHub Spec Kit-workflowet i rækkefølgen:
`Constitution → Specify → Clarify → Plan → Tasks → Implement → Converge`.
- **Spec før kode**: Ingen applikationskode må skrives, før `spec.md`, `plan.md` og `tasks.md` er
  færdiggjort og godkendt.
- **Testbarhed**: Kritisk forretningslogik i service-laget (prisberegning, sæsonregler,
  validering og nøgletal) SKAL verificeres med automatiserede unit-tests, og endpoints SKAL kunne
  verificeres mod OpenAPI-kontrakten.
- **AI-ejerskab**: AI-kodeagenter anvendes aktivt gennem hele processen, men gruppen SKAL have
  fuldt ejerskab over arkitektur og kode — ethvert gruppemedlem SKAL kunne forklare, begrunde og
  kritisere de valgte løsninger.

## Teknologistak & Arkitektoniske Rammer

- **Database**: PostgreSQL 17 kørende i Docker. Kunden har fravalgt MySQL (tillægsopgave uge 2). Databasen kører med automatiseret DDL-migrering og seed-import af
  `hotel_bookings_2026.csv` og `drinks_menu_with_sales.csv`. Filerne er beriget med
  indtjekning, udtjekning, år (2026), antal personer, værelsesnummer og valgfri kundetilfredshed
  (bookinger) samt år (drinks).
  Berigelsen og reglerne bag den er beskrevet i `reference-data.md`.
- **Domæneomfang**:
  - Hoteldrift: 214 værelser fordelt på 8 værelsestyper (kapacitet 1–4 personer, 428 gæster),
    sæsonafhængige takster (lav-, mellem- og højsæson), gæster med oprindelsesland og bookinger
    med datoer, antal personer og tildelt værelse.
  - Cocktailbar: Receptionist/bartender Helene Christines sortiment (20 cocktails og 10 kaffetyper)
    samt løbende salgsregistrering som enkelttransaktioner og omsætningsfordeling.
- **Referencedata**: `specs/001-hotel-analytics-platform/reference-data.md` fastlægger sæsonernes
  datoer (kun 16.–31. december er højsæson), takster pr. værelsestype og sæson, antal værelser pr.
  type samt reglerne for de berigede data. Ændringer sker kun dér.
- **Præsentationsklienter**:
  1. Browserbaseret prototype-frontend til booking-CRUD (opret, vis, redigér, slet) og visning af
     nøgletallene for hotel og cocktailbar, læst fra REST API'et.
  2. Swagger UI i Docker til interaktiv udforskning og test af REST API-kontrakten.
  3. Interaktivt Tableau-dashboard til visualisering af nøgletal for hotel og cocktailbar.
- **Obligatoriske analytics-krav** (SKAL beregnes af API'et og kunne læses direkte dér, og SKAL vises i både
  prototype-frontenden og Tableau):
  - Hotel: gæsternes lande; indtjening pr. værelsestype (pr. sæson) og pr. land; hvilke værelser og
    lande der indtjener mest; årets samlede indtjening; belægningsgrad; kundetilfredshed
    (data har ingen rating, så den ligger som opfundet, valgfri score 1–5 i datafilen, hvor NULL
    betyder ingen besvarelse); samt selvvalgte nøgletal
    (ADR, RevPAR og gennemsnitlig opholdslængde).
  - Cocktailbar: Helene Christines samlede salg for året, omsætning pr. drink og procentfordeling
    mellem cocktails og kaffe.
- **Leverancer**: Udover backend og booking-frontend SKAL der leveres et interaktivt
  Tableau-dashboard baseret på backendens REST API.
- **Leverancedokumentation**: Repositoryet SKAL indeholde `README.md` (med samlet arkitekturdiagram,
  kørselsvejledning og domænedefinitioner), `CONTRIBUTE.md` samt alle Spec Kit-artefakter
  (`constitution`, `spec`, `plan`, `tasks` og sidste `converge`-resultat) (constitution ligger i `.specify/memory/`, de øvrige i `specs/`).
  `spec.md` SKAL indeholde user stories med acceptkriterier. README SKAL desuden beskrive
  request-flowet (frontend → database → svar), lagenes ansvar og udskiftelighed.

## Udviklingsworkflow & Kvalitetskrav

- **Git-samarbejde & Synlige Bidrag**: Alle gruppemedlemmer (Oscar, Sebastian, Astrid, Rosalina)
  SKAL bidrage aktivt med egne commits i GitHub-repositoryet.
- **Branching & Code Review**: `main`-branchen holdes altid kørbar. Nye features og tasks udvikles
  på separate branches og merges via Pull Requests efter review.
- **Kravkvalitet (INVEST & The Three Cs)**: Alle funktionelle krav formuleres som User Stories
  (`"Som <rolle> ønsker jeg <mål>, så <værdi>"`), kvalitetssikres efter INVEST-principperne og
  forsynes med testbare acceptkriterier (Confirmation), som tjekkes i `Converge`-fasen.
- **Kodestil & Navngivning**: Koden SKAL følge sprogets gængse konvention, håndhævet med linter/formatter.
  Pakker/klasser navngives efter lag (`controller`, `service`, `repository`), og commit-beskeder
  skal være beskrivende.
- **Clean-Clone Kvalitetsport**: Inden aflevering SKAL et friskt `git clone` efterfulgt af
  `docker-compose up` verificeres til at starte alle containere og data uden fejl.

## Governance

- Denne Constitution er det øverste styringsdokument for Hotel Kong Arthur-projektet og tilsidesætter
  alle modstridende praksisser eller antagelser i efterfølgende faser.
- Ændringer til denne Constitution kræver:
  1. Dokumenteret begrundelse for ændringen.
  2. Enighed i projektgruppen og opdatering af versionsnummer efter semantisk versionering:
     - `MAJOR`: Fjernelse eller grundlæggende ændring af et ufravigeligt arkitekturprincip.
     - `MINOR`: Tilføjelse af nye principper, sektioner eller væsentligt udvidede krav.
     - `PATCH`: Præciseringer, sproglige rettelser og ikke-funktionelle justeringer.
  3. Konsekvensrettelse af afhængige artefakter (`spec.md`, `plan.md`, `tasks.md`).
- Ved hvert `Converge`-tjek og Pull Request SKAL det kontrolleres, at løsningen overholder
  3-lagsarkitekturen, OpenAPI-kontrakten og single-command Docker-opstarten.

**Version**: 2.0.0 | **Ratified**: 2026-10-28 | **Last Amended**: 2026-11-02
