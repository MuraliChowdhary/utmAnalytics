// Rate limiting middleware
import { MiddlewareHandler } from 'hono';

// Simple in-memory rate limiter
export const createRateLimiter = (
  windowMs: number = 60 * 1000, // Default: 1 minute
  max: number = 10, // Default: 10 requests per window
  message: string = 'Too many requests, please try again later'
): MiddlewareHandler => {
  // Store for tracking requests from IPs
  const requests = new Map<string, { count: number, resetTime: number }>();
  
  return async (c, next) => {
    const ip = c.req.header('x-forwarded-for') || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    if (Math.random() < 0.01) { // 1% chance to clean up to avoid doing it on every request
      for (const [key, value] of requests.entries()) {
        if (now > value.resetTime) {
          requests.delete(key);
        }
      }
    }
    
    // Get or create record for this IP
    let record = requests.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
    }
    
    // Check if rate limit exceeded
    if (record.count >= max) {
      return c.json({ error: message, retryAfter: Math.ceil((record.resetTime - now) / 1000) }, 429);
    }
    
    // Update request count and store
    record.count++;
    requests.set(ip, record);
    
    // Add rate limit headers
    c.header('X-RateLimit-Limit', max.toString());
    c.header('X-RateLimit-Remaining', (max - record.count).toString());
    c.header('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000).toString());
    
    await next();
  };
};