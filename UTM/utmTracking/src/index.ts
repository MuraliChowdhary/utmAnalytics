import { Hono } from 'hono';
import { cors } from 'hono/cors';
import postgres from 'postgres';
import shortid from 'shortid';
import { v4 as uuidv4 } from 'uuid';

export interface Env {
  DATABASE_URL: string;
}

export const app = new Hono<{ Bindings: Env }>();
app.use('*', cors());

// Helper function to create database connection
const createDbConnection = (env: Env) => {
  return postgres(env.DATABASE_URL, {
    max: 5,
    fetch_types: false,
  });
};

// Helper function to find URL by shortId
async function findUrlByShortId(sql: ReturnType<typeof postgres>, shortId: string) {
  const results = await sql`
    SELECT * FROM "Url" 
    WHERE "shortId" = ${shortId}
    LIMIT 1
  `;
  return results.length > 0 ? results[0] : null;
}

app.post('/shorten', async (c) => {
  const sql = createDbConnection(c.env);
  
  try {
    const { originalUrl } = await c.req.json();
    const shortId = shortid.generate();
    const now = new Date().toISOString();
    const id = crypto.randomUUID(); // Using crypto.randomUUID() instead of uuidv4()
    
    await sql`
      INSERT INTO "Url" (id, "shortId", "originalUrl", "totalClicks", "uniqueClicks", "createdAt", "updatedAt")
      VALUES (${id}, ${shortId}, ${originalUrl}, 0, 0, ${now}, ${now})
    `;
    
    c.executionCtx.waitUntil(sql.end());
    
    const url = `https://utmtracking.muralisudireddy0.workers.dev/${shortId}`;

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

app.get('/:shortId', async (c) => {
  const shortId = c.req.param('shortId');
  const sql = createDbConnection(c.env);

  try {
    const urlRecord = await findUrlByShortId(sql, shortId);

    if (urlRecord) {
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

app.post('/store-visitor-id', async (c) => {
  const { visitorId, shortId, city } = await c.req.json();
  const sql = createDbConnection(c.env);

  try {
    const results = await sql`
      SELECT id, "originalUrl", "totalClicks", "uniqueClicks"
      FROM "Url"
      WHERE "shortId" = ${shortId}
    `;

    if (results.length === 0) {
      return c.json({ error: 'URL not found' }, 404);
    }

    const urlRecord = results[0];
    const urlId = urlRecord.id;
    let totalClicks = urlRecord.totalClicks + 1;
    let uniqueClicks = urlRecord.uniqueClicks;

    const visitorExists = await sql`
      SELECT 1 FROM "Visitor"
      WHERE "urlId" = ${urlId} AND "visitorId" = ${visitorId}
    `;

    const isUniqueVisitor = visitorExists.length === 0;

    if (isUniqueVisitor) {
      uniqueClicks += 1;
      await sql`
        INSERT INTO "Visitor" ("id", "visitorId", "city", "urlId")
        VALUES (${uuidv4()}, ${visitorId}, ${city}, ${urlId})
      `;
    }

    await sql`
      UPDATE "Url"
      SET "totalClicks" = ${totalClicks},
          "uniqueClicks" = ${uniqueClicks}
      WHERE id = ${urlId}
    `;

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





app.get("/", (c) => {
  return c.json({
    message: "Welcome to the URL shortener API",
  });
});

export default app;