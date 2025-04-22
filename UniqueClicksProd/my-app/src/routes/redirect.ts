// URL redirection endpoint
import { Hono } from 'hono';
import { Env } from '../app';
import { createDbConnection, findUrlByShortId } from '../utils/db';
import { validateShortId } from '../utils/validators';

// Create router for URL redirection
const router = new Hono<{ Bindings: Env }>();

// Endpoint to redirect from short URL to original URL
router.get('/:shortId', async (c) => {
  const shortId = c.req.param('shortId');
  
  // Validate shortId format
  if (!validateShortId(shortId)) {
    return c.json({ message: "Invalid URL format" }, 400);
  }
  
  const sql = createDbConnection(c.env);
  
  try {
    // Look up the URL in cache/database
    const urlRecord = await findUrlByShortId(sql, shortId);
    
    if (urlRecord) {
      // Redirect to fingerprinting page first
      const redirectUrl = `https://finger-print-clicks.vercel.app/?shortId=${shortId}`;
      return c.redirect(redirectUrl);
    }
    
    return c.json({ message: "URL not found" }, 404);
  } catch (error) {
    console.error('Error retrieving URL:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  } finally {
    c.executionCtx.waitUntil(sql.end());
  }
});

// Endpoint to store visitor information and complete redirection
router.post('/store-visitor-id', async (c) => {
  const { visitorId, shortId, city } = await c.req.json();
  
  // Validate inputs
  if (!shortId || !validateShortId(shortId)) {
    return c.json({ error: 'Invalid shortId' }, 400);
  }
  
  if (!visitorId) {
    return c.json({ error: 'Visitor ID is required' }, 400);
  }
  
  const sql = createDbConnection(c.env);
  
  try {
    // Look up the URL
    const urlRecord = await findUrlByShortId(sql, shortId, false); // Bypass cache for accuracy
    
    if (!urlRecord) {
      return c.json({ error: 'URL not found' }, 404);
    }
    
    const urlId = urlRecord.id;
    
    // Check if this visitor has visited before
    const visitorExists = await sql`
      SELECT 1 FROM "Visitor"
      WHERE "urlId" = ${urlId} AND "visitorId" = ${visitorId}
      LIMIT 1
    `;
    
    const isUniqueVisitor = visitorExists.length === 0;
    
    // If this is a new visitor, record them
    if (isUniqueVisitor) {
      await sql`
        INSERT INTO "Visitor" ("id", "visitorId", "city", "urlId")
        VALUES (${crypto.randomUUID()}, ${visitorId}, ${city || null}, ${urlId})
      `;
      
      // Add to analytics table if needed
      await sql`
        INSERT INTO "ClickAnalytics" ("id", "urlId", "visitorId", "referrer", "userAgent")
        VALUES (
          ${crypto.randomUUID()}, 
          ${urlId}, 
          ${visitorId}, 
          ${c.req.header('referer') || null}, 
          ${c.req.header('user-agent') || null}
        )
      `;
    }
    
    // Update click counts
    // Using direct update for immediate consistency - for higher loads, use batch system
    await sql`
      UPDATE "Url"
      SET "totalClicks" = "totalClicks" + 1,
          "uniqueClicks" = "uniqueClicks" + ${isUniqueVisitor ? 1 : 0},
          "updatedAt" = NOW()
      WHERE id = ${urlId}
    `;
    
    // Invalidate cache for this shortId
    const { urlCache } = await import('../utils/cache');
    urlCache.invalidate(shortId);
    
    return c.json({ originalUrl: urlRecord.originalUrl });
  } catch (error) {
    console.error('Error storing visitor:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  } finally {
    c.executionCtx.waitUntil(sql.end());
  }
});

export default router;