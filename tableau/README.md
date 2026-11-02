# Tableau-dashboard

Dashboardet henter alle data live fra backendens REST API via Web Data Connector 3.0
(`tableau-connector/`). Tableau har ingen adgang til databasen, og alle nøgletal er beregnet i
backenden. Tableau summerer kun fakta-tabellen.

## Krav

- Tableau Desktop **2025.2 eller nyere** (`connector.json` kræver det, fordi connectoren er bygget med
  `@tableau/taco-toolkit` 2.2.0). Tableau Public kan ikke bruge WDC 3.0.
- Systemet kører: `docker-compose up -d` og `http://localhost:3000/api/health` svarer.

## 1. Byg connectoren

```bash
docker-compose run --rm wdc-build
```

`tableau-connector/dist/hotel-kong-arthur-1.0.0.taco` bliver lavet. Den bygges også ved
`docker-compose up --build`.

## 2. Start Tableau Desktop med connectoren

Connectoren er ikke signeret, så Tableau skal startes med to flag. Stien skal pege på mappen med
`.taco`-filen.

macOS:

```bash
open -a "Tableau Desktop 2025.2" --args \
  -DConnectPluginsPath="$PWD/tableau-connector/dist" \
  -DDisableVerifyConnectorPluginSignature=true
```

Windows (PowerShell):

```powershell
& "C:\Program Files\Tableau\Tableau 2025.2\bin\tableau.exe" `
  "-DConnectPluginsPath=$PWD\tableau-connector\dist" `
  -DDisableVerifyConnectorPluginSignature=true
```

## 3. Forbind

**Connect → To a Server → Hotel Kong Arthur**. Vælg år (standard 2026), behold backend-URL
`http://localhost:3000`, og klik **Hent data**. Connectoren tillader kun `http://localhost:3000`.

Connectoren giver 8 tabeller:

| Tabel | Kilde | Bruges til |
|---|---|---|
| `bookings_fact` (Bookinger) | `/api/reports/bookings` | Kort over lande, filtre på år, måned, sæson, type og land |
| `kpi_summary` (Nøgletal) | `/api/analytics/summary` | KPI-kort: indtjening, belægningsgrad, ADR, RevPAR, ALOS, tilfredshed |
| `revenue_room_type_season` | `/api/analytics/revenue/room-types` | Indtjening pr. type × sæson, top-værelsestyper (`rank`) |
| `revenue_country` | `/api/analytics/revenue/countries` | Indtjening pr. land, top-lande (`rank`) |
| `occupancy_period` | `/api/analytics/occupancy` | Belægningsgrad pr. sæson og måned (`periodType`) |
| `satisfaction_room_type` | `/api/analytics/satisfaction` | Tilfredshed pr. værelsestype |
| `bar_drinks` | `/api/analytics/bar` | Omsætning pr. drink |
| `bar_summary` | `/api/analytics/bar` | Helene Christines total, cocktail vs. kaffe i % |

## 4. Påkrævede visninger

| Spørgsmål fra opgaven | Tabel og felter |
|---|---|
| Gæsternes oprindelseslande | `bookings_fact`: `country` som kort (geografisk rolle: Land/Region), antal `bookingId` |
| Indtjening pr. værelsestype pr. sæson | `revenue_room_type_season`: `roomType` × `season`, `revenue` |
| Indtjening pr. land, top-lande | `revenue_country`: `country`, `revenue`, sortér på `rank` |
| Top-værelsestyper | `revenue_room_type_season`: `roomType`, `roomTypeRevenue`, sortér på `rank` |
| Årets indtjening, belægningsgrad, tilfredshed, ADR, RevPAR, ALOS | `kpi_summary` (én række, brug som tekst/KPI-kort) |
| Helene Christines samlede salg | `bar_summary`: `totalRevenue`, `totalUnits` |
| Omsætning pr. drink | `bar_drinks`: `name`, `revenue` |
| Cocktail vs. kaffe i % | `bar_summary`: `category`, `revenueShare`, `unitShare` |

Brug ikke Tableau-beregninger til belægningsgrad, ADR, RevPAR eller ALOS. Tallene skal være de
samme som i API'et og i frontenden. Kapaciteten er fast 214 værelser, så belægningsgraden for
2026 er ca. 6,89 %.

## 5. Opdatér data (live)

Opret, redigér eller slet en booking i frontenden (`http://localhost:8080`) eller registrér et
barsalg. Vælg derefter **Data → Refresh** i Tableau. Connectoren kalder API'et igen, og de nye
tal vises med det samme. Intet caches i backenden.

## Backup uden WDC

Hvis connectoren ikke kan køre på demomaskinen, kan fakta-tabellerne hentes som CSV og åbnes i
Tableau som tekstfil. De er da statiske, indtil filerne hentes igen.

```bash
curl -o bookings_2026.csv    'http://localhost:3000/api/reports/bookings?year=2026&format=csv'
curl -o drink_sales_2026.csv 'http://localhost:3000/api/reports/drink-sales?year=2026&format=csv'
```
