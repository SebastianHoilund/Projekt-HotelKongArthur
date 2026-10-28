<!--
Sync Impact Report
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
(`Controller/API` → `Service/Forretningslogik` → `Repository/Dataadgang` → `MySQL`):
- **Præsentationslag (`controller`)**: Håndterer udelukkende HTTP-requests/responses, input-parsing,
  statuskoder og serialisering til/fra JSON. Må IKKE indeholde forretningsberegninger eller SQL.
- **Forretningslogiklag (`service`)**: Indeholder al domænelogik, validering (f.eks. datoer,
  værelseskapacitet, overbooking), sæsonprisberegning og aggregering af nøgletal.
- **Dataadgangslag (`repository`)**: Indkapsler al kommunikation med MySQL-databasen.
  Lagdelingen SKAL sikre, at MySQL eller præsentationslaget (frontend/eksternt bookingsystem) kan
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
- Ingen ekstern klient — heller ikke Tableau — må tilgå MySQL-databasen direkte uden om REST API'et.
- API'et SKAL understøtte skrivning (`POST`/`PUT`/`DELETE`) af bookinger fra eksterne
  bookingsystemer, ikke kun fra prototype-frontenden.

### III. Containerisering & Single-Command Drift
Hele systemet SKAL være fuldt containeriseret og kunne startes på enhver maskine med én enkelt
`docker-compose up`-kommando uden manuelle opsætningstrin:
- Systemet SKAL som minimum omfatte containere til `db` (MySQL), `backend`, `frontend` og
  `swagger-ui` forbundet via et internt Docker-netværk.
- Opstartsrækkefølgen SKAL styres deterministisk med `healthcheck` på MySQL og
  `depends_on: condition: service_healthy` for backenden.
- MySQL-data SKAL persisteres i et navngivet Docker-volume, så oprettede og redigerede bookinger
  overlever genstart af containere.
- Ved første opstart på en tom database SKAL skema og historiske grunddata (værelsestyper, 214
  værelser, gæster, bookinger samt cocktail-/kaffesalg) seedes automatisk.

### IV. Fra Statisk til Live Data & Centraliseret Logik
Systemet SKAL transformere de udleverede statiske CSV/XLSX-datasæt til et levende, transaktionelt
system, hvor ændringer øjeblikkeligt slår igennem i analyserne:
- Oprettelse, redigering og sletning af bookinger (CRUD) i prototype-frontenden SKAL straks
  persisteres i MySQL og afspejles i API'ets nøgletals- og rapport-endpoints.
- Tableau SKAL hente opdaterede data via backendens REST API (f.eks. gennem Web Data Connector eller
  dedikerede JSON/CSV rapport-endpoints understøttet af API-kontrakten).
- Definitioner af sæsoner (lav-, mellem- og højsæson), belægningsgrad og prisberegning SKAL være
  entydigt dokumenteret og centraliseret, så nøgletal beregnes konsistent på tværs af visninger.
- Nøgletal SKAL beregnes i backendens service-lag og udstilles via API'et. Hverken databasen
  (views/procedurer) eller Tableau må indeholde selvstændig forretningslogik for nøgletal;
  Tableau viser kun de beregnede resultater.
- Bookingvalidering (herunder at bookinger ikke må overlappe på samme værelse) SKAL ligge i
  service-laget og præcises i `Clarify`.

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

- **Database**: MySQL 8.x kørende i Docker med automatiseret DDL-migrering og seed-import af
  `international_names_with_rooms_1000.csv` og `drinks_menu_with_sales.csv`.
- **Domæneomfang**:
  - Hoteldrift: 214 værelser fordelt på 8 værelsestyper (kapacitet 1–4 personer, maks. ~428 gæster),
    sæsonafhængige priser (lav-, mellem- og højsæson), gæster med oprindelsesland og bookinger.
  - Cocktailbar: Receptionist/bartender Helene Christines sortiment (20 cocktails og 10 kaffetyper)
    samt løbende salgsregistrering og omsætningsfordeling.
- **Præsentationsklienter**:
  1. Browserbaseret prototype-frontend til booking-CRUD (opret, vis, redigér, slet).
  2. Swagger UI i Docker til interaktiv udforskning og test af REST API-kontrakten.
  3. Interaktivt Tableau-dashboard til visualisering af nøgletal for hotel og cocktailbar.
- **Obligatoriske analytics-krav** (SKAL kunne beregnes af API'et og vises i Tableau):
  - Hotel: gæsternes lande; indtjening pr. værelsestype (pr. sæson) og pr. land; hvilke værelser og
    lande der indtjener mest; årets samlede indtjening; belægningsgrad; kundetilfredshed
    (kilde — data eller tilføjet rating — afklares i `Clarify`); samt mindst ét selvvalgt nøgletal
    (f.eks. RevPAR, ADR eller gennemsnitlig opholdslængde).
  - Cocktailbar: Helene Christines samlede salg for året, omsætning pr. drink og procentfordeling
    mellem cocktails og kaffe.
- **Leverancer**: Udover backend og booking-frontend SKAL der leveres et interaktivt
  Tableau-dashboard baseret på backendens REST API.
- **Leverancedokumentation**: Repositoryet SKAL indeholde `README.md` (med samlet arkitekturdiagram,
  kørselsvejledning og domænedefinitioner), `CONTRIBUTE.md` samt alle Spec Kit-artefakter
  (`constitution`, `spec`, `plan`, `tasks` og sidste `converge`-resultat) samlet i en `specs/`-mappe.
  `spec.md` SKAL indeholde user stories med acceptkriterier. README SKAL desuden beskrive
  request-flowet (frontend → MySQL → svar), lagenes ansvar og udskiftelighed.

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

**Version**: 1.1.0 | **Ratified**: 2026-10-28 | **Last Amended**: 2026-10-28
