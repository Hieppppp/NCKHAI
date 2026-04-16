import { PrismaService } from './prisma.service.js';

/**
 * Helper gọi PostgreSQL function trả JSON.
 * Nếu function chưa tạo sẽ trả null (fallback về logic JS).
 */
export async function callDbFunction<T = any>(
  prisma: PrismaService,
  functionName: string,
  ...args: (string | number | null)[]
): Promise<T | null> {
  try {
    const argList = args.map((a, i) => `$${i + 1}`).join(', ');
    const sql = `SELECT ${functionName}(${argList}) AS data`;
    const rows: any[] = await (prisma as any).$queryRawUnsafe(sql, ...args);
    return rows?.[0]?.data ?? null;
  } catch {
    return null; // Function chưa tồn tại → fallback
  }
}

/**
 * Helper gọi PostgreSQL function trả TABLE.
 */
export async function callDbTableFunction<T = any>(
  prisma: PrismaService,
  functionName: string,
  ...args: (string | number | null)[]
): Promise<T[] | null> {
  try {
    const argList = args.map((a, i) => `$${i + 1}`).join(', ');
    const sql = `SELECT * FROM ${functionName}(${argList})`;
    const rows: any[] = await (prisma as any).$queryRawUnsafe(sql, ...args);
    return rows ?? null;
  } catch {
    return null;
  }
}
