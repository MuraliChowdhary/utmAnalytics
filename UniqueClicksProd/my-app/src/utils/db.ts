// Database utilities for URL shortener
import postgres from 'postgres';
import { Env } from '../app';

// Create a database connection with optimized settings
export const createDbConnection = (env: Env) => {
  return postgres(env.DATABASE_URL, {
    max: 5,                 // Maximum connections in pool
    idle_timeout: 30,       // Close idle connections after 30 seconds
    connect_timeout: 10,    // Timeout after 10 seconds if connection fails
    fetch_types: false,     // Skip type parsing for better performance
    max_lifetime: 60 * 30   // Max connection lifetime (30 minutes)
  });
};

// Execute database operations with retry logic
export async function executeWithRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      // Only retry on connection errors
      if (!(error instanceof Error) || !error.message.includes('connection')) {
        break;
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
    }
  }
  
  throw lastError;
}

// Find URL by shortId with cache integration
export async function findUrlByShortId(sql: ReturnType<typeof postgres>, shortId: string, useCache = true) {
  // Import here to avoid circular dependency
  const { urlCache } = await import('./cache');
  
  // Check cache first if enabled
  if (useCache) {
    const cachedUrl = urlCache.get(shortId);
    if (cachedUrl) {
      return cachedUrl;
    }
  }

  // If not in cache, query the database
  const results = await sql`
    SELECT * FROM "Url" 
    WHERE "shortId" = ${shortId}
    LIMIT 1
  `;
  
  const result = results.length > 0 ? results[0] : null;
  
  // Store in cache if found and caching is enabled
  if (result && useCache) {
    urlCache.set(shortId, result);
  }
  
  return result;
}