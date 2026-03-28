import mysql from "mysql2/promise";

let pool;

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 4000),

    // ✅ REQUIRED for TiDB Cloud
    ssl: { rejectUnauthorized: false },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
  });
}

// ✅ KEEP SAME EXPORT NAME
export const db = {
  query: async (...args) => {
    if (!pool) {
      pool = createPool();
    }
    return pool.query(...args);
  },
};
