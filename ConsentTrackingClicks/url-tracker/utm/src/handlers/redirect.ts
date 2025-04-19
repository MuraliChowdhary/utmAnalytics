import { Context } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import { getUrlByShortId, incrementUrlClicks, recordClick, hashIp, updateClickConsent } from '../db/queries';
import { renderConsentPage } from '../templates/consent';

// Handle initial redirection and show consent page
export async function redirectHandler(c: Context) {
  try {
    const shortId = c.req.param('shortId');
	console.log(shortId)

    // Look up the URL in the database
    const url = await getUrlByShortId(c.env, shortId);

    if (!url) {
      return c.text('URL not found', 404);
    }

    // Increment click count
    await incrementUrlClicks(c.env, url.id);

    // Generate a unique tracking ID for this session
    const trackingId = uuidv4();

    // Get user information for tracking (privacy-conscious approach)
    const userAgent = c.req.header('user-agent') || 'Unknown';
    const ip = c.req.header('cf-connecting-ip') ||
               c.req.header('x-forwarded-for') ||
               'Unknown';
    const ipHash = hashIp(ip);

    // Record the click in database
    await recordClick(c.env, url.id, trackingId, userAgent, ipHash);

    // Render the consent page
    const redirectDelay = parseInt(c.env.REDIRECT_DELAY || '5', 10);
    const consentPage = renderConsentPage(
      c.env.SITE_NAME || 'URL Tracker',
      url.original_url,
      trackingId,
      new URL(url.original_url).hostname,
      redirectDelay
    );

    // Return the consent page HTML
    return c.html(consentPage);
  } catch (error) {
    console.error('Error handling redirect:', error);
    return c.text('Error processing your request', 500);
  }
}

// Handle consent API endpoint
export async function consentHandler(c: Context) {
  try {
    const { tracking_id, consent } = await c.req.json();

    // Update the click record with user's consent choice
    await updateClickConsent(c.env, tracking_id, !!consent);

    return c.json({ success: true });
  } catch (error) {
    console.error('Error processing consent:', error);
    return c.json({ error: 'Failed to process consent' }, 500);
  }
}
