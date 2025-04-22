// Entry point for Cloudflare Worker
import { app } from './app';

// Expose the application
export default app;

// Export the environment interface for TypeScript support
export type { Env } from './app';