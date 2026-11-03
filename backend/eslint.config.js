import tseslint from 'typescript-eslint';

const pattern = (group, message) => ({ group, message });

// Lagdelingen fra plan.md håndhæves af lint (constitution IV):
// controller → service → repository-interfaces ← repository/postgres. Kun repository/postgres taler med pg.
const layerRule = (...patterns) => ({
  '@typescript-eslint/no-restricted-imports': ['error', { patterns }],
});

const noExpress = pattern(['express'], 'Kun controller- og middleware-laget kender Express.');
const noPg = pattern(['pg'], 'Kun repository/postgres må bruge pg.');
const noPostgresRepo = pattern(
  ['**/repository/postgres/*'],
  'Afhæng af interfaces i repository/interfaces.ts, ikke af PostgreSQL-implementeringen.',
);

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'coverage/'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/controller/**/*.ts', 'src/middleware/**/*.ts'],
    rules: layerRule(
      noPg,
      pattern(
        ['**/repository/*', '**/repository/**'],
        'Controllere kalder services, aldrig repositories.',
      ),
      pattern(['**/db/*'], 'Controllere kalder services, aldrig databasen.'),
    ),
  },
  {
    files: ['src/service/**/*.ts'],
    rules: layerRule(
      noExpress,
      noPg,
      noPostgresRepo,
      pattern(['**/controller/*', '**/middleware/*'], 'Services kender ikke HTTP-laget.'),
    ),
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: layerRule(
      noExpress,
      noPg,
      pattern(
        [
          '**/repository/*',
          '**/repository/**',
          '**/service/*',
          '**/controller/*',
          '**/middleware/*',
        ],
        'Domænet afhænger ikke af andre lag.',
      ),
    ),
  },
  {
    // app.ts (sammenkobling) og db/ (migration og seed) må kende pg's typer, men ikke bruge pg direkte.
    files: ['src/app.ts', 'src/server.ts', 'src/db/**/*.ts', 'src/config/**/*.ts', 'src/routes.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { patterns: [{ ...noPg, allowTypeImports: true }] },
      ],
    },
  },
  {
    files: ['src/repository/interfaces.ts'],
    rules: layerRule(noExpress, noPg, noPostgresRepo),
  },
);
