import * as OpenApiValidator from 'express-openapi-validator';
import { env } from '../config/env.js';

// Responses valideres kun i test, så en kontraktafvigelse fejler testen frem for at give 500 i drift.
export function openApiValidator() {
  return OpenApiValidator.middleware({
    apiSpec: env.openApiPath,
    validateRequests: true,
    validateResponses: process.env.NODE_ENV === 'test',
    // 'fast' (default) tjekker kun mønsteret, så fx 2026-02-30 slap igennem og gav 500 i databasen.
    ajvFormats: { mode: 'full' },
  });
}
