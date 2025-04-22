// Health check endpoint
import { Hono } from 'hono';
import { Env } from '../app';
import { createDbConnection } from '../utils/db';

// Create router for health checks
const router = new Hono<{ Bindings: Env }>();

// Health check endpoint
router.get('/', async (c) => {
  let databaseStatus = 'unknown';
  const sql = createDbConnection(c.env);
  
  try {
    // Check database connection
    await sql`SELECT 1`;
    databaseStatus = 'healthy';
  } catch (error) {
    console.error('Database health check failed:', error);
    databaseStatus = 'unhealthy';
    
    return c.json({ 
      status: 'unhealthy',
      database: databaseStatus,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  } finally {
    c.executionCtx.waitUntil(sql.end());
  }
  
  return c.json({ 
    status: 'healthy',
    database: databaseStatus,
    timestamp: new Date().toISOString()
  });
});

export default router;