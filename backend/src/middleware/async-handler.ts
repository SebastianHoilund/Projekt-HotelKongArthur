import type { NextFunction, Request, RequestHandler, Response } from 'express';

// Express 4 fanger ikke afviste promises, så fejl skal sendes videre til error-handleren.
export function asyncHandler(
  handler: (req: Request, res: Response) => Promise<void>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}
