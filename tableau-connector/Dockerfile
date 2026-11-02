FROM node:22
# `taco pack` bruger JDK'ens jar-værktøj til at lave .taco-filen.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openjdk-17-jdk-headless \
  && rm -rf /var/lib/apt/lists/*
# Samme mappestruktur som `taco create`: projektet ligger i connector/, og build skriver til ../dist.
WORKDIR /app/connector
COPY connector/package*.json ./
RUN npm ci
# Gruppen har accepteret Tableaus licensvilkår for taco-toolkit (2026-11-02, se README.md).
# Accepten skrives i samme format som `taco`s egen prompt, så build kan køre uden terminal.
RUN node -e "const fs = require('fs'); const dir = '/app/connector/node_modules/@tableau/taco-toolkit'; fs.writeFileSync(dir + '/license-agreement.json', JSON.stringify({ time: new Date().toISOString(), 'taco-toolkit-version': JSON.parse(fs.readFileSync(dir + '/package.json')).version, 'taco-toolkit-installation-path': dir }, null, 2))"
COPY connector/ ./
# Pakkes ved kørsel, så .taco-filen havner i den bind-mountede mappe på værten.
# `taco pack` skal køres fra projektroden (/app), build fra connector/.
CMD ["sh", "-c", "npx taco build && cd /app && connector/node_modules/.bin/taco pack && find /app -name '*.taco' -not -path '*/node_modules/*' -exec cp {} /output/ \\; && ls -l /output/*.taco"]
