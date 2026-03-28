import { query } from '@/lib/db';

/** IDs a subscriber may open from one package row (order in `test_ids` matters when capped). */
export function accessibleTestIdsFromPackage(
  testIds: number[] | undefined,
  mockTestAccessLimit?: number | null,
): number[] {
  const ids = Array.isArray(testIds)
    ? testIds.map(Number).filter((n) => Number.isInteger(n) && n > 0)
    : [];
  const lim = mockTestAccessLimit;
  if (lim == null || lim <= 0) return ids;
  return ids.slice(0, lim);
}

export function accessibleMockTestCount(pkg: {
  testIds?: number[];
  mockTestAccessLimit?: number | null;
}): number {
  return accessibleTestIdsFromPackage(pkg.testIds, pkg.mockTestAccessLimit).length;
}

type PackageRow = {
  testIds: unknown;
  mockTestAccessLimit?: number | null;
};

function normalizeTestIds(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Union of all mock test IDs the user may access via active packages (not global premium). */
export async function getUserAccessiblePackageTestIds(userId: number): Promise<Set<number>> {
  const rows = await query<PackageRow>(
    `SELECT p.test_ids, p.mock_test_access_limit
     FROM user_packages up
     JOIN packages p ON p.id = up.package_id
     WHERE up.user_id = ? AND up.is_active = 1 AND up.valid_until > NOW()`,
    [userId],
  );
  const set = new Set<number>();
  for (const row of rows) {
    const ids = normalizeTestIds(row.testIds);
    for (const id of accessibleTestIdsFromPackage(ids, row.mockTestAccessLimit)) {
      set.add(id);
    }
  }
  return set;
}

export async function userCanAccessPremiumTestViaPackage(
  userId: number,
  testId: number,
): Promise<boolean> {
  const ids = await getUserAccessiblePackageTestIds(userId);
  return ids.has(testId);
}

export function hasFullPremiumPlan(plan: string | undefined): boolean {
  return plan === 'premium' || plan === 'super';
}
