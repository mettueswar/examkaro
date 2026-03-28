import { NextRequest } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { verifyRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/jwt';
import { packageSchema } from '@/lib/validations';
import { successResponse, errorResponse, generateSlug } from '@/lib/security';
import type { Package } from '@/types';

export async function GET(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== 'admin' && auth.role !== 'moderator') return forbiddenResponse();
  const pkgs = await query<Package>('SELECT * FROM packages ORDER BY price ASC');
  return successResponse(pkgs);
}

export async function POST(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== 'admin') return forbiddenResponse();

  try {
    const body = await req.json();
    const data = packageSchema.parse(body);
    const slug = data.slug || generateSlug(data.name);

    const result = await execute(
      `INSERT INTO packages (name, slug, description, price, discounted_price, validity_days, test_ids, category_ids, features, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name, slug, data.description || null, data.price,
        data.discountedPrice || null, data.validityDays,
        JSON.stringify(data.testIds), JSON.stringify(data.categoryIds || []),
        JSON.stringify(data.features), data.isActive,
      ]
    );
    return successResponse(await queryOne<Package>('SELECT * FROM packages WHERE id = ?', [result.insertId]), 'Created', 201);
  } catch (err) { return errorResponse('Failed to create package'); }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== 'admin') return forbiddenResponse();

  try {
    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) return errorResponse('ID required');
    const data = packageSchema.partial().parse(rest);
    await execute(
      `UPDATE packages SET name=COALESCE(?,name), description=COALESCE(?,description),
       price=COALESCE(?,price), discounted_price=COALESCE(?,discounted_price),
       validity_days=COALESCE(?,validity_days), features=COALESCE(?,features), is_active=COALESCE(?,is_active)
       WHERE id=?`,
      [data.name, data.description, data.price, data.discountedPrice, data.validityDays,
       data.features ? JSON.stringify(data.features) : null, data.isActive, id]
    );
    return successResponse(await queryOne<Package>('SELECT * FROM packages WHERE id = ?', [id]));
  } catch (err) { return errorResponse('Failed to update'); }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();
  if (auth.role !== 'admin') return forbiddenResponse();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return errorResponse('ID required');
  await execute('UPDATE packages SET is_active = 0 WHERE id = ?', [id]);
  return successResponse({ deleted: true });
}
