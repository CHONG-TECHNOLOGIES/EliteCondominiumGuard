export type AuditChangeMap = Record<string, { from: any; to: any }>;

export const buildAuditChanges = (
  before: Record<string, any> | null | undefined,
  updates: Record<string, any> | null | undefined,
  options?: { exclude?: string[] }
): AuditChangeMap => {
  const changes: AuditChangeMap = {};
  if (!updates) return changes;

  const excludeSet = new Set(options?.exclude ?? []);

  Object.keys(updates).forEach((key) => {
    if (excludeSet.has(key)) return;
    const fromValue = before ? (before as any)[key] : undefined;
    const toValue = (updates as any)[key];
    const fromNormalized = fromValue ?? null;
    const toNormalized = toValue ?? null;

    if (JSON.stringify(fromNormalized) === JSON.stringify(toNormalized)) return;
    changes[key] = { from: fromNormalized, to: toNormalized };
  });

  return changes;
};

export const hasAuditChanges = (changes: AuditChangeMap): boolean =>
  Object.keys(changes).length > 0;
