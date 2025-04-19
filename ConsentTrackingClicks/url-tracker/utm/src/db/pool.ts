import { Pool } from 'pg';

// Initialize connection pool - will be reused across requests
const createPool = (dbUrl: string) => {
  return new Pool({
    connectionString: dbUrl,
    max: 5, // Maximum number of connections
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    ssl: {
      rejectUnauthorized: false // Needed for some PostgreSQL providers
    }
  });
};

// Connection handler for Cloudflare Workers
export const getConnection = async (env: any) => {
  // Use global variable to maintain connection between invocations
  const pool = createPool(env.DATABASE_URL);

  try {
    // Test connection
    const client = await pool.connect();
    client.release();
    return pool;
  } catch (error) {
    console.error('Database connection error:', error);
    throw new Error('Failed to connect to database');
  }
};

// Helper to run database queries
export async function query(env: any, text: string, params: any[]) {
  const pool = await getConnection(env);
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
}
