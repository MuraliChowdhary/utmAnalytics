import { Context } from 'hono';
import { recordConversion } from '../db/queries';

export async function conversionWebhookHandler(c: Context) {
  try {
    // Get conversion data from request body
    const { tracking_id, event_type, metadata } = await c.req.json();

    // Validate required fields
    if (!tracking_id || !event_type) {
      return c.json({ error: 'Missing required fields: tracking_id and event_type' }, 400);
    }

    // Record the conversion in database
    const result = await recordConversion(c.env, tracking_id, event_type, metadata || {});

    if (result) {
      return c.json({
        success: true,
        message: 'Conversion recorded successfully'
      });
    } else {
      return c.json({
        success: true,
        message: 'Conversion already recorded for this tracking ID'
      });
    }
  } catch (error) {
    console.error('Error recording conversion:', error);
    return c.json({ error: 'Failed to record conversion' }, 500);
  }
}
