FROM node:22
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Pakkes ved kørsel, så .taco-filen havner i den bind-mountede mappe på værten.
CMD ["sh", "-c", "npx taco build && npx taco pack && find . -name '*.taco' -not -path './node_modules/*' -exec cp {} /output/ \\; && ls /output/*.taco"]
