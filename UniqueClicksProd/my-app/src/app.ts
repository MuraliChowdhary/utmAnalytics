// Main application setup
import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Import routes
import shortenRoutes from './routes/shorten';
import  redirectHandler from './routes/redirect';
import analyticsRoutes from './routes/analytics';
import healthRoutes from './routes/health';

// Define environment interface
export interface Env {
  DATABASE_URL: string;
}

// Create and configure the application
export const app = new Hono<{ Bindings: Env }>();

// Apply CORS middleware to all routes
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
}));

// Register routes
app.route('/shorten', shortenRoutes);
app.route('/store-visitor-id', redirectHandler); // Mapping for store-visitor-id endpoint
app.route('/stats', analyticsRoutes);
app.route('/health', healthRoutes);

// Root handler
app.get('/', (c) => {
  return c.json({
    message: "Welcome to the URL shortener API",
    version: "1.0.0",
    endpoints: {
      shorten: "/shorten",
      redirect: "/:shortId",
      stats: "/stats/:shortId",
      health: "/health"
    }
  });
});

// Redirect handler (needs to be last to avoid conflicts)
// Ensure redirectRoutes is a valid handler for this route
app.route('/', redirectHandler);