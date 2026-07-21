import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { runWithLogContext } from '../utils/logger';

/**
 * Assigns a correlation id to every request and runs the request inside the
 * logger's AsyncLocalStorage context, so all logs for that request carry the
 * same requestId. Honors an inbound X-Request-Id (e.g. from nginx or an
 * upstream service) so a trace can span hops, and echoes it back on the
 * response so clients/downstream can correlate too.
 */
export const requestContext = (req: Request, res: Response, next: NextFunction) => {
  const inbound = req.headers['x-request-id'];
  const requestId = (Array.isArray(inbound) ? inbound[0] : inbound) || randomUUID();
  res.setHeader('X-Request-Id', requestId);
  runWithLogContext({ requestId, method: req.method, path: req.path }, () => next());
};
