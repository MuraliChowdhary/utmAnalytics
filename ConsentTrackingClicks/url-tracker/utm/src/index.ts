import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { shortenUrlHandler } from './handlers/url';
import { redirectHandler, consentHandler } from './handlers/redirect';
import { conversionWebhookHandler } from './handlers/conversion';

// Create Hono app
export type Env = {
	Bindings: {
	  DATABASE_URL: string; // not `String`, use lowercase `string`
	};
  };
  const app = new Hono<Env>();

// Middleware
app.use('*', logger());
app.use('/api/*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
}));

// Public routes
app.get('/', (c) => c.text('URL Shortener API'));

// URL shortening endpoint
app.post('/api/shorten', shortenUrlHandler);

// Consent handling
app.post('/api/consent', consentHandler);

// Conversion webhook
app.post('/api/convert', conversionWebhookHandler);

// URL redirection with consent page
app.get('/:shortId', redirectHandler);

// Handle 404
app.notFound((c) => {
  return c.text('Not found', 404);
});

// Error handling
app.onError((err, c) => {
  console.error('Application error:', err);
  return c.text('Internal Server Error', 500);
});

export default app;
