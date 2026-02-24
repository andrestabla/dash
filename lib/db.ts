import { Pool } from 'pg';

declare global {
    var pool: Pool | undefined;
}

let pool: Pool;

if (!global.pool) {
    global.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
        // Stability: tuned for 50 concurrent users via Neon pooler
        max: 10,                        // Max logical connections (Neon pooler handles the rest)
        min: 2,                         // Keep 2 warm connections
        idleTimeoutMillis: 30000,       // Release idle connections after 30s
        connectionTimeoutMillis: 10000,  // Fail fast if can't connect in 10s
        maxUses: 7500,                  // Recycle connections after 7,500 queries
        statement_timeout: 30000,       // Kill queries running > 30s
    });
}
pool = global.pool;

export default pool;
