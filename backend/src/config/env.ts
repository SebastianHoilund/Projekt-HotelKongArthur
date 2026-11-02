export const env = {
  db: {
    host: process.env.DB_HOST ?? 'db',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'hotel',
    password: process.env.DB_PASSWORD ?? 'hotel',
    database: process.env.DB_NAME ?? 'hotel_kong_arthur',
  },
  port: Number(process.env.PORT ?? 3000),
  dataDir: process.env.DATA_DIR ?? '/app/data',
  openApiPath: process.env.OPENAPI_PATH ?? '/app/openapi.yaml',
};
