import { Hono } from 'hono';
import { cors } from 'hono/cors';
import postgres from 'postgres';
import shortid from 'shortid';
import { v4 as uuidv4 } from 'uuid';
export const app = new Hono();
app.use('*', cors());
// Helper function to create database connection
const createDbConnection = (env) => {
    return postgres(env.DATABASE_URL, {
        max: 5,
        fetch_types: false,
    });
};
// Helper function to find URL by shortId
async function findUrlByShortId(sql, shortId) {
    const results = await sql `
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
        await sql `
      INSERT INTO "Url" (id, "shortId", "originalUrl", "totalClicks", "uniqueClicks", "createdAt", "updatedAt")
      VALUES (${id}, ${shortId}, ${originalUrl}, 0, 0, ${now}, ${now})
    `;
        c.executionCtx.waitUntil(sql.end());
        const url = `https://utmtracking.muralisudireddy0.workers.dev/${shortId}`;
        return c.json({
            success: true,
            url
        });
    }
    catch (error) {
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
    }
    catch (error) {
        console.error('Error retrieving URL:', error);
        return c.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
    finally {
        c.executionCtx.waitUntil(sql.end());
    }
});
app.post('/store-visitor-id', async (c) => {
    const { visitorId, shortId, city } = await c.req.json();
    const sql = createDbConnection(c.env);
    try {
        const results = await sql `
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
        const visitorExists = await sql `
      SELECT 1 FROM "Visitor"
      WHERE "urlId" = ${urlId} AND "visitorId" = ${visitorId}
    `;
        const isUniqueVisitor = visitorExists.length === 0;
        if (isUniqueVisitor) {
            uniqueClicks += 1;
            await sql `
        INSERT INTO "Visitor" ("id", "visitorId", "city", "urlId")
        VALUES (${uuidv4()}, ${visitorId}, ${city}, ${urlId})
      `;
        }
        await sql `
      UPDATE "Url"
      SET "totalClicks" = ${totalClicks},
          "uniqueClicks" = ${uniqueClicks}
      WHERE id = ${urlId}
    `;
        return c.json({ originalUrl: urlRecord.originalUrl });
    }
    catch (error) {
        console.error('Error storing visitor:', error);
        return c.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
    finally {
        c.executionCtx.waitUntil(sql.end());
    }
});
app.post('/track-conversion', async (c) => {
    const { shortId, event, visitorId } = await c.req.json();
    const sql = createDbConnection(c.env);
    try {
        // 1. Get the URL record by shortId from "Url" table
        const urlResult = await sql `
      SELECT id, "uniqueClicks" FROM "Url" WHERE "shortId" = ${shortId}
    `;
        if (urlResult.length === 0) {
            return c.json({ success: false, error: 'Short URL not found' }, 404);
        }
        const urlId = urlResult[0].id;
        const currentUniqueClicks = urlResult[0].uniqueClicks;
        // 2. Check if conversion exists in "Conversion" table
        const conversionExists = await sql `
      SELECT 1 FROM "Conversion"
      WHERE "urlid" = ${urlId} AND "event" = ${event} AND "visitorid" = ${visitorId}
    `;
        // 3. If not exists, create conversion and update clicks
        if (conversionExists.length === 0) {
            await sql.begin(async (tx) => {
                // Insert into Conversion table (note quoted column names)
                await tx `
          INSERT INTO "Conversion" 
          ("id", "urlid", "event", "visitorid", "createdAt")
          VALUES 
          (gen_random_uuid(), ${urlId}, ${event}, ${visitorId}, NOW())
        `;
                // Update Url table's uniqueClicks
                await tx `
          UPDATE "Url"
          SET "uniqueClicks" = ${currentUniqueClicks + 1}
          WHERE "id" = ${urlId}
        `;
            });
        }
        return c.json({ success: true, message: 'Conversion recorded' });
    }
    catch (error) {
        console.error('Error tracking conversion:', error);
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
    finally {
        c.executionCtx.waitUntil(sql.end());
    }
});
app.get("/", (c) => {
    return c.json({
        message: "Welcome to the URL shortener API",
    });
});
export default app;
