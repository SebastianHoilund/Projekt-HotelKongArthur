# Projektplan – Hotel Kong Arthur

**Periode:** man 26/10 → **fre 6/11 kl. 12.30** (præsentation)
**Kilder:** `Opgavebeskrivelse.pdf`, `Tillægsspørgsmål.pdf`, data fra [ITAKEA/hoteldata](https://github.com/ITAKEA/hoteldata)

> [!IMPORTANT]
> Opgaven kræver **Spec Kit-workflowet** i denne rækkefølge:
> Constitution → Specify → Clarify → Plan → Tasks → Implement → Converge.
> Spec-artefakterne er en del af afleveringen, så **ingen kode før Tasks er færdig.**

---

## Fase 0 – Opstart og fælles setup (man 26/10)

1. **Rollefordeling** - *Ansvarsområder*:
   - Backend og database - **Oscar** 
   - Frontend (booking-CRUD) - **Sebastian** 
   - Docker - **Astrid**
   - OpenAPI og Swagger - **Rosalina** 
   - Tableau og analytics - **Fælles**
   - Spec-ansvarlig og præsentation - **Fælles** 
1. **Sæt GitHub-repoet op.**
   - Tilføj alle som collaborators.
   - Branch-strategi: `main` plus feature-branches og pull requests.
   - Lav et GitHub Project board (kolonner: Todo / In progress / Review / Done).
   - Tilføj `.gitignore` og fjern `.DS_Store` fra git.
1. **Hent data.**:
   - `international_names_with_rooms_1000.csv/.xlsx` (gæster, lande, værelser, bookinger)
   - `drinks_menu_with_sales.xlsx` (cocktails, kaffe og salg)
   - Notér kolonner, datatyper, mangler og fejl i data.
1. **Installér værktøjer** på alle maskiner:
   - Docker Desktop, Git
   - Spec Kit (`uvx --from git+https://github.com/github/spec-kit.git specify init .`)
   - En kodeagent, Tableau Desktop/Public
1. **Lav et teknisk spike (vigtigt):** Hvordan henter Tableau data fra et REST API?
   - Tableau kan ikke læse REST direkte uden videre.
   - Mulige løsninger: Web Data Connector (WDC 3.0), et JSON/CSV-eksport-endpoint, eller en anden løsning.
   - Beslut dette tidligt, fordi det påvirker API-designet.

## Fase 1 – Constitution (man 26/10)

1. Kør `/speckit.constitution` og skriv de faste principper ind:
   - 3-lagsarkitektur (præsentation/API → forretningslogik → dataadgang)
   - REST med JSON
   - OpenAPI-kontrakt med Swagger UI kørende i en container
   - MySQL som database
   - Alt kører med én `docker-compose up`
   - Alle i gruppen committer, og der bruges PR-reviews
   - Kodestil, test-niveau og navngivning
1. Commit `constitution.md` til repoet.

## Fase 2 – Specify (man 26/10 – tir 27/10)

1. **Find brugerne/rollerne:** receptionist, hoteladministrator/ledelse, bartender (Helene Christine), eksternt bookingsystem.
1. **Skriv user stories** i formatet *"Som \<rolle> ønsker jeg \<mål>, så \<værdi>"*:
    - Booking-CRUD: opret, se, ret og slet booking
    - Gæster og lande
    - Værelser og værelsestyper (8 typer, 214 værelser)
    - Sæsonpriser (lav/mellem/høj)
    - Nøgletal: belægningsgrad, indtjening pr. værelsestype pr. sæson, pr. land, årets indtjening, kundetilfredshed
    - Cocktailbar: registrér salg, omsætning pr. drink, Helene Christines total, fordeling i % mellem cocktails og kaffe
    - Live-data: nye bookinger og salg slår igennem i dashboardet
    - Ét selvvalgt nøgletal (f.eks. RevPAR, ADR eller gennemsnitlig opholdslængde)
1. **Tjek hver story med INVEST** (Independent, Negotiable, Valuable, Estimable, Small, Testable).
1. **Skriv acceptkriterier** til hver story (Confirmation, "The Three Cs"). Brug f.eks. Given/When/Then.
1. Kør `/speckit.specify` med dette som input, og commit `spec.md`.

## Fase 3 – Clarify (tir 27/10)

1. Kør `/speckit.clarify` og tag stilling til mindst disse spørgsmål:
    - **Hvad betyder "live"?** Polling, refresh i Tableau eller hver gang data hentes?
    - **Hvordan defineres en sæson?** Hvilke måneder er lav, mellem og høj (og jul)?
    - **Hvordan beregnes belægningsgraden?** Solgte værelsesnætter ÷ (214 × dage)? Pr. værelse eller pr. gæst?
    - Hvordan beregnes prisen? En fast pris pr. type og sæson, eller midtpunktet af prisintervallet?
    - Hvordan måles kundetilfredshed? Findes det i data, eller skal det tilføjes som rating?
    - Må bookinger overlappe på samme værelse? Hvilke valideringsregler gælder?
    - Skal der være login/auth? (Det kan med god grund være "out of scope" for en prototype.)
    - Hvordan importeres CSV/XLSX-data? Seed-script ved opstart?
1. Opdatér `spec.md` med svarene og commit.

## Fase 4 – Plan (tir 27/10 – ons 28/10)

1. Kør `/speckit.plan` og beslut:
    - **Sprog og framework** til backend (f.eks. Java/Spring Boot, C#/.NET, Node/Express, Python/FastAPI)
    - Frontend-teknologi (gerne simpel: HTML/JS eller et lille framework)
    - **Lagdeling i koden:** `controller/` → `service/` → `repository/`, og hvor grænserne går
1. **Lav datamodellen (ER-diagram):**
    - `room_type` (navn, kapacitet, priser pr. sæson)
    - `room` (214 værelser, FK til type)
    - `guest` (navn, land)
    - `booking` (gæst, værelse, check-in, check-out, pris, status, rating)
    - `season` (navn, start- og slutmåned)
    - `drink` (navn, kategori cocktail/kaffe/øvrig, pris)
    - `drink_sale` (drink, antal, tidspunkt, bartender)
1. **Design REST-endpoints:**
    - `GET/POST /api/bookings`, `GET/PUT/DELETE /api/bookings/{id}`
    - `/api/rooms`, `/api/room-types`, `/api/guests`, `/api/drinks`, `/api/drink-sales`
    - `/api/analytics/occupancy`, `/revenue/by-room-type`, `/revenue/by-country`, `/revenue/yearly`, `/bar/summary` osv.
    - Statuskoder: 200, 201, 204, 400, 404, 409
1. **Beslut hvor nøgletal beregnes** (tillægsspørgsmål 4): i SQL, i service-laget eller i Tableau? Skriv begrundelsen ned.
1. **Lav Docker-arkitekturen:**
    - Containere: `db` (MySQL), `backend`, `frontend`, `swagger-ui` (og evt. `tableau-connector`)
    - Netværk og service-navne (sådan finder containerne hinanden)
    - Opstartsrækkefølge: `depends_on` med `condition: service_healthy` og healthcheck på MySQL
    - Et volume, så data bevares mellem genstarter
1. **Tegn arkitekturdiagrammet** (Mermaid/draw.io). Det skal senere ind i README.
1. Commit `plan.md`, datamodel og diagram.

## Fase 5 – Tasks (ons 28/10)

1. Kør `/speckit.tasks` for at dele planen op i små tasks, organiseret efter user story og med afhængigheder.
1. Kør `/speckit.analyze` og evt. `/speckit.checklist` for at tjekke, at spec, plan og tasks hænger sammen.
1. Læg tasks ind på project boardet og fordel dem, så **alle får backend-commits**.
1. Commit `tasks.md`.

## Fase 6 – Implement: fundament (ons 28/10 – tor 29/10)

Rækkefølgen er vigtig, fordi tasks afhænger af hinanden:

1. **Lav projektskelettet** til backend og frontend, med Dockerfile til hver.
1. **Lav `docker-compose.yml`** med MySQL, healthcheck, volume og backend. Verificér at `docker-compose up` starter.
1. **Lav databaseskema og migrationer** (DDL ud fra datamodellen).
1. **Lav seed/import** af CSV/XLSX-data til MySQL, og tilføj værelser og værelsestyper med sæsonpriser.
1. **Dataadgangslag:** repositories for alle entiteter.
1. **Forretningslag:** services med validering (datoer, dobbeltbooking, kapacitet) og prisberegning.
1. **Præsentationslag:** REST-controllers for booking-CRUD med korrekte statuskoder og fejlhåndtering.
1. **Lav OpenAPI-specifikationen** og Swagger UI-containeren. Tjek at kontrakt og implementering stemmer overens (generér den fra koden, eller valider mod den).

## Fase 7 – Implement: features (fre 30/10 – man 2/11)

1. **Frontend:** list, opret, redigér og slet bookinger mod API'et. Tilføj CORS i backend.
1. **CRUD/endpoints for drinks og drinksalg** (cocktailbaren).
1. **Analytics-endpoints:**
    - Gæster pr. land
    - Indtjening pr. værelsestype pr. sæson
    - Indtjening pr. land
    - Top-værelser og top-lande efter indtjening
    - Årets samlede indtjening
    - Belægningsgrad (pr. måned/sæson)
    - Kundetilfredshed
    - Det selvvalgte nøgletal
    - Bar: Helenes totale salg, omsætning pr. drink, fordeling i % mellem cocktails og kaffe
1. **Live-data:** sørg for at en ny eller ændret booking i frontend straks giver nye tal fra analytics-endpoints.
1. **Tableau-integration** ud fra løsningen i spike'et (trin 6). Forbind Tableau til API'et.
1. **Skriv tests:** unit-tests af service-laget (beregninger) og evt. integrationstest af API.

## Fase 8 – Tableau-dashboard (lør 31/10 – tir 3/11)

1. **Sheets:**
    - Kort over gæsternes lande
    - Indtjening pr. værelsestype × sæson
    - Indtjening pr. land
    - Top-værelser og top-lande
    - KPI-kort med årets indtjening
    - Belægningsgrad
    - Det selvvalgte nøgletal
1. **Bar-sheets:** Helenes total, omsætning pr. drink (barchart), cocktail vs. kaffe (pie/donut med %).
1. **Saml det i et interaktivt dashboard** med filtre (år, sæson, værelsestype, land) og actions.
1. **Test live:** opret en booking i frontend, refresh Tableau og vis at tallet ændrer sig. Det er godt at vise til præsentationen.

## Fase 9 – Converge (man 2/11 – ons 4/11)

1. Kør Converge-tjek: gennemgå kode mod spec, plan og tasks, og **acceptkriterier pr. user story**.
1. Hvis noget mangler, tilføj nye tasks og gentag **Implement → Converge** til det matcher.
1. Skriv **resultatet af det sidste Converge-tjek** i en fil (f.eks. `specs/converge-result.md`): hvad er implementeret, og hvad mangler.
1. **Clean-clone-test:** klon repoet frisk på en anden maskine og kør `docker-compose up`. Alt skal virke uden manuelle trin.

## Fase 10 – Dokumentation (ons 4/11 – tor 5/11)

1. **`README.md`:**
    - Projektbeskrivelse
    - **Arkitekturdiagram** over hele systemet
    - Hvordan man starter systemet (`docker-compose up`), porte og URL'er (frontend, API, Swagger)
    - Datamodel og oversigt over endpoints
    - Tableau-opsætning
    - Definitioner (sæson, belægningsgrad, "live")
1. **`CONTRIBUTE.md`:** branch-strategi, commit-konventioner, PR-flow, hvordan man kører lokalt og tester, og hvordan man arbejder med Spec Kit.
1. Tjek at `specs/` indeholder constitution, spec, plan, tasks, user stories med acceptkriterier og converge-resultat.
1. **Tjek git-historikken:** alle i gruppen skal have reelle commits.

## Fase 11 – Præsentation (tor 5/11 – fre 6/11)

1. **Lav et slide-deck (10 min)** bygget op efter de 10 tillægsspørgsmål:
    1. Gennemgang af arkitekturdiagrammet
    2. Følg et request: klik → frontend → controller → service → repository → MySQL → svar
    3. De 3 lag og et eksempel på en bevidst placering
    4. Hvor nøgletal beregnes, og hvorfor
    5. Udskiftelighed (en anden DB eller frontend)
    6. REST-design med et konkret endpoint
    7. OpenAPI-kontrakten og dens "kunder"
    8. Docker: containere, opstartsrækkefølge, volumes
    9. Fra statiske til live data og Tableau via REST
    10. AI-ejerskab: én beslutning I ændrede eller beholdt, og den største svaghed i produktion
1. **Live-demo:** `docker-compose up` → Swagger → opret booking i frontend → Tableau opdateres. Hav en **backup-video eller screenshots** klar.
1. **Generalprøve med tidtagning** (under 10 min), og fordel taletid, så alle siger noget.
1. **Forbered review-rollen:** I skal tage noter og give feedback til en anden gruppe.
1. **Fre 6/11:** mød op i god tid med alt startet og testet. Præsentationen er kl. 12.30–15.45 afhængigt af gruppenummer.

---

## Tidsoverblik

| Dag | Fokus |
|---|---|
| Man 26/10 | Opstart, setup, data, Tableau-spike, Constitution, start på Specify |
| Tir 27/10 | Specify, Clarify, start på Plan |
| Ons 28/10 | Plan færdig, Tasks, Docker og DB-fundament |
| Tor 29/10 | Lagene, booking-CRUD, OpenAPI/Swagger |
| Fre 30/10 | Frontend, drinks, analytics-endpoints |
| Man 2/11 | Analytics færdig, Tableau, første Converge |
| Tir 3/11 | Tableau-dashboard, Converge-loop, tests |
| Ons 4/11 | Sidste Converge, clean-clone-test, docs |
| Tor 5/11 | README/CONTRIBUTE færdig, slides, generalprøve |
| **Fre 6/11** | **Præsentation kl. 12.30** |

## Afleveringstjekliste

- [ ] `specs/`: constitution, spec, plan, tasks
- [ ] User stories med acceptkriterier (INVEST)
- [ ] Resultat af sidste Converge-tjek
- [ ] Backend i 3 lag, REST/JSON, MySQL
- [ ] OpenAPI-spec og Swagger UI i en container
- [ ] Frontend med opret, redigér og slet booking
- [ ] Alt kører med én `docker-compose up`
- [ ] Tableau-dashboard med alle krævede nøgletal plus et selvvalgt
- [ ] `README.md` med arkitekturdiagram og `CONTRIBUTE.md`
- [ ] Commits fra alle gruppemedlemmer
- [ ] Præsentation og demo klar
