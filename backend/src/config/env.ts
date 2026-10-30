export const env = {
  mysql: {
    host: process.env.MYSQL_HOST ?? 'db',
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? 'hotel',
    password: process.env.MYSQL_PASSWORD ?? 'hotel',
    database: process.env.MYSQL_DATABASE ?? 'hotel_kong_arthur',
  },
  port: Number(process.env.PORT ?? 3000),
  dataDir: process.env.DATA_DIR ?? '/app/data',
  openApiPath: process.env.OPENAPI_PATH ?? '/app/openapi.yaml',
};
