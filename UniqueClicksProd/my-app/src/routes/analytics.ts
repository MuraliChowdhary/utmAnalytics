// Analytics endpoints
import { Hono } from 'hono';
import { Env } from '../app';
import { createDbConnection, findUrlByShortId } from '../utils/db';
import { validateShortId } from '../utils/validators';

// Create router for analytics
const router = new Hono<{ Bindings: Env }>();

// Endpoint to get statistics for a URL
router.get('/:shortId', async (c) => {
  const shortId = c.req.param('shortId');
  
  // Validate shortId format
  if (!validateShortId(shortId)) {
    return c.json({ error: "Invalid URL format" }, 400);
  }
  
  const sql = createDbConnection(c.env);
  
  try {
    // Look up the URL
    const urlData = await findUrlByShortId(sql, shortId);
    
    if (!urlData) {
      return c.json({ error: 'URL not found' }, 404);
    }
    
    // Get visitor statistics
    const visitors = await sql`
      SELECT 
        COUNT(DISTINCT "visitorId") as unique_visitors,
        COUNT(*) as total_visits,
        array_agg(DISTINCT city) FILTER (WHERE city IS NOT NULL) as cities
      FROM "Visitor"
      WHERE "urlId" = ${urlData.id}
    `;
    
    // Get visitor trends (last 7 days)
    const trends = await sql`
      SELECT 
        DATE_TRUNC('day', "createdAt") as day,
        COUNT(*) as visits
      FROM "ClickAnalytics"
      WHERE "urlId" = ${urlData.id}
        AND "createdAt" > NOW() - INTERVAL '7 days'
      GROUP BY day
      ORDER BY day
    `;
    
    return c.json({
      shortId: urlData.shortId,
      originalUrl: urlData.originalUrl,
      totalClicks: urlData.totalClicks,
      uniqueClicks: urlData.uniqueClicks,
      createdAt: urlData.createdAt,
      statistics: {
        ...visitors[0],
        trends
      }
    });
  } catch (error) {
    console.error('Error retrieving statistics:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  } finally {
    c.executionCtx.waitUntil(sql.end());
  }
});

export default router;