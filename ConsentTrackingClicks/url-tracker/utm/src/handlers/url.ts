import { Context } from 'hono';
import { createShortUrl } from '../db/queries';
import type { Env } from "../index";

export async function shortenUrlHandler(c: Context<Env>) {
  try {
    // Get the original URL from request body
    const { originalUrl } = await c.req.json();

    // Validate the URL
    if (!originalUrl || !isValidUrl(originalUrl)) {
      return c.json({ error: 'Invalid URL provided' }, 400);
    }

    // Create short URL in the database
    const result = await createShortUrl(c.env, originalUrl);

    // Construct the full shortened URL
    const host = c.req.header('host') ?? '';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const shortUrl = `${protocol}://${host}/${result.short_id}`;

    return c.json({
      originalUrl: result.original_url,
      shortId: result.short_id,
      url: shortUrl
    }, 201);
  } catch (error) {
    console.error('Error shortening URL:', error);
    return c.json({ error: 'Failed to shorten URL' }, 500);
  }
}

// Validate URL format
function isValidUrl(string: string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}
