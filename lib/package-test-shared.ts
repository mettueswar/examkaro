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

export function hasFullPremiumPlan(plan: string | undefined): boolean {
  return plan === "premium" || plan === "super";
}
