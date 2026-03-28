import mysql from 'mysql2/promise';

declare global {
  // eslint-disable-next-line no-var
  var mysqlPool: mysql.Pool | undefined;
}

// ─── snake_case → camelCase transformer ──────────────────────────────────────
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function toCamel<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    const camelKey = snakeToCamel(key);
    const val = row[key];
    // Recursively convert nested objects (but not arrays of primitives, Dates, Buffers)
    if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date) && !Buffer.isBuffer(val)) {
      result[camelKey] = toCamel(val as Record<string, unknown>);
    } else if (typeof val === 'string') {
      // Try to parse JSON strings (for JSON columns like options, tags, features etc.)
      if ((val.startsWith('{') || val.startsWith('[')) && (camelKey === 'options' || camelKey === 'tags' || camelKey === 'features' || camelKey === 'testIds' || camelKey === 'categoryIds' || camelKey === 'answers' || camelKey === 'metadata')) {
        try { result[camelKey] = JSON.parse(val); } catch { result[camelKey] = val; }
      } else {
        result[camelKey] = val;
      }
    } else {
      result[camelKey] = val;
    }
  }
  return result as T;
}

function toCamelArray<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map(r => toCamel<T>(r));
}

const poolConfig: mysql.PoolOptions = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'examkaro',
  waitForConnections: true,
  connectionLimit: 20,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: '+05:30', // IST
};

const pool = global.mysqlPool ?? mysql.createPool(poolConfig);

if (process.env.NODE_ENV !== 'production') {
  global.mysqlPool = pool;
}

export const db = pool;

// ─── Helper Query Functions ───────────────────────────────────────────────────

export async function query<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(sql, params);
  return toCamelArray<T>(rows as Record<string, unknown>[]);
}

export async function queryOne<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(
  sql: string,
  params?: unknown[]
): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.execute<mysql.ResultSetHeader>(sql, params);
  return result;
}

export async function transaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export default pool;
