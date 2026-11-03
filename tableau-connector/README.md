# Tableau WDC 3.0-connector

Connectoren følger strukturen fra `taco create` (skabelonen `earthquake-data` i
`@tableau/taco-toolkit` 2.2.0):

```
tableau-connector/
  Dockerfile            wdc-build: bygger og pakker til dist/*.taco
  eps-dev.sh            udviklerscript til EPS på macOS (--mode dev tillader localhost)
  eps-dev.cmd           udviklerscript til EPS på Windows (--mode dev tillader localhost)
  connector/
    connector.json      navn, Tableau-version og tilladte URL'er (kun http://localhost:3000)
    types.ts            TypeScript-datatyper for API-svarene
    app/                lille UI: år og backend-URL
    handlers/
      HotelFetcher.ts   henter /api/reports/bookings og /api/analytics/* for året
      HotelParser.ts    tabeldefinitioner og lægger rækkerne i 8 Tableau-tabeller
```

Brug af connectoren i Tableau står i `tableau/README.md`.

## Licensvilkår

`taco`-kommandoerne kræver, at Tableaus licensvilkår for taco-toolkit er accepteret
(<https://help.tableau.com/current/api/webdataconnector/en-us/docs/wdc_license.html>).

**Gruppen har accepteret vilkårene den 2026-11-02.** Derfor skriver `Dockerfile` accepten
(`node_modules/@tableau/taco-toolkit/license-agreement.json`), så `wdc-build` kan køre uden terminal.
Bygger man lokalt uden Docker, spørger første `npx taco …` selv.

## Byg med Docker

```bash
docker-compose run --rm wdc-build
```

Resultatet er `tableau-connector/dist/hotel-kong-arthur-1.0.0.taco`. Imaget indeholder en JDK,
fordi `taco pack` laver `.taco`-filen med Javas jar-værktøj.

## Byg lokalt (uden Docker)

```bash
cd tableau-connector/connector
npm ci
npx taco build
cd .. && connector/node_modules/.bin/taco pack   # pack skal køres fra tableau-connector/ og kræver en JDK
```
