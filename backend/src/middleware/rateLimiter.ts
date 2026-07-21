import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication endpoints (register/login).
 * Caps brute-force / credential-stuffing attempts at 10 requests per 15 min
 * per IP. Emits standard RateLimit-* headers; responds in the project's
 * structured error format.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // 10 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  // Same convention as the NODE_ENV==='test' bypass in middleware/auth.ts:
  // integration tests exercise register/login many times per run from a
  // single source IP and aren't exposed to real credential-stuffing traffic.
  skip: () => process.env.NODE_ENV === 'test',
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'RATE_LIMITED',
      message: 'Too many attempts. Please try again in a few minutes.'
    });
  }
});
