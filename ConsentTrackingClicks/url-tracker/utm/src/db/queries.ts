import { query } from './pool';

// URL operations
export async function createShortUrl(env: any, originalUrl: string) {
  const shortId = generateShortId();
  const result = await query(
    env,
    'INSERT INTO urls (short_id, original_url) VALUES ($1, $2) RETURNING *',
    [shortId, originalUrl]
  );
  return result.rows[0];
}

export async function getUrlByShortId(env: any, shortId: string) {
  const result = await query(
    env,
    'SELECT * FROM urls WHERE short_id = $1',
    [shortId]
  );
  return result.rows[0] || null;
}

export async function incrementUrlClicks(env: any, urlId: number) {
  await query(
    env,
    'UPDATE urls SET total_clicks = total_clicks + 1 WHERE id = $1',
    [urlId]
  );
}

// Click tracking operations
export async function recordClick(
  env: any,
  urlId: number,
  trackingId: string,
  userAgent: string,
  ipHash: string
) {
  const result = await query(
    env,
    'INSERT INTO clicks (url_id, tracking_id, user_agent, ip_hash) VALUES ($1, $2, $3, $4) RETURNING id',
    [urlId, trackingId, userAgent, ipHash]
  );
  return result.rows[0].id;
}

export async function updateClickConsent(env: any, trackingId: string, consent: boolean) {
  await query(
    env,
    'UPDATE clicks SET consent_given = $1 WHERE tracking_id = $2',
    [consent, trackingId]
  );
}

// Conversion operations
export async function recordConversion(
  env: any,
  trackingId: string,
  conversionType: string,
  metadata: any = {}
) {
  // First check if this tracking ID already has a conversion
  const existingCheck = await query(
    env,
    'SELECT id FROM conversions WHERE tracking_id = $1',
    [trackingId]
  );

  // Only record if this is a new conversion
  if (existingCheck.rows.length === 0) {
    // Get the click ID
    const clickResult = await query(
      env,
      'SELECT id FROM clicks WHERE tracking_id = $1',
      [trackingId]
    );

    if (clickResult.rows.length > 0) {
      const clickId = clickResult.rows[0].id;

      // Record the conversion
      await query(
        env,
        'INSERT INTO conversions (click_id, tracking_id, conversion_type, metadata) VALUES ($1, $2, $3, $4)',
        [clickId, trackingId, conversionType, JSON.stringify(metadata)]
      );

      // Update the click record
      await query(
        env,
        'UPDATE clicks SET converted = true WHERE id = $1',
        [clickId]
      );

      // Increment conversion count on the URL
      await query(
        env,
        'UPDATE urls SET conversion_count = conversion_count + 1 WHERE id = (SELECT url_id FROM clicks WHERE id = $1)',
        [clickId]
      );

      return true;
    }
  }

  return false;
}

// Helper functions
function generateShortId() {
  // Import nanoid at the top of your file
  const { nanoid } = require('nanoid');
  return nanoid(9); // 9-character ID
}

// Function to hash IP address for privacy
export function hashIp(ip: string) {
  // In a real implementation, use a proper hashing function
  // This is a simplified example
  return Buffer.from(ip).toString('base64');
}
