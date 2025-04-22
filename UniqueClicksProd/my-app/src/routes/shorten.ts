// URL shortening endpoint
import { Hono } from 'hono';
import shortid from 'shortid';
import { Env } from '../app';
import { createDbConnection, executeWithRetry } from '../utils/db';
import { validateUrl } from '../utils/validators';
import { createRateLimiter } from '../middleware/rateLimiter';

// Create router for URL shortening
const router = new Hono<{ Bindings: Env }>();

// Apply rate limiting for URL shortening
router.use('*', createRateLimiter(60 * 1000, 10));

// Endpoint to create a shortened URL
router.post('/', async (c) => {
  const sql = createDbConnection(c.env);
  
  try {
    // Parse and validate request body
    const body = await c.req.json();
    
    // Validate URL
    if (!body.originalUrl) {
      return c.json({ success: false, error: "Original URL is required" }, 400);
    }
    
    if (!validateUrl(body.originalUrl)) {
      return c.json({ success: false, error: "Invalid URL format" }, 400);
    }
    
    // Generate short ID and other data
    const shortId = shortid.generate();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    
    // Save to database with retry logic
    await executeWithRetry(async () => {
      await sql`
        INSERT INTO "Url" (id, "shortId", "originalUrl", "totalClicks", "uniqueClicks", "createdAt", "updatedAt")
        VALUES (${id}, ${shortId}, ${body.originalUrl}, 0, 0, ${now}, ${now})
      `;
    });
    
    // Clean up database connection
    c.executionCtx.waitUntil(sql.end());
    
    // Return the shortened URL
    const url = `https://my-app.muralisudireddy0.workers.dev/${shortId}`;
    
    return c.json({
      success: true,
      url
    });
  } catch (error) {
    console.error('Error creating shortened URL:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default router;